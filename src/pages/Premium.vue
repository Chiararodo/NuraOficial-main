<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const auth = useAuthStore()

const loading = ref(true)
const premiumDb = ref(false)
const isAdmin = ref(false)

const adminPremiumEnabled = ref(true)

function loadAdminToggle() {
  const raw = localStorage.getItem('nura_admin_premium_enabled')
  adminPremiumEnabled.value = raw === null ? true : raw === 'true'
}

function setAdminToggle(value: boolean) {
  adminPremiumEnabled.value = value
  localStorage.setItem('nura_admin_premium_enabled', value ? 'true' : 'false')
}

function syncPremiumCache(value: boolean) {
  if (value) localStorage.setItem('nura_is_premium', 'true')
  else localStorage.removeItem('nura_is_premium')

  window.dispatchEvent(new Event('nura-premium-changed'))
}

const isPremium = computed(() => {
  if (isAdmin.value) return adminPremiumEnabled.value
  return premiumDb.value || localStorage.getItem('nura_is_premium') === 'true'
})

async function loadStatus() {
  if (!auth.user) {
    premiumDb.value = false
    isAdmin.value = false
    syncPremiumCache(false)
    loading.value = false
    return
  }

  loading.value = true

  const { data, error } = await supabase
    .from('profiles')
    .select('premium, is_admin')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (!error && data) {
    isAdmin.value = !!data.is_admin
    premiumDb.value = !!data.premium
    syncPremiumCache(isAdmin.value ? adminPremiumEnabled.value : premiumDb.value)
  }

  loading.value = false
}

function goCheckout() {
  router.push({ name: 'premium-checkout' })
}

function goPerfil() {
  router.push({ name: 'perfil' })
}

function goPremiumArea() {
  if (!isPremium.value) {
    router.push({ name: 'premium' })
    return
  }
  router.push({ name: 'premium-area' })
}

const showAdminChoicePopup = ref(false)
const adminChoiceLoading = ref(false)

function openAdminChoicePopup() {
  showAdminChoicePopup.value = true
}

function closeAdminChoicePopup() {
  if (!adminChoiceLoading.value) showAdminChoicePopup.value = false
}

async function ensureAdminPremiumOn() {
  if (!isAdmin.value) return

  setAdminToggle(true)
  syncPremiumCache(true)

  if (auth.user) {
    await supabase
      .from('profiles')
      .update({ premium: true, plan: 'premium', plan_expires_at: null })
      .eq('id', auth.user.id)
  }

  await loadStatus()
}

async function adminGoToPremiumManage() {
  if (!isAdmin.value) return
  adminChoiceLoading.value = true

  await ensureAdminPremiumOn()

  showAdminChoicePopup.value = false
  adminChoiceLoading.value = false

  router.push({ name: 'premium' })
}

async function adminGoToPremiumStar() {
  if (!isAdmin.value) return
  adminChoiceLoading.value = true

  await ensureAdminPremiumOn()

  showAdminChoicePopup.value = false
  adminChoiceLoading.value = false

  router.push({ name: 'premium-area' })
}

const premiumSince = computed(() => {
  const iso = localStorage.getItem('nura_premium_subscribed_at')
  return iso ? new Date(iso) : null
})

const nextPayment = computed(() => {
  const iso = localStorage.getItem('nura_premium_next_payment')
  return iso ? new Date(iso) : null
})

const premiumSinceLabel = computed(() => {
  if (!premiumSince.value) return ''
  return premiumSince.value.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
})

const nextPaymentLabel = computed(() => {
  if (!nextPayment.value) return ''
  return nextPayment.value.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
})

const showConfirmCancel = ref(false)
const showSuccessModal = ref(false)
const cancelLoading = ref(false)

function openCancelModal() {
  showConfirmCancel.value = true
}

function closeCancelModal() {
  if (!cancelLoading.value) showConfirmCancel.value = false
}

async function confirmCancelPremium() {
  cancelLoading.value = true

  syncPremiumCache(false)
  localStorage.removeItem('nura_premium_subscribed_at')
  localStorage.removeItem('nura_premium_next_payment')

  if (auth.user) {
    await supabase
      .from('profiles')
      .update({ premium: false, plan: 'free', plan_expires_at: null })
      .eq('id', auth.user.id)
  }

  if (isAdmin.value) setAdminToggle(false)

  cancelLoading.value = false
  showConfirmCancel.value = false
  showSuccessModal.value = true

  await loadStatus()
}

function closeSuccessModal() {
  showSuccessModal.value = false
  router.push({ name: 'perfil' })
}

type Shortcut = { title: string; desc: string; to: string }

const shortcuts = computed<Shortcut[]>(() => [
  {
    title: 'Foro',
    desc: 'Publicá, comentá y participá en la comunidad. Ideal para apoyo y experiencias compartidas.',
    to: '/app/foro'
  },
  {
    title: 'Diario',
    desc: 'Registrá tu estado emocional y escribí tus entradas. Útil para seguimiento personal.',
    to: '/app/diario'
  },
  {
    title: 'Chatbot',
    desc: 'Asistente de apoyo para organizarte, reflexionar y acceder a recursos guiados.',
    to: '/app/chatbot'
  },
  {
    title: 'Agenda',
    desc: 'Revisá actividades premium, sesiones y próximos encuentros disponibles.',
    to: '/app/agendar'
  }
])

function goTo(path: string) {
  router.push(path)
}

onMounted(async () => {
  loadAdminToggle()
  await loadStatus()
  syncPremiumCache(isPremium.value)
})
</script>

<template>
  <h1 class="visually-hidden">Premium</h1>

  <main class="premium-page">
    <section class="container">
      <header class="page-head">
        <div class="head-left">
          <p class="kicker">{{ isPremium ? 'Plan activo' : 'Planes' }}</p>
          <h2 class="page-title">{{ isPremium ? 'Nura Premium' : 'Elegí tu plan' }}</h2>
          <p class="page-sub">
            {{
              isPremium
                ? 'Revisá tu estado de suscripción, accesos y beneficios incluidos.'
                : 'Podés empezar con el Plan Gratuito y pasar a Premium cuando quieras.'
            }}
          </p>
        </div>

        <div v-if="isPremium" class="status-pill">
          <span class="dot"></span>
          <span>Plan activo</span>
        </div>
      </header>

      <p v-if="loading" class="page-sub loading-text">Cargando…</p>

      <section v-else-if="!isPremium" class="plans-grid" aria-label="Planes disponibles">
        <article class="plan-card">
          <header class="plan-head">
            <div>
              <h2 class="plan-title">Plan Gratuito</h2>
              <p class="plan-desc">
                Ideal para empezar a usar Nura y conocer las funciones principales.
              </p>
            </div>
            <p class="plan-price">$0 <span>/mes</span></p>
          </header>

          <ul class="benefits">
            <li><strong>Foro:</strong> Podés comentar, pero no crear publicaciones.</li>
            <li><strong>Diario:</strong> Hasta <strong>10 entradas por mes</strong>.</li>
            <li><strong>Chatbot:</strong> Hasta 10 mensajes por día.</li>
            <li><strong>Contenido:</strong> Acceso a materiales generales.</li>
          </ul>
        </article>

        <article class="plan-card plan-card--premium">
          <header class="plan-head">
            <div>
              <h2 class="plan-title">Plan Premium</h2>
              <p class="plan-desc">
                Acceso completo e ilimitado a herramientas y experiencias en vivo.
              </p>
            </div>
            <p class="plan-price">$10.000 <span>/mes</span></p>
          </header>

          <ul class="benefits">
            <li><strong>Foro:</strong> Crear + comentar sin límites.</li>
            <li><strong>Diario:</strong> Entradas ilimitadas.</li>
            <li><strong>Chatbot:</strong> Usos ilimitados.</li>
            <li>Videollamadas grupales semanales.</li>
            <li>Talleres exclusivos en vivo.</li>
            <li>Merch exclusivo.</li>
          </ul>

          <div class="plan-actions">
            <button class="btn btn-primary" type="button" @click="goCheckout">
              Elegir Premium
            </button>

            <button
              v-if="isAdmin"
              class="btn btn-soft"
              type="button"
              @click="openAdminChoicePopup"
            >
              Premium Admin
            </button>
          </div>
        </article>

        <div class="bottom-action">
          <button class="btn btn-soft" type="button" @click="goPerfil">
            Volver al perfil
          </button>
        </div>
      </section>

      <section v-else class="active-area">
        <div class="content-grid">
          <section class="card card-stack">
            <div>
              <h2 class="section-title">Estado de suscripción</h2>

              <p class="section-sub" v-if="isAdmin">
                Tu cuenta tiene <strong>Premium incluido</strong> por ser administradora.
              </p>

              <p class="section-sub" v-else>
                La renovación es automática todos los meses.
              </p>

              <div class="kv" v-if="!isAdmin">
                <div class="kv-row" v-if="premiumSinceLabel">
                  <span class="kv-key">Suscripta desde</span>
                  <span class="kv-val">{{ premiumSinceLabel }}</span>
                </div>

                <div class="kv-row" v-if="nextPaymentLabel">
                  <span class="kv-key">Próximo pago estimado</span>
                  <span class="kv-val">{{ nextPaymentLabel }}</span>
                </div>
              </div>
            </div>

            <div class="card-actions">
              <button class="btn btn-primary" type="button" @click="goPremiumArea">
                Ir a mi espacio Premium
              </button>

              <button class="btn btn-soft" type="button" @click="goPerfil">
                Volver al perfil
              </button>

              <button class="btn btn-danger" type="button" @click="openCancelModal">
                Darme de baja
              </button>
            </div>
          </section>

          <section class="card">
            <h2 class="section-title">Beneficios incluidos</h2>
            <p class="section-sub">Acceso completo a herramientas y experiencias premium.</p>

            <ul class="benefits">
              <li><strong>Foro:</strong> Crear + comentar sin límites.</li>
              <li><strong>Diario:</strong> Entradas ilimitadas.</li>
              <li><strong>Chatbot:</strong> Usos ilimitados.</li>
              <li>Videollamadas grupales semanales.</li>
              <li>Talleres exclusivos en vivo.</li>
              <li>Merch exclusivo.</li>
            </ul>
          </section>

          <section class="card card-wide">
            <h2 class="section-title">Accesos rápidos</h2>
            <p class="section-sub">
              Entradas directas a las secciones principales para aprovechar el plan sin perder tiempo.
            </p>

            <div class="shortcuts">
              <button
                v-for="s in shortcuts"
                :key="s.to"
                class="shortcut"
                type="button"
                @click="goTo(s.to)"
              >
                <div class="shortcut-top">
                  <span class="shortcut-title">{{ s.title }}</span>
                </div>
                <p class="shortcut-desc">{{ s.desc }}</p>
              </button>
            </div>
          </section>
        </div>
      </section>
    </section>

    <div v-if="showAdminChoicePopup" class="modal-backdrop" @click.self="closeAdminChoicePopup">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
        <h2 id="admin-modal-title" class="modal-title">Premium incluido</h2>
        <p class="modal-text">
          Por ser administradora, tenés <strong>Nura Premium</strong> habilitado sin costo.
        </p>

        <div class="modal-actions">
          <button
            type="button"
            class="btn btn-soft"
            @click="adminGoToPremiumManage"
            :disabled="adminChoiceLoading"
          >
            Ir a Premium
          </button>

          <button
            type="button"
            class="btn btn-primary"
            @click="adminGoToPremiumStar"
            :disabled="adminChoiceLoading"
          >
            Ir a mi espacio Premium
          </button>
        </div>
      </div>
    </div>

    <div v-if="showConfirmCancel" class="modal-backdrop" @click.self="closeCancelModal">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="cancel-modal-title">
        <h2 id="cancel-modal-title" class="modal-title">¿Darte de baja de Nura Premium?</h2>

        <p class="modal-text">
          Al darte de baja, vas a pasar al <strong>Plan Gratuito</strong>.
        </p>

        <p class="modal-text extra">
          Si sos admin, también se desactiva tu acceso al espacio Premium.
        </p>

        <div class="modal-actions">
          <button
            type="button"
            class="btn btn-soft"
            @click="closeCancelModal"
            :disabled="cancelLoading"
          >
            Seguir con Premium
          </button>

          <button
            type="button"
            class="btn btn-danger"
            @click="confirmCancelPremium"
            :disabled="cancelLoading"
          >
            {{ cancelLoading ? 'Dando de baja…' : 'Sí, darme de baja' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showSuccessModal" class="modal-backdrop" @click.self="closeSuccessModal">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="success-modal-title">
        <h2 id="success-modal-title" class="modal-title">Tu plan Premium fue cancelado</h2>

        <p class="modal-text">
          Ahora tenés activo el <strong>Plan Gratuito</strong>.
        </p>

        <div class="modal-actions single">
          <button type="button" class="btn btn-primary" @click="closeSuccessModal">
            Volver al perfil
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.premium-page {
  padding: 20px 18px 48px;
  background: #ffffff;
  min-height: calc(100dvh - 64px);
}

.container {
  max-width: 1180px;
  width: 100%;
  margin: 0 auto;
  display: grid;
  gap: 18px;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
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
  font-size: 1.7rem;
  font-weight: 850;
  color: #50bdbd;
}

.page-sub {
  margin: 8px 0 0;
  color: #475569;
  font-size: 1rem;
  max-width: 78ch;
}

.loading-text {
  margin-top: 8px;
}

.status-pill {
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

.content-grid {
  display: grid;
  gap: 20px;
  align-items: stretch;
}

@media (min-width: 980px) {
  .content-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.card {
  width: 100%;
  box-sizing: border-box;
  background: #ffffff;
  border-radius: 18px;
  padding: 22px 22px 20px;
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

@media (min-width: 980px) {
  .card {
    min-height: 270px;
  }
}

.card-wide {
  grid-column: 1 / -1;
  min-height: 100px;
}

.card-stack {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.section-title {
  margin: 0;
  font-size: 1.18rem;
  font-weight: 800;
  color: #50bdbd;
}

.section-sub {
  margin: 8px 0 14px;
  font-size: 0.97rem;
  color: #64748b;
  line-height: 1.45;
}

.kv {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.kv-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.kv-key {
  color: #64748b;
  font-weight: 750;
}

.kv-val {
  color: #0f172a;
  font-weight: 900;
}

.benefits {
  margin: 0;
  padding-left: 20px;
  color: #334155;
  font-size: 0.97rem;
}

.benefits li {
  margin-bottom: 10px;
}

.benefits li::marker {
  content: '✓ ';
  color: #50bdbd;
  font-weight: 900;
}

.card-actions,
.plan-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 18px;
}

.plans-grid {
  display: grid;
  gap: 16px;
}

@media (min-width: 980px) {
  .plans-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.plan-card {
  border-radius: 18px;
  padding: 20px 20px 18px;
  border: 1px solid #e2edf7;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 12px;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    background-color 0.22s ease,
    border-color 0.22s ease;
}

@media (hover: hover) {
  .plan-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
  }
}

.plan-card--premium {
  background: linear-gradient(135deg, #e3f6fb, #f0f9ff);
}

.plan-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
}

.plan-title {
  margin: 0;
  font-weight: 900;
  font-size: 1.15rem;
  color: #0f172a;
}

.plan-desc {
  margin: 6px 0 0;
  color: #334155;
  font-size: 0.97rem;
  line-height: 1.45;
}

.plan-price {
  margin: 0;
  font-weight: 950;
  color: #0f172a;
  font-size: 1.08rem;
}

.plan-price span {
  font-weight: 650;
  color: #64748b;
  font-size: 0.92rem;
  margin-left: 4px;
}

.bottom-action {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-start;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 999px;
  border: none;
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
}

@media (hover: hover) {
  .btn-primary:hover:not(:disabled) {
    background: #3daaaa;
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(80, 189, 189, 0.3);
  }
}

.btn-soft {
  background: #ffffff;
  color: #50bdbd;
  border: 1px solid #b6ebe5;
  box-shadow: 0 4px 12px rgba(148, 163, 184, 0.14);
}

@media (hover: hover) {
  .btn-soft:hover:not(:disabled) {
    background: #e0faf7;
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(80, 189, 189, 0.12);
  }
}

.btn-danger {
  background: #ffffff;
  color: #ef5350;
  border: 1px solid rgba(239, 83, 80, 0.55);
  box-shadow: 0 4px 12px rgba(239, 83, 80, 0.16);
}

@media (hover: hover) {
  .btn-danger:hover:not(:disabled) {
    background: rgba(229, 57, 53, 0.08);
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(239, 83, 80, 0.18);
  }
}

.btn:active:not(:disabled) {
  transform: scale(0.98);
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.shortcuts {
  display: grid;
  gap: 14px;
}

@media (min-width: 980px) {
  .shortcuts {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 1200px) {
  .shortcuts {
    grid-template-columns: 1fr 1fr 1fr 1fr;
  }
}

.shortcut {
  text-align: left;
  border: 1px solid #e2edf7;
  background: rgba(182, 235, 229, 0.45);
  border-radius: 16px;
  padding: 16px 16px 14px;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
  transition:
    transform 0.18s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
  min-height: 130px;
}

@media (hover: hover) {
  .shortcut:hover {
    transform: translateY(-3px);
    border-color: #9be9e0;
    background: rgba(155, 233, 224, 0.5);
    box-shadow: 0 16px 34px rgba(80, 189, 189, 0.18);
  }
}

.shortcut-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.shortcut-title {
  font-weight: 900;
  color: #0f172a;
  font-size: 1rem;
}

.shortcut-desc {
  margin: 0;
  color: #64748b;
  font-size: 0.92rem;
  line-height: 1.4;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 40;
}

.modal-card {
  background: #ffffff;
  border-radius: 18px;
  padding: 18px 18px 16px;
  width: 100%;
  max-width: 460px;
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.24);
  border: 1px solid #e2edf7;
}

.modal-title {
  margin: 0 0 8px;
  font-size: 1.12rem;
  color: #50bdbd;
  font-weight: 800;
}

.modal-text {
  margin: 0 0 8px;
  font-size: 0.95rem;
  color: #4b5563;
  line-height: 1.45;
}

.modal-text.extra {
  margin-top: 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.modal-actions.single {
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

@media (max-width: 720px) {
  .premium-page {
    padding: 16px 12px 96px;
  }

  .page-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .page-title {
    font-size: 1.4rem;
  }

  .section-title,
  .plan-title {
    font-size: 1.05rem;
  }

  .card,
  .plan-card {
    padding: 16px 14px;
  }

  .card-actions,
  .plan-actions,
  .bottom-action,
  .modal-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .card-actions .btn,
  .plan-actions .btn,
  .bottom-action .btn,
  .modal-actions .btn {
    width: 100%;
  }

  .kv-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>