<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationSettings } from '@/composables/useNotificationSettings'

const router = useRouter()
const gate = useNotificationSettings()

const saving = ref(false)
const errorMsg = ref<string>('')

/** ON/OFF general (local, NO va a Supabase) */
const enabled = ref(true)

/* Toggles reales */
const bienestar = computed({
  get: () => gate.settings.value.bienestar,
  set: (v: boolean) => (gate.settings.value.bienestar = v)
})

const profesional = computed({
  get: () => gate.settings.value.profesional,
  set: (v: boolean) => (gate.settings.value.profesional = v)
})

const appUpdates = computed({
  get: () => gate.settings.value.app_updates,
  set: (v: boolean) => (gate.settings.value.app_updates = v)
})

function applyDisabledDefaults() {
  bienestar.value = false
  profesional.value = false
  appUpdates.value = false
}

function deriveEnabledFromToggles() {
  enabled.value = !!(bienestar.value || profesional.value || appUpdates.value)
}

async function safeUpsert() {
  try {
    saving.value = true
    await gate.upsertToSupabase()
  } catch {
    errorMsg.value = 'No pudimos guardar tus preferencias. Probá nuevamente.'
  } finally {
    saving.value = false
  }
}

/** Switch general */
async function onToggleEnabled(next: boolean) {
  errorMsg.value = ''
  enabled.value = next

  if (!enabled.value) {
    applyDisabledDefaults()
    await safeUpsert()
    return
  }

  // pedir permiso 
  if ('Notification' in window) {
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        enabled.value = false
        applyDisabledDefaults()
        errorMsg.value = 'Para activar notificaciones, necesitás permitirlas en tu navegador.'
        await safeUpsert()
        return
      }
    } catch {
      enabled.value = false
      applyDisabledDefaults()
      errorMsg.value = 'No pudimos solicitar permisos de notificación.'
      await safeUpsert()
      return
    }
  }

  // defaults al activar
  bienestar.value = true
  profesional.value = true
  appUpdates.value = false

  await safeUpsert()
}

onMounted(async () => {
  gate.loadFromLocal()

  try {
    await gate.loadFromSupabase()
  } catch {
    // seguimos con local/default
  }

  deriveEnabledFromToggles()
  if (!enabled.value) applyDisabledDefaults()
})

/** Auto-guardar cuando cambian toggles si enabled está ON */
watch(
  () => [bienestar.value, profesional.value, appUpdates.value],
  async () => {
    if (!enabled.value) return
    await safeUpsert()
  }
)

/** Flujo: siempre ir a Términos */
function goTerms() {
  router.push('/app/terminos')
}

async function skip() {
  errorMsg.value = ''
  await safeUpsert()
  goTerms()
}

async function goNext() {
  errorMsg.value = ''
  await safeUpsert()
  goTerms()
}
</script>

<template>
  <h1 class="visually-hidden">Onboarding 2 · Notificaciones</h1>

  <main class="ob-page">
    <section class="ob-card">
      <h2>Notificaciones</h2>

      <p class="subtitle">
        Configurá qué avisos querés recibir. Podés cambiarlo después desde tu perfil.
      </p>

      <!-- Switch general -->
      <div class="switch-row">
        <div class="switch-text">
          <span class="switch-label">Permitir notificaciones</span>
          <p class="switch-caption">Usamos avisos suaves para recordatorios y novedades. Sin spam.</p>
        </div>

        <label class="switch">
          <input
            type="checkbox"
            :checked="enabled"
            @change="onToggleEnabled(($event.target as HTMLInputElement).checked)"
          />
          <span class="slider" />
        </label>
      </div>

      <!-- Opciones -->
      <div class="options">
        <article class="option" :class="{ 'option--disabled': !enabled }">
          <div class="opt-text">
            <h3 class="opt-title">Recordatorios de bienestar</h3>
            <p class="opt-sub">Ejercicios, chequeos emocionales y tips para tu día a día.</p>
          </div>

          <label class="switch">
            <input v-model="bienestar" type="checkbox" :disabled="!enabled" />
            <span class="slider" />
          </label>
        </article>

        <article class="option" :class="{ 'option--disabled': !enabled }">
          <div class="opt-text">
            <h3 class="opt-title">Novedades de tu profesional</h3>
            <p class="opt-sub">Material nuevo, cambios de turno y mensajes importantes.</p>
          </div>

          <label class="switch">
            <input v-model="profesional" type="checkbox" :disabled="!enabled" />
            <span class="slider" />
          </label>
        </article>

        <article class="option" :class="{ 'option--disabled': !enabled }">
          <div class="opt-text">
            <h3 class="opt-title">Actualizaciones de Nura</h3>
            <p class="opt-sub">Avisos de seguridad, nuevas funciones y mejoras de la app.</p>
          </div>

          <label class="switch">
            <input v-model="appUpdates" type="checkbox" :disabled="!enabled" />
            <span class="slider" />
          </label>
        </article>
      </div>

      <div v-if="errorMsg" class="error" role="status">
        {{ errorMsg }}
      </div>

      <!-- Acciones -->
      <div class="actions">
        <button class="btn btn-secondary" type="button" @click="skip">
          Configurarlo más tarde
        </button>

        <button class="btn btn-primary" type="button" :disabled="saving" @click="goNext">
          {{ saving ? 'Guardando…' : 'Continuar' }}
        </button>
      </div>
    </section>
  </main>
</template>



<style scoped>
/* ===== Fondo igual al splash ===== */
.ob-page {
  min-height: 100dvh;
  background: url('/bgs/splash.png') center/cover no-repeat;
  display: flex;
  justify-content: center;
  align-items: start;
  padding: 48px 16px 32px;
}

/* ===== Card central ===== */
.ob-card {
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

.visually-hidden {
  position: absolute !important;
  height: 1px;
  width: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
}

/* ===== Switch row ===== */
.switch-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  background: #dbeff1;
  border-radius: 16px;
  padding: 12px 14px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
}

.switch-text {
  text-align: left;
}
.switch-label {
  display: block;
  font-weight: 700;
  margin-bottom: 4px;
  color: #0f172a;
}
.switch-caption {
  font-size: 0.85rem;
  color: #425159;
  margin: 0;
}

/* ===== Opciones ===== */
.options {
  background: #dbeff1;
  border-radius: 18px;
  padding: 12px 12px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
  display: grid;
  gap: 10px;
  margin-bottom: 18px;
}

.option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 12px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #e2edf7;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
}

.option--disabled {
  opacity: 0.55;
}

.opt-text {
  text-align: left;
  min-width: 0;
}

.opt-title {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  color: #0f172a;
}

.opt-sub {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: #6b7280;
  line-height: 1.3rem;
}

/* ===== Switch ===== */
.switch {
  position: relative;
  width: 46px;
  height: 26px;
  display: inline-block;
  flex: 0 0 auto;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #e5e7eb;
  transition: 0.2s;
  border-radius: 999px;
}

.slider::before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 4px;
  top: 4px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.4);
}

.switch input:checked + .slider {
  background-color: #50bdbd;
}

.switch input:checked + .slider::before {
  transform: translateX(18px);
}

.switch input:disabled + .slider {
  cursor: not-allowed;
}

/* ===== Error ===== */
.error {
  background: #fff1f2;
  border: 1px solid #fecdd3;
  color: #9f1239;
  border-radius: 14px;
  padding: 10px 12px;
  font-size: 0.92rem;
  margin: 0 0 14px;
  text-align: left;
}

/* ===== Botones ===== */
.actions {
  display: grid;
  gap: 12px;
  justify-items: center;
}

.btn {
  width: 74%;
  border: none;
  border-radius: 999px;
  padding: 0.75rem 1rem;
  background: #50bdbd;
  color: #ffffff;
  font-weight: 600;
  font-size: 0.98rem;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(80, 189, 189, 0.35);
  transition: background 0.15s ease, transform 0.08s ease, box-shadow 0.15s ease;
}

.btn:hover:not(:disabled) {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(80, 189, 189, 0.4);
}

.btn:disabled {
  opacity: 0.7;
  cursor: default;
  transform: none;
}

.btn-primary {
  background: #50bdbd;
  color: #fff;
}

.btn-secondary {
  background: #48b1b1ad;
  color: #fff;
}

.btn-secondary:hover:not(:disabled) {
  background: #50bdbd;
}

@media (min-width: 900px) {
  .ob-card {
    padding: 32px 26px 38px;
  }
}

/* =========================
   Premium Mobile Layout
   ========================= */
@media (max-width: 480px) {

  .ob-page {
    padding: 46px 18px 44px;  
    align-items: flex-start;  
    min-height: 100dvh;
  }

  .ob-card {
    margin-top: 8px;    }

  h2 {
    font-size: 1.35rem;
    margin-bottom: 6px;
  }

  .subtitle {
    font-size: 0.88rem;
    margin-bottom: 16px;
  }

  .switch-row {
    padding: 10px 12px;
    border-radius: 14px;
    margin-bottom: 14px;
  }

  .options {
    padding: 10px;
    gap: 10px;
    border-radius: 16px;
    margin-bottom: 18px;
  }

  .option {
    padding: 10px;
    border-radius: 12px;
  }

  .opt-title {
    font-size: 0.88rem;
  }

  .opt-sub {
    font-size: 0.75rem;
    line-height: 1.05rem;
  }

  .switch {
    width: 40px;
    height: 22px;
  }

  .slider::before {
    width: 15px;
    height: 15px;
    top: 3.5px;
  }

  .switch input:checked + .slider::before {
    transform: translateX(16px);
  }

  .actions {
    gap: 10px;
  }

  .btn {
    width: 100%;
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
    box-shadow: 0 8px 18px rgba(80, 189, 189, 0.35);
  }

}
</style>