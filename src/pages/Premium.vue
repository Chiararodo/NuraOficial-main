<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const isPremium = computed(
  () => localStorage.getItem('nura_is_premium') === 'true',
)

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
  router.push('/app/premium/checkout')
}

function goPerfil() {
  router.push('/app/perfil')
}

function cancelPremium() {
  const ok = confirm('¿Seguro que querés darte de baja del plan Premium?')
  if (!ok) return

  localStorage.removeItem('nura_is_premium')
  localStorage.removeItem('nura_premium_subscribed_at')
  localStorage.removeItem('nura_premium_next_payment')

  alert('Tu suscripción a Premium fue cancelada (modo demo).')
  router.push('/app/perfil')
}


function editarPrivacidad() {
  // antes era un alert
  router.push('/app/privacidad')
}

function editarIdioma() {
  // antes era un alert
  router.push('/app/idioma')
}



</script>

<template>
  <main class="premium-page">
    <section class="premium-layout">
      <div class="premium-card">
        <template v-if="!isPremium">
          <p class="eyebrow">Premium</p>
          <p class="price">
            $10.000
            <span class="price-sub">/mes</span>
          </p>

          <div class="plan-pill">Plan Premium</div>

          <p class="lead">
            Accedé a herramientas avanzadas para acompañar tu bienestar
            emocional día a día:
          </p>

          <ul class="benefits">
            <li>Videollamadas grupales semanales</li>
            <li>Sesiones individuales personalizadas</li>
            <li>Talleres exclusivos en vivo</li>
            <li>Historial de progreso visual</li>
            <li>Descuentos en consultas presenciales</li>
          </ul>

          <p class="note">¡No te lo pierdas!</p>

          <button class="cta-btn" type="button" @click="goCheckout">
            Elegí este plan
          </button>
        </template>

        <template v-else>
          <p class="eyebrow">Plan activo</p>
          <p class="price">
            Nura
            <span class="price-sub">Premium</span>
          </p>

          <div class="plan-pill plan-pill--active">Actualmente suscripta</div>

          <div class="status-box">
            <p class="status-line" v-if="premiumSinceLabel">
              Suscripta desde: <strong>{{ premiumSinceLabel }}</strong>
            </p>
            <p class="status-line" v-if="nextPaymentLabel">
              Próximo pago: <strong>{{ nextPaymentLabel }}</strong>
            </p>
            <p class="status-hint">
              La renovación es automática todos los meses (modo demo).
            </p>
          </div>

          <div class="btn-row">
            <button class="secondary-btn" type="button" @click="goPerfil">
              Volver al perfil
            </button>
            <button class="danger-btn" type="button" @click="cancelPremium">
              Darme de baja
            </button>
          </div>
        </template>
      </div>

      <div class="mascot">
        <div class="mascot-circle">
          <span class="mascot-emoji">💙</span>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.premium-page {
  padding: 24px 16px 32px;
  background: #f5fbfd;
  min-height: calc(100dvh - 64px);
}

.premium-layout {
  max-width: 960px;
  margin: 0 auto;
  display: grid;
  gap: 24px;
  align-items: center;
}

@media (min-width: 900px) {
  .premium-layout {
    grid-template-columns: 1.2fr 0.8fr;
  }
}

.premium-card {
  background: #ffffff;
  border-radius: 22px;
  padding: 22px 20px 20px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08);
  border: 1px solid #e2edf7;
}

.eyebrow {
  margin: 0 0 4px;
  font-size: 0.9rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #64748b;
}

.price {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
  color: #0f172a;
}

.price-sub {
  font-size: 0.9rem;
  font-weight: 500;
  color: #6b7280;
  margin-left: 4px;
}

.plan-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 6px 14px;
  margin: 10px 0 12px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #ffffff;
  background: #50bdbd;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.4);
}

.plan-pill--active {
  background: #0a8888ff;
}

.lead {
  margin: 0 0 10px;
  color: #1f2933;
  font-size: 0.98rem;
}

.benefits {
  margin: 0 0 12px;
  padding-left: 20px;
  color: #334155;
  font-size: 0.95rem;
}

.benefits li {
  margin-bottom: 6px;
}

.benefits li::marker {
  content: '✓ ';
  color: #50bdbd;
  font-weight: 700;
}

.note {
  margin: 0 0 14px;
  font-weight: 600;
  color: #2563eb;
  font-size: 0.95rem;
}

/* Estado activo */
.status-box {
  margin-top: 8px;
  padding: 10px 12px;
  background: #f1f5f9;
  border-radius: 14px;
}

.status-line {
  margin: 0 0 4px;
  font-size: 0.93rem;
  color: #111827;
}

.status-hint {
  margin: 4px 0 0;
  font-size: 0.85rem;
  color: #6b7280;
}

.btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.secondary-btn,
.danger-btn {
  flex: 1 1 0;
  border-radius: 999px;
  padding: 0.55rem 1rem;
  font-size: 0.9rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
}

.secondary-btn {
  background: #e0f2fe;
  color: #0f172a;
}

.danger-btn {
  background: #ef4444;
  color: #ffffff;
}

/* CTA */
.cta-btn {
  width: 100%;
  border: none;
  border-radius: 999px;
  padding: 0.7rem 1.2rem;
  font-size: 0.98rem;
  font-weight: 700;
  cursor: pointer;
  color: #ffffff;
  background: #50BDBD;
  box-shadow: 0 12px 26px rgba(91, 162, 204, 0.5);
}

/* Mascota */
.mascot {
  display: flex;
  justify-content: center;
}

.mascot-circle {
  width: 200px;
  height: 200px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 20%, #ffffff, #a6e7ea);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.2);
}

.mascot-emoji {
  font-size: 4rem;
}
</style>
