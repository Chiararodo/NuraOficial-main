<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const auth = useAuthStore()

const title = ref('')
const body = ref('')
const categories = ['Alimentación', 'Ansiedad', 'Autoestima'] as const
const activeCat = ref<(typeof categories)[number] | null>('Ansiedad')

const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const canSubmit = computed(() => {
  return (
    !loading.value &&
    title.value.trim().length > 3 &&
    body.value.trim().length > 5 &&
    !!activeCat.value
  )
})

async function submit() {
  errorMsg.value = ''
  successMsg.value = ''

  if (!canSubmit.value) return

  loading.value = true
  try {
    const { error } = await supabase
      .from('forums')
      .insert({
        title: title.value.trim(),
        body: body.value.trim(),
        category: activeCat.value,
        user_id: auth.user?.id ?? null
      })
      .select('id')
      .single()

    if (error) throw error

    successMsg.value = 'Tu foro se publicó correctamente.'
    router.push({ name: 'foro' })
  } catch (err: any) {
    console.error(err)
    errorMsg.value = 'No se pudo publicar el foro. Intentá de nuevo.'
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.back()
}
</script>

<template>
  <h1 class="visually-hidden">Crear nuevo foro en Nura</h1>
  <main class="foro-new">
    <header class="head">
      <button class="back-link" type="button" @click="goBack">
        <span class="arrow">←</span>
      </button>
      <h2>Nuevo foro</h2>
    </header>

    <section class="content">
      <div class="field">
        <label class="label" for="forum-title">Título</label>
        <input
          id="forum-title"
          v-model="title"
          type="text"
          placeholder="Tips para manejar la ansiedad"
        />
      </div>

      <div class="field">
        <label class="label" for="forum-body">Descripción</label>
        <textarea
          id="forum-body"
          v-model="body"
          rows="4"
          placeholder="Estos días me costó mantener la calma antes de comer. ¿Qué estrategias les sirven a ustedes para bajar la ansiedad?"
        ></textarea>
      </div>

      <div class="field">
        <span class="label">Categoría</span>
        <div class="pills" aria-label="Elegir categoría del foro">
          <button
            v-for="c in categories"
            :key="c"
            type="button"
            class="pill"
            :class="{ active: activeCat === c }"
            @click="activeCat = c"
          >
            {{ c }}
          </button>
        </div>
      </div>

      <div class="note">
        Nura es un espacio de apoyo. Cuidemos el tono y la forma de hablarle a
        las demás personas.
      </div>

      <p v-if="errorMsg" class="msg error">{{ errorMsg }}</p>
      <p v-if="successMsg" class="msg success">{{ successMsg }}</p>

      <button
        class="btn-primary"
        type="button"
        :disabled="!canSubmit"
        @click="submit"
      >
        {{ loading ? 'Publicando…' : 'Publicar' }}
      </button>
    </section>
  </main>
</template>

<style scoped>
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.foro-new {
  background: #fff;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 18px 32px;
}

/* Header */
.head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 0 10px;
}
.head h2 {
  margin: 0;
  font-size: 1.3rem;
  color: #111827;
}
.back-link {
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 0;
}
.arrow {
  font-size: 1.5rem;
  color: #46bdbd;
}

/* Contenido */
.content {
  display: grid;
  gap: 16px;
}

/* Campos */
.field {
  display: grid;
  gap: 6px;
}
.label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #374151;
}
input,
textarea {
  border-radius: 12px;
  border: 1px solid #e3edf2;
  background: #f6fbff;
  padding: 10px 12px;
  font-size: 0.95rem;
  outline: none;
  resize: vertical;
}
input:focus,
textarea:focus {
  border-color: #50bdbd;
  background: #ffffff;
  box-shadow: 0 0 0 2px rgba(80, 189, 189, 0.18);
}

/* Pills */
.pills {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.pill {
  padding: 8px 14px;
  border-radius: 999px;
  border: 2px solid #bbe4f8;
  background: #eaf6ff;
  color: #50bdbd;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.9rem;
}

.pill:hover {
  background: #caf0f0;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
}

.pill.active {
  background: #50bdbd;
  color: #fff;
  border-color: transparent;
  box-shadow: 0 0 0 2px rgba(80, 189, 189, 0.15) inset;
}

/* Nota */
.note {
  margin-top: 4px;
  padding: 10px 14px;
  border-radius: 12px;
  background: #eaf6ff;
  text-align: center;
  font-size: 0.9rem;
  color: #475569;
}

/* Mensajes */
.msg {
  font-size: 0.85rem;
}
.msg.error {
  color: #b3261e;
}
.msg.success {
  color: #087f23;
}

/* Botón publicar */
.btn-primary {
  margin-top: 4px;
  width: 100%;
  padding: 12px 20px;
  border-radius: 999px;
  border: none;
  background: #50bdbd;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.2s ease, transform 0.1s ease;
  box-shadow: 0 10px 26px rgba(80, 189, 189, 0.45);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}
.btn-primary:not(:disabled):hover {
  background: #3ea9a9;
  box-shadow: 0 12px 30px rgba(80, 189, 189, 0.55);
  transform: translateY(-1px);
}
</style>
