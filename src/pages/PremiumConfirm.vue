<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/composables/useSupabase'

const router = useRouter()
const auth = useAuthStore()

const wantsReminder = ref(true)

/** email de la cuenta (Auth) */
const authEmail = computed(() => auth.user?.email ?? '')

/** Email editable guardado en profiles.email */
const editableEmail = ref('')
const emailMode = ref<'view' | 'edit'>('view')
const emailSaving = ref(false)
const emailError = ref('')
const emailSavedOk = ref(false)

const currentConfirmEmail = ref('')

function clearEmailMessages() {
  emailError.value = ''
  emailSavedOk.value = false
}

function openEditEmail() {
  clearEmailMessages()
  emailMode.value = 'edit'
}

function cancelEditEmail() {
  clearEmailMessages()
  emailMode.value = 'view'
  editableEmail.value = currentConfirmEmail.value
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

async function loadConfirmEmail() {
  currentConfirmEmail.value = authEmail.value
  editableEmail.value = authEmail.value

  if (!auth.user) return

  const { data } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (data?.email) {
    currentConfirmEmail.value = data.email
    editableEmail.value = data.email
  }
}

async function saveEmail() {
  clearEmailMessages()

  const next = editableEmail.value.trim()

  if (!next) {
    emailError.value = 'Ingresá un email.'
    return
  }

  if (!isValidEmail(next)) {
    emailError.value = 'El formato del email no es válido.'
    return
  }

  if (!auth.user) return

  emailSaving.value = true

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ email: next })
      .eq('id', auth.user.id)

    if (error) throw error

    currentConfirmEmail.value = next
    emailSavedOk.value = true
    emailMode.value = 'view'
  } catch (e: any) {
    emailError.value =
      e?.message ?? 'No se pudo guardar el email. Probá nuevamente.'
  } finally {
    emailSaving.value = false
  }
}

onMounted(async () => {
  const now = new Date()
  const next = new Date(now)
  next.setMonth(next.getMonth() + 1)

  localStorage.setItem('nura_is_premium', 'true')
  localStorage.setItem('nura_premium_subscribed_at', now.toISOString())
  localStorage.setItem('nura_premium_next_payment', next.toISOString())

  if (auth.user) {
    await supabase.from('profiles').update({ premium: true }).eq('id', auth.user.id)
  }

  await loadConfirmEmail()
})

function goPremiumArea() {
  router.push({ name: 'premium-area' })
}
</script>

<template>
  <h1 class="visually-hidden">Suscripción Premium confirmada</h1>

  <main class="page">
    <section class="wrap">
      <header class="head">
        <p class="kicker">Suscripción confirmada</p>
        <h2 class="page-title">Nura Premium</h2>
        <p class="page-sub">
          Tu plan quedó activo. Ya podés acceder a beneficios ilimitados.
        </p>
      </header>

      <section class="card hero" aria-labelledby="confirm-title">
        <div class="hero-left">
          <h2 id="confirm-title" class="hero-title">
            ¡Listo! Tu suscripción está confirmada.
          </h2>
          <p class="hero-text">
            Desde ahora tenés acceso a herramientas premium, encuentros en vivo y contenido exclusivo.
          </p>
        </div>

        <div class="badge">
          <span class="dot"></span>
          <span class="badge-text">Plan activo</span>
        </div>
      </section>

      <section class="card" aria-labelledby="email-title">
        <h2 id="email-title" class="section-title">Email de confirmación</h2>
        <p class="section-sub">Usaremos este email para comunicaciones del plan.</p>

        <div v-if="emailMode === 'view'" class="email-row">
          <div class="email-box">
            <p class="email-label">Email</p>
            <p class="email-value">{{ currentConfirmEmail || authEmail }}</p>

            <p
              v-if="currentConfirmEmail && authEmail && currentConfirmEmail !== authEmail"
              class="email-hint"
            >
              Cuenta iniciada con: <span class="mono">{{ authEmail }}</span>
            </p>
          </div>

          <button class="btn btn-soft" type="button" @click="openEditEmail">
            Editar
          </button>
        </div>

        <div v-else class="edit-area">
          <label class="field" for="premium-confirm-email">
            <span class="label">Email</span>
            <input
              id="premium-confirm-email"
              v-model="editableEmail"
              type="email"
              class="input"
              autocomplete="email"
              inputmode="email"
              placeholder="tu@email.com"
            />
          </label>

          <p v-if="emailError" class="msg msg--error" role="alert">
            {{ emailError }}
          </p>
          <p v-else-if="emailSavedOk" class="msg msg--ok" role="status">
            Email actualizado.
          </p>

          <div class="actions">
            <button
              class="btn btn-soft"
              type="button"
              @click="cancelEditEmail"
              :disabled="emailSaving"
            >
              Cancelar
            </button>
            <button
              class="btn btn-primary"
              type="button"
              @click="saveEmail"
              :disabled="emailSaving"
            >
              {{ emailSaving ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </div>
      </section>

      <section class="card" aria-labelledby="reminder-title">
        <h2 id="reminder-title" class="section-title">Recordatorio mensual</h2>
        <p class="section-sub">Opcional</p>

        <label class="toggle">
          <input v-model="wantsReminder" type="checkbox" />
          <span class="toggle-ui" aria-hidden="true"></span>
          <span class="toggle-text">
            {{ wantsReminder ? 'Activado' : 'Desactivado' }}
          </span>
        </label>

        <p class="foot">
          <span v-if="wantsReminder">Recordatorio mensual activado.</span>
          <span v-else>Podés activarlo cuando quieras.</span>
        </p>
      </section>

      <div class="bottom">
        <button class="btn btn-primary btn-cta" type="button" @click="goPremiumArea">
          Ir a mi espacio Premium
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.page {
  min-height: calc(100dvh - 64px);
  background: #ffffff;
  padding: 24px 18px 48px;
}

.wrap {
  max-width: 980px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

.head {
  text-align: left;
  padding: 4px 2px 10px;
}

.kicker {
  margin: 0 0 6px;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 800;
}

.page-title {
  margin: 0;
  font-size: 1.65rem;
  font-weight: 850;
  color: #50bdbd;
}

.page-sub {
  margin: 8px 0 0;
  color: #475569;
  font-size: 1rem;
}

.card {
  width: 100%;
  box-sizing: border-box;
  background: #ffffff;
  border-radius: 18px;
  padding: 18px 18px 16px;
  border: 1px solid #e2edf7;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    background-color 0.22s ease,
    border-color 0.22s ease;
}

@media (hover: hover) {
  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
    background: #ffffff;
  }
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  background: linear-gradient(135deg, #e3f6fb, #f0f9ff);
  border: 1px solid #d7eef6;
}

.hero-title {
  margin: 0 0 6px;
  font-weight: 850;
  color: #0f172a;
  font-size: 1.2rem;
}

.hero-text {
  margin: 0;
  color: #475569;
  font-size: 0.96rem;
  max-width: 62ch;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1.5px solid #50bdbd;
  background: #e0faf7;
  color: #0f766e;
  font-size: 0.9rem;
  font-weight: 750;
  white-space: nowrap;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 2px #bbf7d0;
}

.section-title {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 850;
  color: #50bdbd;
}

.section-sub {
  margin: 6px 0 12px;
  font-size: 0.95rem;
  color: #64748b;
}

.email-row {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.email-box {
  flex: 1;
  min-width: 0;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px;
}

.email-label {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 800;
  color: #64748b;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.email-value {
  margin: 6px 0 0;
  font-size: 1rem;
  font-weight: 750;
  color: #0f172a;
  word-break: break-word;
}

.email-hint {
  margin: 6px 0 0;
  font-size: 0.88rem;
  color: #64748b;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.edit-area {
  display: grid;
  gap: 10px;
}

.field {
  display: grid;
  gap: 6px;
}

.label {
  font-size: 0.95rem;
  font-weight: 750;
  color: #0f172a;
}

.input {
  width: 100%;
  box-sizing: border-box;
  border: 1.5px solid #dbe7f3;
  background: #ffffff;
  border-radius: 14px;
  padding: 10px 12px;
  font-size: 0.98rem;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.input:focus {
  border-color: #50bdbd;
  box-shadow: 0 0 0 3px rgba(80, 189, 189, 0.18);
}

.msg {
  margin: 0;
  font-size: 0.92rem;
}

.msg--error {
  color: #b42318;
}

.msg--ok {
  color: #0f766e;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  user-select: none;
}

.toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.toggle-ui {
  width: 44px;
  height: 26px;
  border-radius: 999px;
  background: #e2e8f0;
  position: relative;
  transition: background 0.18s ease;
}

.toggle-ui::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
  transition: transform 0.18s ease;
}

.toggle input:checked + .toggle-ui {
  background: #50bdbd;
}

.toggle input:checked + .toggle-ui::after {
  transform: translateX(18px);
}

.toggle-text {
  font-weight: 750;
  color: #0f172a;
}

.foot {
  margin: 10px 0 0;
  font-size: 0.9rem;
  color: #64748b;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  border-radius: 999px;
  border: none;
  padding: 10px 16px;
  font-size: 0.96rem;
  font-weight: 800;
  cursor: pointer;
  box-sizing: border-box;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.btn-primary {
  background: #50bdbd;
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.22);
}

@media (hover: hover) {
  .btn-primary:hover:not(:disabled) {
    background: #3ea9a9;
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(80, 189, 189, 0.3);
  }
}

.btn-soft {
  background: #ffffff;
  color: #50bdbd;
  border: 1px solid #b6ebe5;
  box-shadow: 0 4px 12px rgba(148, 163, 184, 0.16);
}

@media (hover: hover) {
  .btn-soft:hover:not(:disabled) {
    background: #e0faf7;
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(80, 189, 189, 0.12);
  }
}

.btn:active:not(:disabled) {
  transform: scale(0.98);
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.bottom {
  padding-top: 4px;
  display: flex;
  justify-content: flex-start;
}

.btn-cta {
  width: auto;
  min-width: 220px;
  max-width: 320px;
}

.visually-hidden {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

@media (max-width: 680px) {
  .page {
    padding: 16px 12px 96px;
  }

  .page-title {
    font-size: 1.4rem;
  }

  .card {
    padding: 16px 14px;
  }

  .hero {
    flex-direction: column;
  }

  .email-row {
    flex-direction: column;
    align-items: stretch;
  }

  .actions {
    flex-direction: column;
    align-items: stretch;
  }

  .actions .btn,
  .bottom .btn-cta {
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }
}
</style>