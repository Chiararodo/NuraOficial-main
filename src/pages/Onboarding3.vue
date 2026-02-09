<template>
  <h1 class="visually-hidden">Onboarding · Enfoque inicial</h1>

  <main class="onboarding-page">
    <section class="card">
      <h2>Elegí por dónde comenzar</h2>
      <p class="subtitle">
        Contanos qué querés trabajar primero. Esto nos ayuda a recomendarte
        contenido y recursos más acordes a vos.
      </p>

      <div class="options">
        <label class="option">
          <div class="opt-left">
            <span class="pill-icon">💭</span>
            <span>Ansiedad</span>
          </div>
          <input
            type="checkbox"
            v-model="seleccion"
            value="ansiedad"
            class="opt-input"
          />
          <span class="check"></span>
        </label>

        <label class="option">
          <div class="opt-left">
            <span class="pill-icon">🍽️</span>
            <span>Relación con la comida</span>
          </div>
          <input
            type="checkbox"
            v-model="seleccion"
            value="comida"
            class="opt-input"
          />
          <span class="check"></span>
        </label>

        <label class="option">
          <div class="opt-left">
            <span class="pill-icon">🌿</span>
            <span>Hábitos saludables</span>
          </div>
          <input
            type="checkbox"
            v-model="seleccion"
            value="habitos"
            class="opt-input"
          />
          <span class="check"></span>
        </label>
      </div>

      <p class="helper">
        Podés cambiar estas preferencias más adelante desde tu perfil.
      </p>

      <button class="btn" @click="finalizarOnboarding" :disabled="saving">
        {{ saving ? 'Guardando…' : 'Continuar' }}
      </button>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/composables/useSupabase'

const router = useRouter()

const seleccion = ref<string[]>([])
const saving = ref(false)

async function finalizarOnboarding() {
  if (!seleccion.value.length) {
    // si no eligió nada, igual dejamos seguir pero con aviso suave
    const ok = confirm(
      'Todavía no elegiste ningún foco. ¿Querés continuar igual?'
    )
    if (!ok) return
  }

  try {
    saving.value = true

    const { data: sess } = await supabase.auth.getSession()
    const uid = sess.session?.user?.id
    if (!uid) {
      alert('Tu sesión expiró. Iniciá sesión nuevamente.')
      return
    }

    // Guardar en metadata de Auth
    const { error: updErr } = await supabase.auth.updateUser({
      data: {
        onboarding_done: true,
        onboarding_topics: seleccion.value
      }
    })
    if (updErr) throw updErr

    // Reflejar también en profiles (si querés usarlo desde ahí)
    await supabase.from('profiles').upsert(
      {
        id: uid,
        onboarding_done: true
      },
      { onConflict: 'id' }
    )

    await supabase.auth.refreshSession()

    // Después del onboarding, vamos a Términos y Privacidad
    router.replace({ name: 'terminos' })
  } catch (error) {
    console.error(error)
    alert(
      'No pudimos guardar tu configuración en este momento. Probá nuevamente en unos minutos.'
    )
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.onboarding-page {
  min-height: 100dvh;
  background: url('/bgs/splash.png') center/cover no-repeat;
  display: flex;
  justify-content: center;
  align-items: start;
  padding: 48px 16px 32px;
}

/* ===== Card central ===== */
.card {
  width: 100%;
  max-width: 540px;
  background: #ffffff;
  border-radius: 60px;
  padding: 28px 20px 34px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.2);
  text-align: center;
}

h2 {
  color: #50bdbd;
  font-weight: 800;
  letter-spacing: 0.3px;
  font-size: 1.9rem;
  margin: 8px 0 6px;
}
.subtitle {
  color: #2c2c2c;
  opacity: 0.9;
  margin-bottom: 18px;
  line-height: 1.5;
}

/* Opciones tipo “pastilla” redondeadas */
.options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 10px 0 18px;
}

.option {
  background: #50bdbd;
  font-size:1.1rem ;
  font-weight: 530;
  color: #fff;
  border-radius: 999px;
  padding: 10px 14px;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 10px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
}

.opt-left {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-align: left;
}

/* iconito circular */
.pill-icon {
  width: 36px;
  height: 36px;
  display: inline-grid;
  place-items: center;
  background: #ffffffff;
  border-radius: 50%;
  font-size: 18px;
}

/* checkbox custom */
.opt-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.check {
  width: 22px;
  height: 22px;
  border-radius: 8px;
  border: 2px solid #e5f0ff;
  background: #ffffff2a;
  box-shadow: inset 0 0 0 3px transparent;
  transition: 0.2s ease;
}

.option:has(.opt-input:checked) .check {
  background: #ffffff;
  box-shadow: inset 0 0 0 3px #50bdbd;
}

.check:hover{
  background: #9be2e2ff;
  box-shadow: inset 0 0 0 3px #50bdbd;
}

/* texto aclaratorio */
.helper {
  font-size: 0.82rem;
  color: #4b5563;
  margin-bottom: 14px;
}

/* Botón verde Nura */
.btn {
  background: #50bdbd;
  color: #fff;
  font-weight: 700;
  border: 0;
  border-radius: 999px;
  padding: 0.8rem 1.4rem;
  width: 74%;
  margin: 0 auto;
  display: block;
  box-shadow: 0 10px 24px rgba(80, 189, 189, 0.4);
  transition: 0.22s ease;
  font-size: 0.98rem;
}

.btn:hover:not(:disabled) {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 14px 30px rgba(80, 189, 189, 0.5);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Visually hidden */
.visually-hidden {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
</style>
