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
const loading = ref(false)

const MP_PREMIUM_URL = 'https://mpago.la/2b1Jhzj'

const authEmail = computed(() => auth.user?.email ?? '')

/* ===== Modal Términos ===== */
const showTermsModal = ref(false)

function openTermsModal() {
  showTermsModal.value = true
}
function closeTermsModal() {
  showTermsModal.value = false
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showTermsModal.value) closeTermsModal()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})

function goBack() {
  router.back()
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

async function prefillEmail() {
  // 1) auth email como default
  email.value = authEmail.value

  // 2) si hay email guardado en profiles
  if (!auth.user) return
  const { data } = await supabase.from('profiles').select('email').eq('id', auth.user.id).maybeSingle()

  if (data?.email) email.value = data.email
}

async function submit() {
  errorMsg.value = ''

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

  // Guardar email en profiles (para que quede consistente con Confirmado)
  if (auth.user) {
    await supabase.from('profiles').update({ email: next }).eq('id', auth.user.id)
  }

  window.open(MP_PREMIUM_URL, '_blank')
  router.push('/app/premium/confirmado')
  loading.value = false
}

onMounted(() => {
  prefillEmail()
})
</script>

<template>
  <main class="page">
    <section class="wrap">
      <header class="top">
        <button class="back" type="button" @click="goBack" aria-label="Volver">
          <span class="arrow">←</span>
        </button>
        <div class="top-txt">
          <p class="kicker">Premium</p>
          <h2 class="title">Checkout</h2>
        </div>
      </header>

      <section class="card">
        <div class="banner">
          <div>
            <p class="banner-title">Suscribirte al plan Premium</p>
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
          />
          <p v-if="authEmail && email !== authEmail" class="hint">
            Cuenta iniciada con: <span class="mono">{{ authEmail }}</span>
          </p>
        </div>

        <!-- ✅ checkbox + link que abre modal -->
        <label class="terms" for="premium-terms">
          <input id="premium-terms" v-model="terms" type="checkbox" />
          <span>
            Acepto los
            <button type="button" class="terms-link" @click.prevent="openTermsModal">
              términos y condiciones
            </button>
          </span>
        </label>

        <p class="note">
          Te vamos a redirigir a <strong>Mercado Pago</strong> para completar el pago de forma segura.
        </p>

        <div class="total">
          <span>Total a pagar</span>
          <strong>$10.000</strong>
        </div>

        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

        <button class="btn btn-primary btn-full" type="button" :disabled="loading" @click="submit">
          {{ loading ? 'Redirigiendo a Mercado Pago…' : 'Pagar con Mercado Pago' }}
        </button>

        <button class="btn btn-soft btn-full" type="button" :disabled="loading" @click="goBack">
          Volver
        </button>
      </section>
    </section>

    <!-- =========================
         MODAL TÉRMINOS
         ========================= -->
    <div
      v-if="showTermsModal"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Términos y condiciones"
      @click.self="closeTermsModal"
    >
      <div class="modal">
        <div class="modal-head">
          <h3 class="modal-title">Términos y Condiciones</h3>
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
          <button class="btn btn-primary btn-full" type="button" @click="closeTermsModal">
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
  font-family: 'Inter', sans-serif;
}

.wrap {
  max-width: 980px;
  margin: 0 auto;
  display: grid;
  gap: 14px;
}

.top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.back {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
}
.arrow {
  font-size: 1.6rem;
  color: #50bdbd;
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
  color: #0f172a;
}

.card {
  width: 100%;
  max-width: 93%;
  background: #ffffff;
  border-radius: 20px;
  padding: 22px 22px 20px;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
  border: 1px solid #e2edf7;
  display: grid;
  gap: 14px;
}

.banner {
  background: linear-gradient(135deg, #e3f6fb, #f0f9ff);
  border-radius: 14px;
  padding: 14px 14px;
  border: 1px solid #d7eef6;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.banner-title {
  margin: 0;
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

.note {
  font-size: 0.92rem;
  color: #475569;
  margin: 0;
}

.terms {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
  color: #0f172a;
}
.terms input {
  width: 16px;
  height: 16px;
}

/* link estilo iOS */
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
}
.terms-link:hover {
  color: #3ea9a9;
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

.error {
  margin: 0;
  font-size: 0.92rem;
  color: #dc2626;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: none;
  padding: 10px 16px;
  font-size: 0.98rem;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.12s ease, box-shadow 0.18s ease;
  text-decoration: none;
}
.btn-full {
  width: 50%;
  margin: 0 auto;
}

.btn-primary {
  background: #50bdbd;
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(80, 189, 189, 0.28);
}
.btn-primary:hover {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(80, 189, 189, 0.35);
}
.btn-primary:disabled {
  opacity: 0.7;
  cursor: progress;
  transform: none;
}

.btn-soft {
  background: #ffffff;
  color: #50bdbd;
  border: 1px solid #b6ebe5;
  box-shadow: 0 4px 12px rgba(148, 163, 184, 0.22);
}
.btn-soft:hover {
  background: #e0faf7;
  transform: translateY(-1px);
}
.btn-soft:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

/* =========================
   Modal
   ========================= */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
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
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.35);
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
  color: #0f172a;
}

.icon-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 900;
  color: #0f172a;
  padding: 6px 10px;
  border-radius: 10px;
}
.icon-btn:hover {
  background: rgba(80, 189, 189, 0.12);
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
}

/* Mobile */
@media (max-width: 480px) {
  .card {
    max-width: 100%;
    padding: 18px 16px;
  }
  .btn-full {
    width: 50%;
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