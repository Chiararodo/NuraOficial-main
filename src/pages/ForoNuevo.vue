<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const auth = useAuthStore()

// Estado del formulario
const title = ref('')
const body = ref('')
const categories = ['Alimentación', 'Ansiedad', 'Autoestima'] as const
const activeCat = ref<(typeof categories)[number] | null>('Ansiedad')

const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

// Validación simple
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
    const { data, error } = await supabase
      .from('forums')
      .insert({
        title: title.value.trim(),
        body: body.value.trim(),
        category: activeCat.value,
        user_id: auth.user?.id ?? null,
      })
      .select('id')
      .single()

    if (error) throw error

    successMsg.value = 'Tu foro se publicó correctamente.'
    // Volvemos a la lista de foros
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
  <main class="foro-new">
    <!-- Header tipo app -->
    <header class="head">
      <button class="back-btn" type="button" @click="goBack">←</button>
      <h2>Foro</h2>
    </header>

    <section class="content">
      <!-- Título -->
      <label class="field">
        <span class="label">Título</span>
        <input
          v-model="title"
          type="text"
          placeholder="Tips para manejar la ansiedad"
        />
      </label>

      <!-- Descripción -->
      <label class="field">
        <span class="label">Descripción</span>
        <textarea
          v-model="body"
          rows="4"
          placeholder="Estos días me costó mantener la calma antes de comer. ¿Qué estrategias les sirven a ustedes para bajar la ansiedad?"
        ></textarea>
      </label>

      <!-- Categoría -->
      <div class="field">
        <span class="label">Categoría</span>
        <div class="pills">
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

      <!-- Adjuntar imagen (solo UI por ahora) -->
      <div class="field">
        <span class="label">Adjuntar imagen (opcional)</span>
        <button type="button" class="attach-btn" disabled>
          📎 Adjuntar imagen
        </button>
        <p class="hint">
          (Funcionalidad opcional. Por ahora es solo ilustrativa para el diseño.)
        </p>
      </div>

      <!-- Nota Nura -->
      <div class="note">
        Nura es un espacio de apoyo.<br />
        Compartí con respeto.
      </div>

      <!-- Mensajes -->
      <p v-if="errorMsg" class="msg error">{{ errorMsg }}</p>
      <p v-if="successMsg" class="msg success">{{ successMsg }}</p>

      <!-- CTA -->
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
.foro-new{
  background:#fff;
  max-width:900px;
  margin:0 auto;
  padding:0 18px 32px;
}

/* Header */
.head{
  display:flex;
  align-items:center;
  gap:8px;
  padding:16px 0 10px;
}
.head h2{
  margin:0;
  font-size:1.3rem;
  color:#111;
}
.back-btn{
  border:none;
  background:#50bdbd;
  color:#fff;
  width:32px;
  height:32px;
  border-radius:999px;
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
}

/* Contenido */
.content{
  display:grid;
  gap:16px;
}

/* Campos */
.field{
  display:grid;
  gap:6px;
}
.label{
  font-size:.9rem;
  font-weight:500;
}
input,
textarea{
  border-radius:12px;
  border:1px solid #e3edf2;
  background:#f6fbff;
  padding:10px 12px;
  font-size:.95rem;
  outline:none;
  resize:vertical;
}

/* Pills */
.pills{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}
.pill{
  padding:8px 14px;
  border-radius:999px;
  border:1px solid #cfe7f3;
  background:#eaf6ff;
  cursor:pointer;
  transition:all .15s ease;
}
.pill.active{
  background:#50bdbd;
  color:#fff;
  border-color:transparent;
  box-shadow:0 0 0 2px rgba(80,189,189,.15) inset;
}

/* Adjuntar imagen */
.attach-btn{
  padding:8px 14px;
  border-radius:999px;
  border:none;
  background:#eaf6ff;
  color:#4d5a6a;
  cursor:not-allowed;
}
.hint{
  margin:4px 0 0;
  font-size:.8rem;
  opacity:.7;
}

/* Nota */
.note{
  margin-top:4px;
  padding:10px 14px;
  border-radius:12px;
  background:#eaf6ff;
  text-align:center;
  font-size:.9rem;
}

/* Mensajes */
.msg{
  font-size:.85rem;
}
.msg.error{
  color:#b3261e;
}
.msg.success{
  color:#087f23;
}

/* Botón publicar */
.btn-primary{
  margin-top:4px;
  width:100%;
  padding:12px 20px;
  border-radius:999px;
  border:none;
  background:#85b6e0;
  color:#fff;
  font-weight:600;
  cursor:pointer;
  transition:background .15s ease, box-shadow .2s ease, transform .1s ease;
}
.btn-primary:disabled{
  opacity:.5;
  cursor:not-allowed;
  box-shadow:none;
  transform:none;
}
.btn-primary:not(:disabled):hover{
  background:#50bdbd;
  box-shadow:0 10px 26px rgba(0,0,0,.12);
  transform:translateY(-1px);
}
</style>
