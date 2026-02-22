<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const auth = useAuthStore()

const isPremium = computed(() => localStorage.getItem('nura_is_premium') === 'true')

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
    year: 'numeric',
  })
})

const nextPaymentLabel = computed(() => {
  if (!nextPayment.value) return ''
  return nextPayment.value.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
})

function goCheckout() {
  router.push({ name: 'premium-checkout' })
}
function goPerfil() {
  router.push('/app/perfil')
}

/* ======= MODALES DAR DE BAJA ======= */
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

  localStorage.removeItem('nura_is_premium')
  localStorage.removeItem('nura_premium_subscribed_at')
  localStorage.removeItem('nura_premium_next_payment')

  if (auth.user) {
    await supabase.from('profiles').update({ premium: false }).eq('id', auth.user.id)
  }

  cancelLoading.value = false
  showConfirmCancel.value = false
  showSuccessModal.value = true
}

function closeSuccessModal() {
  showSuccessModal.value = false
  router.push('/app/perfil')
}

/* ======= SHORTCUTS ======= */
type Shortcut = { title: string; desc: string; to: string }

const shortcuts = computed<Shortcut[]>(() => [
  {
    title: 'Foro',
    desc: 'Publicá, comentá y participá en la comunidad. Ideal para apoyo y experiencias compartidas.',
    to: '/app/foro',
  },
  {
    title: 'Diario',
    desc: 'Registrá tu estado emocional y escribí tus entradas. Útil para seguimiento personal.',
    to: '/app/diario',
  },
  {
    title: 'Chatbot',
    desc: 'Asistente de apoyo para organizarte, reflexionar y acceder a recursos guiados.',
    to: '/app/chatbot',
  },
  {
    title: 'Agenda',
    desc: 'Revisá actividades premium, sesiones y próximos encuentros disponibles.',
    to: '/app/agendar',
  },
])

function goTo(path: string) {
  router.push(path)
}
</script>

<template>
  <main class="page">
    <section class="container">
      <!-- HEADER -->
      <header class="head">
        <div class="head-left">
          <p class="kicker">{{ isPremium ? 'Plan activo' : 'Planes' }}</p>
          <h2 class="title">
            {{ isPremium ? 'Nura Premium' : 'Elegí tu plan' }}
          </h2>
          <p class="sub">
            {{
              isPremium
                ? 'Revisá tu estado de suscripción, accesos y beneficios incluidos.'
                : 'Podés empezar con el Plan Gratuito y pasar a Premium cuando quieras.'
            }}
          </p>
        </div>

        <div v-if="isPremium" class="pill">
          <span class="dot"></span>
          <span>Plan activo</span>
        </div>
      </header>

      <!-- NO PREMIUM: Planes -->
      <section v-if="!isPremium" class="plans">
        <article class="plan plan--free">
          <header class="plan-head">
            <div>
              <p class="plan-name">Plan Gratuito</p>
              <p class="plan-desc">
                Ideal para empezar a usar Nura y conocer las funciones principales.
              </p>
            </div>
            <p class="plan-price">$0 <span>/mes</span></p>
          </header>

          <ul class="benefits">
            <li><strong>Foro:</strong> Podés comentar, pero no crear publicaciones.</li>
            <li><strong>Diario:</strong> Hasta <strong>10 entradas por mes</strong>.</li>
            <li><strong>Chatbot:</strong> Hasta <strong>10 mensajes por día</strong>.</li>
            <li><strong>Contenido:</strong> Acceso a materiales generales.</li>
          </ul>

          
        </article>

        <article class="plan plan--premium">
          <header class="plan-head">
            <div>
              <p class="plan-name">Plan Premium</p>
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

          <button class="btn btn-primary btn-full" type="button" @click="goCheckout">
            Elegir Premium
          </button>
        </article>

        <button class="btn btn-soft btn-full" type="button" @click="goPerfil">
          Volver al perfil
        </button>
      </section>

      <!-- PREMIUM ACTIVO -->
      <section v-else class="active">
        <div class="grid">
          <!-- Estado suscripción -->
          <section class="card card--stack">
            <div>
              <h3 class="card-title">Estado de suscripción</h3>
              <p class="card-sub">La renovación es automática todos los meses.</p>

              <div class="kv">
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

            <div class="actions">
              <button class="btn btn-soft" type="button" @click="goPerfil">
                Volver al perfil
              </button>
              <button class="btn btn-danger" type="button" @click="openCancelModal">
                Darme de baja
              </button>
            </div>
          </section>

          <!-- Beneficios -->
          <section class="card">
            <h3 class="card-title">Beneficios incluidos</h3>
            <p class="card-sub">Acceso completo a herramientas y experiencias premium.</p>

            <ul class="benefits benefits--one">
              <li><strong>Foro:</strong> Crear + comentar sin límites.</li>
              <li><strong>Diario:</strong> Entradas ilimitadas.</li>
              <li><strong>Chatbot:</strong> Usos ilimitados.</li>
              <li>Videollamadas grupales semanales.</li>
              <li>Talleres exclusivos en vivo.</li>
              <li>Merch exclusivo.</li>
            </ul>
          </section>

          <!-- Shortcuts -->
          <section class="card card--wide">
            <h3 class="card-title">Accesos rápidos</h3>
            <p class="card-sub">
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

    <!-- MODAL CONFIRMAR BAJA -->
    <div v-if="showConfirmCancel" class="modal-backdrop" @click.self="closeCancelModal">
      <div class="modal-card">
        <h3>¿Darte de baja de Nura Premium?</h3>

        <p class="modal-text">
          Al darte de baja, vas a pasar al <strong>Plan Gratuito</strong>. La renovación automática se detiene
          para los próximos meses.
        </p>

        <p class="modal-text">
          El pago del período actual <strong>no es reembolsable</strong>, pero vas a conservar el acceso a las
          funciones Premium hasta que finalice tu ciclo vigente.
        </p>

        <p class="modal-text extra">
          Podés volver a suscribirte cuando quieras desde tu perfil.
        </p>

        <div class="modal-actions">
          <button type="button" class="btn btn-soft" @click="closeCancelModal" :disabled="cancelLoading">
            Seguir con Premium
          </button>
          <button type="button" class="btn btn-danger" @click="confirmCancelPremium" :disabled="cancelLoading">
            {{ cancelLoading ? 'Dando de baja…' : 'Sí, darme de baja' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL ÉXITO BAJA -->
    <div v-if="showSuccessModal" class="modal-backdrop" @click.self="closeSuccessModal">
      <div class="modal-card">
        <h3>Tu plan Premium fue cancelado</h3>

        <p class="modal-text">
          No se generarán nuevos cobros a partir del próximo ciclo.
          El período actual no se devuelve, pero vas a mantener beneficios Premium hasta su finalización.
        </p>

        <p class="modal-text extra">
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
.page {
  padding: 32px 16px 48px;
  background: #f5fbfd;
  min-height: calc(100dvh - 64px);
}

.container {
  max-width: 1180px;
  width: 100%;
  margin: 0 auto;
  display: grid;
  gap: 18px;
}

.head {
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

.title {
  margin: 0;
  font-size: 1.85rem;
  font-weight: 850;
  color: #0f172a;
}

.sub {
  margin: 8px 0 0;
  color: #475569;
  font-size: 1.02rem;
  max-width: 78ch;
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

.grid {
  display: grid;
  gap: 20px;
  align-items: stretch;
}

@media (min-width: 980px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}

.card {
  background: #ffffff;
  border-radius: 18px;
  padding: 26px 26px 22px;
  border: 1px solid #e2edf7;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
}

@media (min-width: 980px) {
  .card {
    min-height: 270px;
  }
}

.card--wide {
  grid-column: 1 / -1;
  min-height: 100px;
}

.card--stack {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 850;
  color: #0f172a;
}

.card-sub {
  margin: 8px 0 14px;
  font-size: 0.98rem;
  color: #64748b;
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
  font-size: 0.98rem;
}
.benefits li {
  margin-bottom: 10px;
}
.benefits li::marker {
  content: '✓ ';
  color: #50bdbd;
  font-weight: 900;
}
.benefits--one {
  columns: 1;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 18px;
}

.plans {
  display: grid;
  gap: 16px;
}
@media (min-width: 980px) {
  .plans {
    grid-template-columns: 1fr 1fr;
  }
}

.plan {
  border-radius: 18px;
  padding: 18px 18px 16px;
  border: 1px solid #e2edf7;
  background: #fff;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.06);
  display: grid;
  gap: 12px;
}

.plan--premium {
  background: linear-gradient(135deg, #e3f6fb, #f0f9ff);
}

.plan-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
}

.plan-name {
  margin: 0;
  font-weight: 900;
  color: #0f172a;
}

.plan-desc {
  margin: 6px 0 0;
  color: #334155;
  font-size: 0.98rem;
}

.plan-price {
  margin: 0;
  font-weight: 950;
  color: #0f172a;
}

.plan-price span {
  font-weight: 650;
  color: #64748b;
  font-size: 0.92rem;
  margin-left: 4px;
}

.btn {
  display: inline-flex;
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
  width: 100%;
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

.btn-danger {
  background: #ef5350;
  color: #fff;
  box-shadow: 0 3px 10px rgba(239, 83, 80, 0.3);
}
.btn-danger:hover {
  background: #e53935;
  transform: translateY(-1px);
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
  background: #ffffff;
  border-radius: 16px;
  padding: 16px 16px 14px;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
  transition: transform 0.12s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  min-height: 130px;
}
.shortcut:hover {
  transform: translateY(-1px);
  border-color: #9be9e0;
   background: #9be9e09a;
  box-shadow: 0 16px 34px rgba(80, 189, 189, 0.55);

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
.shortcut-cta {
  font-weight: 800;
  color: #50bdbd;
  border: 1px solid #b6ebe5;
  background: #e0faf7;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.85rem;
  white-space: nowrap;
}
.shortcut-desc {
  margin: 0;
  color: #64748b;
  font-size: 0.94rem;
  line-height: 1.35;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
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
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.35);
  border: 1px solid #e2edf7;
}
.modal-card h3 {
  margin: 0 0 8px;
  font-size: 1.15rem;
  color: #0f172a;
}
.modal-text {
  margin: 0 0 8px;
  font-size: 0.95rem;
  color: #4b5563;
}
.modal-text.extra {
  margin-top: 0;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
.modal-actions.single {
  justify-content: flex-end;
}

@media (max-width: 720px) {
  .head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
