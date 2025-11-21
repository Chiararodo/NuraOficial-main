<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const wantsReminder = ref(true)

// Guardamos la suscripción “fake” en localStorage (solo frontend)
onMounted(() => {
  const now = new Date()
  const next = new Date(now)
  next.setMonth(next.getMonth() + 1)

  localStorage.setItem('nura_is_premium', 'true')
  localStorage.setItem('nura_premium_subscribed_at', now.toISOString())
  localStorage.setItem('nura_premium_next_payment', next.toISOString())
})

function goHome() {
  router.push('/app/perfil')
}
</script>

<template>
  <main class="premium-confirm">
    <section class="card">
      <p class="highlight">¡Suscripción confirmada!</p>

      <div class="hero">
        <p class="hero-title">
          Ya sos parte del Plan
          <br />
          <strong>Premium</strong>.<br />
          <span class="hero-sub">¡Bienvenido!</span>
        </p>
      </div>

      <p class="text">
        Ya podés acceder a todos los beneficios exclusivos de Nura Premium.
      </p>

      <!-- Recordatorio mensual -->
      <label class="reminder">
        <input v-model="wantsReminder" type="checkbox" />
        <div class="reminder-check">
          <span v-if="wantsReminder">✓</span>
        </div>
        <div class="reminder-text">
          <p class="reminder-title">Agregar recordatorio en calendario</p>
          <p class="reminder-sub">para pagar cada mes</p>
        </div>
      </label>

      <p class="reminder-foot" v-if="wantsReminder">
        Recordatorio mensual activado. 💡
      </p>
      <p class="reminder-foot" v-else>
        Podés activar el recordatorio cuando quieras. 🙂
      </p>

      <div class="mascot-wrap">
        <div class="mascot-circle">
          <span class="mascot-emoji">💙</span>
        </div>
      </div>

      <button class="primary-btn" type="button" @click="goHome">
        Volver al home
      </button>
    </section>
  </main>
</template>

<style scoped>
.premium-confirm {
  padding: 24px 16px 32px;
  min-height: calc(100dvh - 64px);
  background: #f5fbfd;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card {
  width: 100%;
  max-width: 520px;
  background: #ffffff;
  border-radius: 22px;
  padding: 22px 20px 22px;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.1);
  border: 1px solid #e2edf7;
  text-align: center;
}

.highlight {
  margin: 0 0 12px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #50bdbd;
}

.hero {
  background: #e3f6fb;
  border-radius: 18px;
  padding: 16px 14px;
  margin-bottom: 14px;
}

.hero-title {
  margin: 0;
  font-size: 1.05rem;
  color: #0f172a;
  line-height: 1.4;
}

.hero-title strong {
  font-weight: 800;
}

.hero-sub {
  font-weight: 700;
}

.text {
  margin: 6px 0 16px;
  font-size: 0.95rem;
  color: #475569;
}

/* Recordatorio */
.reminder {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f1f5f9;
  border-radius: 14px;
  padding: 10px 12px;
  margin: 0 auto 8px;
  max-width: 420px;
  cursor: pointer;
  text-align: left;
}

.reminder input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.reminder-check {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #beedf3ff;
  color: #50bdbd;
  font-size: 1.3rem;
  flex-shrink: 0;
  transition: background 0.15s ease, transform 0.12s ease;
}

.reminder:hover .reminder-check {
  transform: translateY(-1px);
}

.reminder-text {
  display: flex;
  flex-direction: column;
}

.reminder-title {
  margin: 0;
  font-size: 0.93rem;
  font-weight: 600;
  color: #0f172a;
}

.reminder-sub {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: #64748b;
}

.reminder-foot {
  margin: 0 0 14px;
  font-size: 0.85rem;
  color: #6b7280;
}

/* Mascota */
.mascot-wrap {
  margin: 8px 0 16px;
  display: flex;
  justify-content: center;
}

.mascot-circle {
  width: 120px;
  height: 120px;
  border-radius: 999px;
  background: #50BDBD;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.2);
}

.mascot-emoji {
  font-size: 3rem;
}

/* Botón */
.primary-btn {
  width: 100%;
  max-width: 420px;
  border: none;
  border-radius: 14px;
  padding: 0.65rem 1.2rem;
  font-size: 0.98rem;
  font-weight: 700;
  cursor: pointer;
  color: #ffffff;
  background: #50bdbd;
  box-shadow: 0 12px 26px rgba(91, 162, 204, 0.5);
  margin: 0 auto;
}

.primary-btn:hover {
  background: #56bfcf;
  transform: translateY(-1px);
} 

</style>
