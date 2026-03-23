<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'
import { usePremium } from '@/composables/usePremium'

const router = useRouter()
const auth = useAuthStore()
const { isPremium, refresh: refreshPremium } = usePremium()

const categories = ['Alimentación', 'Ansiedad', 'Autoestima'] as const

const title = ref('')
const body = ref('')
const category = ref<(typeof categories)[number] | ''>('')

const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const showPremiumModal = ref(false)

function clearMessages() {
  errorMsg.value = ''
  successMsg.value = ''
}

function goBack() {
  router.back()
}

function goPremium() {
  router.push('/app/premium')
}

function countRealWords(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

const titleLength = computed(() => title.value.trim().length)
const bodyWords = computed(() => countRealWords(body.value))

const canSubmit = computed(() => {
  if (!auth.user) return false
  if (loading.value) return false
  if (!isPremium.value) return false
  return (
    title.value.trim().length >= 5 &&
    bodyWords.value >= 5 &&
    !!category.value
  )
})

function validateForm() {
  clearMessages()

  if (!auth.user) {
    errorMsg.value = 'Tenés que iniciar sesión para crear un foro.'
    return false
  }

  if (!isPremium.value) {
    showPremiumModal.value = true
    return false
  }

  if (!category.value) {
    errorMsg.value = 'Seleccioná una categoría.'
    return false
  }

  if (!title.value.trim()) {
    errorMsg.value = 'Escribí un título para tu foro.'
    return false
  }

  if (title.value.trim().length < 5) {
    errorMsg.value = 'El título debe tener al menos 5 caracteres.'
    return false
  }

  if (!body.value.trim()) {
    errorMsg.value = 'Escribí el contenido de tu foro.'
    return false
  }

  if (countRealWords(body.value) < 5) {
    errorMsg.value = 'El contenido debe tener al menos 5 palabras.'
    return false
  }

  return true
}

async function submitForum() {
  if (!validateForm()) return

  loading.value = true
  clearMessages()

  try {
    const { data: me, error: meError } = await supabase
      .from('profiles')
      .select('blocked, deleted_at')
      .eq('id', auth.user!.id)
      .single()

    if (meError) {
      console.error(meError)
      errorMsg.value = 'No pudimos validar tu cuenta.'
      return
    }

    if (me?.blocked || me?.deleted_at) {
      errorMsg.value = 'Tu cuenta no puede publicar contenido.'
      return
    }

    const payload = {
      user_id: auth.user!.id,
      title: title.value.trim(),
      body: body.value.trim(),
      category: category.value
    }

    const { data, error } = await supabase
      .from('forums')
      .insert(payload)
      .select('id')
      .single()

    if (error) throw error

    successMsg.value = 'Tu foro fue publicado correctamente.'

    title.value = ''
    body.value = ''
    category.value = ''

    setTimeout(() => {
      if (data?.id) {
        router.push({ name: 'foro-view', params: { id: data.id } })
      } else {
        router.push({ name: 'foro' })
      }
    }, 700)
  } catch (e: any) {
    console.error(e)
    errorMsg.value = e?.message || 'No se pudo publicar el foro. Probá nuevamente.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await refreshPremium()
})
</script>

<template>
  <main class="page">
    <header class="page-head">
      <button class="back-link" type="button" @click="goBack" aria-label="Volver">
        <span class="arrow">←</span>
      </button>

      <div class="page-copy">
        <h1 class="visually-hidden">Crear nuevo foro</h1>
        <h2 class="page-title">Nuevo foro</h2>
        <p class="page-sub">
          Compartí una duda, experiencia o reflexión para la comunidad.
        </p>
      </div>
    </header>

    <section v-if="!isPremium" class="premium-inline">
      <div class="premium-inline__left">
        <div class="premium-inline__top">
          <span class="premium-badge">Premium</span>
        </div>
        <h2 class="premium-inline__title">Crear foros es una función Premium</h2>
        <p class="premium-inline__desc">
          Con el plan Premium podés publicar nuevos temas en la comunidad.
        </p>
      </div>

      <button type="button" class="premium-inline__btn" @click="goPremium">
        Ver Premium
      </button>
    </section>

    <section class="form-card" aria-labelledby="forum-form-title">
      <h2 id="forum-form-title" class="section-title">Escribí tu publicación</h2>

      <div class="field">
        <label class="label" for="forum-category">Categoría</label>
        <select
          id="forum-category"
          v-model="category"
          class="input"
          @change="clearMessages"
        >
          <option value="" disabled>Seleccioná una categoría</option>
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>

      <div class="field">
        <label class="label" for="forum-title">Título</label>
        <input
          id="forum-title"
          v-model="title"
          type="text"
          class="input"
          placeholder="Ej: Cómo manejan la ansiedad antes de comer"
          maxlength="120"
          @input="clearMessages"
        />
        <p class="helper">
          Mínimo 5 caracteres. Llevás {{ titleLength }}/120.
        </p>
      </div>

      <div class="field">
        <label class="label" for="forum-body">Contenido</label>
        <textarea
          id="forum-body"
          v-model="body"
          class="textarea"
          rows="8"
          placeholder="Contá tu experiencia, tu duda o lo que te gustaría conversar con la comunidad."
          @input="clearMessages"
        />
        <p class="helper">
          Escribí al menos 5 palabras. Llevás {{ bodyWords }}.
        </p>
      </div>

      <p v-if="errorMsg" class="form-message error" role="alert">
        {{ errorMsg }}
      </p>

      <p v-if="successMsg" class="form-message success" role="status">
        {{ successMsg }}
      </p>

      <div class="form-actions">
        <button class="btn-soft" type="button" @click="goBack">
          Cancelar
        </button>

        <button
          class="btn-primary"
          type="button"
          :disabled="!canSubmit"
          @click="submitForum"
        >
          {{ loading ? 'Publicando…' : 'Publicar foro' }}
        </button>
      </div>
    </section>

    <div v-if="showPremiumModal" class="modal-backdrop" @click.self="showPremiumModal = false">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="premium-modal-title">
        <h2 id="premium-modal-title" class="modal-title">Requiere Premium</h2>
        <p class="modal-text">
          Para crear un foro nuevo necesitás el plan Premium.
        </p>

        <div class="modal-actions">
          <button class="modal-btn soft" type="button" @click="showPremiumModal = false">
            Entendido
          </button>
          <button class="modal-btn" type="button" @click="goPremium">
            Ver Premium
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.visually-hidden {
  position: absolute !important;
  height: 1px;
  width: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
}

.page {
  background: #fff;
  padding: 20px 18px 48px;
  max-width: 950px;
  margin: 0 auto;
}

.page-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.page-copy {
  display: grid;
  gap: 4px;
}

.page-title {
  margin: 0;
  color: #50bdbd;
  font-size: 1.5rem;
  font-weight: 800;
}

.page-sub {
  margin: 0;
  color: #6b7280;
  font-size: 0.95rem;
  line-height: 1.4;
}

.back-link {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 999px;
  background: #e8fbf8;
  color: #50bdbd;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease;
  flex: 0 0 auto;
}

@media (hover: hover) {
  .back-link:hover {
    background: #d8f6f1;
    transform: translateY(-1px);
    box-shadow: 0 8px 16px rgba(80, 189, 189, 0.14);
  }
}

.arrow {
  font-size: 1.35rem;
  line-height: 1;
}

.premium-inline {
  background: #f6fffe;
  border: 1px solid #b6ebe5;
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow: 0 10px 18px rgba(80, 189, 189, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 16px;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    background-color 0.22s ease,
    border-color 0.22s ease;
}

@media (hover: hover) {
  .premium-inline:hover {
    transform: translateY(-3px);
    box-shadow: 0 18px 34px rgba(80, 189, 189, 0.12);
  }
}

.premium-inline__left {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.premium-inline__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.premium-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(80, 189, 189, 0.15);
  color: #137b7b;
  font-weight: 800;
  font-size: 0.72rem;
}

.premium-inline__title {
  margin: 0;
  font-weight: 900;
  color: #0f172a;
  font-size: 0.9rem;
  line-height: 1.15;
}

.premium-inline__desc {
  margin: 0;
  color: #475569;
  font-size: 0.82rem;
  line-height: 1.25;
}

.premium-inline__btn {
  border: none;
  border-radius: 999px;
  padding: 9px 12px;
  min-height: 42px;
  font-weight: 900;
  font-size: 0.82rem;
  cursor: pointer;
  background: #50bdbd;
  color: #fff;
  white-space: nowrap;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease;
}

@media (hover: hover) {
  .premium-inline__btn:hover {
    background: #3daaaa;
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(80, 189, 189, 0.2);
  }
}

.form-card {
  background: #ffffff;
  border-radius: 18px;
  padding: 18px;
  border: 1px solid #e2edf7;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease,
    background-color 0.22s ease;
}

@media (hover: hover) {
  .form-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
    border-color: #d7f1ef;
  }
}

.section-title {
  margin: 0 0 14px;
  color: #50bdbd;
  font-size: 1.1rem;
  font-weight: 800;
}

.field {
  display: grid;
  gap: 6px;
  margin-bottom: 14px;
}

.label {
  font-size: 0.92rem;
  font-weight: 700;
  color: #111827;
}

.input,
.textarea {
  width: 100%;
  box-sizing: border-box;
  border-radius: 14px;
  border: 1px solid #dce5ec;
  padding: 12px;
  font-family: inherit;
  font-size: 0.95rem;
  background: #ffffff;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.input:focus,
.textarea:focus {
  border-color: #50bdbd;
  box-shadow: 0 0 0 3px rgba(80, 189, 189, 0.16);
}

.textarea {
  resize: vertical;
  min-height: 160px;
}

.helper {
  margin: 0;
  color: #6b7280;
  font-size: 0.84rem;
}

.form-message {
  width: 100%;
  margin: 0 0 14px;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 0.93rem;
  line-height: 1.35;
  box-sizing: border-box;
}

.form-message.error {
  background: #fff1f2;
  color: #b42318;
  border: 1px solid #fecdd3;
}

.form-message.success {
  background: #ecfdf3;
  color: #027a48;
  border: 1px solid #abefc6;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.btn-primary,
.btn-soft {
  min-height: 42px;
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.btn-primary {
  background: #50bdbd;
  color: white;
  border: none;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.22);
}

@media (hover: hover) {
  .btn-primary:hover:not(:disabled) {
    background: #3ea9a9;
    transform: translateY(-1px);
    box-shadow: 0 12px 22px rgba(80, 189, 189, 0.28);
  }
}

.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-soft {
  background: #ffffff;
  color: #50bdbd;
  border: 1px solid #b6ebe5;
  box-shadow: 0 4px 12px rgba(148, 163, 184, 0.16);
}

@media (hover: hover) {
  .btn-soft:hover {
    background: #e0faf7;
    transform: translateY(-1px);
  }
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 40;
  padding: 16px;
}

.modal-card {
  background: white;
  border-radius: 18px;
  padding: 18px 20px 16px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);
  border: 1px solid #e2edf7;
}

.modal-title {
  margin: 0 0 8px;
  color: #50bdbd;
  font-size: 1.1rem;
  font-weight: 800;
}

.modal-text {
  margin: 0 0 16px;
  font-size: 0.92rem;
  color: #475569;
  line-height: 1.45;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.modal-btn {
  border-radius: 999px;
  border: none;
  padding: 9px 14px;
  min-height: 42px;
  font-weight: 700;
  cursor: pointer;
  background: #50bdbd;
  color: #fff;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease;
}

@media (hover: hover) {
  .modal-btn:hover:not(:disabled) {
    background: #3ea9a9;
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(80, 189, 189, 0.2);
  }
}

.modal-btn.soft {
  background: #ffffff;
  color: #50bdbd;
  border: 1px solid #b6ebe5;
}

@media (hover: hover) {
  .modal-btn.soft:hover:not(:disabled) {
    background: #e0faf7;
  }
}

@media (max-width: 768px) {
  .page {
    padding: 16px 12px 96px;
  }

  .page-title {
    font-size: 1.35rem;
  }

  .premium-inline {
    flex-direction: column;
    align-items: stretch;
  }

  .premium-inline__btn {
    width: 100%;
  }

  .form-card {
    padding: 16px 14px;
  }
}

@media (max-width: 520px) {
  .form-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .form-actions .btn-primary,
  .form-actions .btn-soft,
  .modal-actions .modal-btn {
    width: 100%;
  }

  .modal-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>