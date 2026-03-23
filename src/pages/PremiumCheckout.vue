<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/composables/useSupabase'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const terms = ref(false)
const errorMsg = ref('')
const infoMsg = ref('')
const loading = ref(false)

const MP_PREMIUM_URL = 'https://mpago.la/2b1Jhzj'

const authEmail = computed(() => auth.user?.email ?? '')

/* ===== Modal Términos ===== */
const showTermsModal = ref(false)

function clearMessages() {
  errorMsg.value = ''
  infoMsg.value = ''
}

function openTermsModal() {
  showTermsModal.value = true
}

function closeTermsModal() {
  showTermsModal.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showTermsModal.value) closeTermsModal()
}

function goBack() {
  router.back()
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

async function prefillEmail() {
  email.value = authEmail.value

  if (!auth.user) return

  const { data } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (data?.email) email.value = data.email
}

async function submit() {
  clearMessages()

  const next = email.value.trim()

  if (!next) {
    errorMsg.value = 'Ingresá un email para la confirmación.'
    return
  }

  if (!isValidEmail(next)) {
    errorMsg.value = 'El formato del email no es válido.'
    return
  }

  if (!terms.value) {
    errorMsg.value = 'Tenés que aceptar los términos y condiciones.'
    return
  }

  loading.value = true
  infoMsg.value = 'Te estamos redirigiendo a Mercado Pago…'

  try {
    if (auth.user) {
      await supabase.from('profiles').update({ email: next }).eq('id', auth.user.id)
    }

    window.open(MP_PREMIUM_URL, '_blank')
    router.push('/app/premium/confirmado')
  } catch (e: any) {
    errorMsg.value =
      e?.message ?? 'No pudimos iniciar el checkout. Probá nuevamente.'
    infoMsg.value = ''
    loading.value = false
    return
  }

  loading.value = false
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  prefillEmail()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <h1 class="visually-hidden">Checkout Premium</h1>

  <main class="page">
    <section class="wrap">
      <header class="top">
        <button class="back" type="button" @click="goBack" aria-label="Volver">
          <span class="arrow">←</span>
        </button>

        <div class="top-txt">
          <p class="kicker">Premium</p>
          <h2 class="title">Checkout</h2>
          <p class="subtitle">
            Confirmá tu email, aceptá los términos y completá el pago seguro.
          </p>
        </div>
      </header>

      <section class="card" aria-labelledby="checkout-title">
        <div class="banner">
          <div>
            <h2 id="checkout-title" class="banner-title">Suscribirte al plan Premium</h2>
            <p class="banner-sub">Precio: $10.000 por mes</p>
          </div>

          <span class="pill">
            <span class="dot"></span>
            <span>Pago seguro</span>
          </span>
        </div>

        <div class="field">
          <label class="label" for="premium-email">Email de confirmación</label>
          <input
            id="premium-email"
            v-model="email"
            type="email"
            class="input"
            autocomplete="email"
            inputmode="email"
            placeholder="tu@email.com"
            @input="clearMessages"
          />
          <p v-if="authEmail && email !== authEmail" class="hint">
            Cuenta iniciada con: <span class="mono">{{ authEmail }}</span>
          </p>
        </div>

        <div class="terms-box">
          <label class="terms" for="premium-terms">
            <input id="premium-terms" v-model="terms" type="checkbox" @change="clearMessages" />
            <span>
              Acepto los
              <button type="button" class="terms-link" @click.prevent="openTermsModal">
                términos y condiciones
              </button>
            </span>
          </label>
        </div>

        <p class="note">
          Te vamos a redirigir a <strong>Mercado Pago</strong> para completar el pago de forma segura.
        </p>

        <div class="total">
          <span>Total a pagar</span>
          <strong>$10.000</strong>
        </div>

        <p v-if="errorMsg" class="msg msg-error" role="alert">
          {{ errorMsg }}
        </p>

        <p v-if="infoMsg && !errorMsg" class="msg msg-info" role="status">
          {{ infoMsg }}
        </p>

        <div class="actions">
          <button
            class="btn btn-primary"
            type="button"
            :disabled="loading"
            @click="submit"
          >
            {{ loading ? 'Redirigiendo a Mercado Pago…' : 'Pagar con Mercado Pago' }}
          </button>

          <button
            class="btn btn-soft"
            type="button"
            :disabled="loading"
            @click="goBack"
          >
            Volver
          </button>
        </div>
      </section>
    </section>

    <div
      v-if="showTermsModal"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
      @click.self="closeTermsModal"
    >
      <div class="modal">
        <div class="modal-head">
          <h2 id="terms-modal-title" class="modal-title">Términos y condiciones</h2>
          <button class="icon-btn" type="button" @click="closeTermsModal" aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div class="modal-body">
          <p>
            Te damos la bienvenida a Nura. Antes de usar la app, es importante que leas y aceptes
            estos términos y la política de privacidad. Nura no reemplaza la atención médica ni
            psicológica profesional.
          </p>
          <p>
            Al continuar, confirmás que sos mayor de 15 años y que aceptás que tus datos se usarán
            según se describe en nuestra política de privacidad, solo para mejorar tu experiencia
            dentro de Nura.
          </p>
          <p>
            Si no estás de acuerdo con alguno de los puntos, por favor no continúes con el uso de la
            aplicación.
          </p>
        </div>

        <div class="modal-actions">
          <button class="btn btn-primary" type="button" @click="closeTermsModal">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.page {
  background: #fff;
  padding: 24px 18px 48px;
  max-width: 1100px;
  margin: 0 auto;
}

.wrap {
  max-width: 980px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

.top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.back {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 999px;
  background: #e8fbf8;
  color: #50bdbd;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease;
}

@media (hover: hover) {
  .back:hover {
    background: #d8f6f1;
    transform: translateY(-1px);
    box-shadow: 0 8px 16px rgba(80, 189, 189, 0.14);
  }
}

.arrow {
  font-size: 1.3rem;
  line-height: 1;
}

.top-txt {
  display: grid;
  gap: 4px;
}

.kicker {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 800;
}

.title {
  margin: 0;
  font-size: 1.55rem;
  font-weight: 850;
  color: #50bdbd;
}

.subtitle {
  margin: 0;
  color: #475569;
  font-size: 0.96rem;
}

.card {
  width: 100%;
  box-sizing: border-box;
  background: #ffffff;
  border-radius: 18px;
  padding: 20px 20px 18px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  border: 1px solid #e2edf7;
  display: grid;
  gap: 14px;
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

.banner {
  background: linear-gradient(135deg, #e3f6fb, #f0f9ff);
  border-radius: 14px;
  padding: 14px;
  border: 1px solid #d7eef6;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.banner-title {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 850;
  color: #0f172a;
}

.banner-sub {
  margin: 4px 0 0;
  font-size: 0.95rem;
  color: #475569;
}

.pill {
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

.field {
  display: grid;
  gap: 6px;
}

.label {
  font-weight: 750;
  font-size: 0.95rem;
  color: #0f172a;
}

.input {
  border-radius: 14px;
  border: 1.5px solid #dbe7f3;
  padding: 10px 12px;
  font-size: 0.98rem;
  background: #ffffff;
  width: 100%;
  box-sizing: border-box;
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

.hint {
  margin: 0;
  font-size: 0.88rem;
  color: #64748b;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.terms-box {
  display: grid;
  gap: 8px;
}

.terms {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.95rem;
  color: #0f172a;
  line-height: 1.4;
}

.terms input {
  width: 16px;
  height: 16px;
  margin-top: 2px;
}

.terms-link {
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  cursor: pointer;
  color: #50bdbd;
  font-weight: 850;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.2s ease, opacity 0.2s ease;
}

@media (hover: hover) {
  .terms-link:hover {
    color: #3ea9a9;
    opacity: 0.95;
  }
}

.note {
  font-size: 0.92rem;
  color: #475569;
  margin: 0;
}

.total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #0f172a;
}

.total strong {
  font-weight: 900;
}

.msg {
  margin: 0;
  font-size: 0.92rem;
  padding: 12px 14px;
  border-radius: 14px;
}

.msg-error {
  color: #b42318;
  background: #fff1f2;
  border: 1px solid #fecdd3;
}

.msg-info {
  color: #1d4ed8;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border-radius: 999px;
  border: none;
  padding: 10px 16px;
  font-size: 0.96rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  text-decoration: none;
  box-sizing: border-box;
}

.btn-primary {
  background: #50bdbd;
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.22);
  min-width: 220px;
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
  min-width: 140px;
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
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 18px;
  z-index: 60;
}

.modal {
  width: 100%;
  max-width: 520px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(226, 237, 247, 0.9);
  overflow: hidden;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 14px 10px;
  background: #f6fbfc;
  border-bottom: 1px solid #e2edf7;
}

.modal-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 900;
  color: #50bdbd;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 900;
  color: #0f172a;
  border-radius: 10px;
  transition: background-color 0.2s ease, transform 0.18s ease;
}

@media (hover: hover) {
  .icon-btn:hover {
    background: rgba(80, 189, 189, 0.12);
    transform: translateY(-1px);
  }
}

.modal-body {
  padding: 12px 14px 0;
  max-height: 56vh;
  overflow: auto;
  color: #334155;
  line-height: 1.5;
  font-size: 0.95rem;
}

.modal-actions {
  padding: 14px;
  display: flex;
  justify-content: flex-end;
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

  .card {
    padding: 16px 14px;
  }

  .title {
    font-size: 1.35rem;
  }

  .banner {
    flex-direction: column;
    align-items: flex-start;
  }

  .actions {
    flex-direction: column;
    align-items: stretch;
  }

  .actions .btn,
  .modal-actions .btn {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .modal {
    max-width: 360px;
    border-radius: 16px;
  }

  .modal-body {
    max-height: 52vh;
    font-size: 0.9rem;
  }
}
</style>