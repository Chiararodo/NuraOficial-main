<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const email = ref('')
const cardNumber = ref('')
const expiry = ref('')
const cvv = ref('')
const terms = ref(false)
const errorMsg = ref('')
const loading = ref(false)

function goBack() {
  router.back()
}

function submit() {
  errorMsg.value = ''

  if (!email.value || !cardNumber.value || !expiry.value || !cvv.value) {
    errorMsg.value = 'Completá todos los datos para continuar.'
    return
  }

  if (!terms.value) {
    errorMsg.value = 'Tenés que aceptar los términos y condiciones.'
    return
  }

  loading.value = true

  // Solo simulamos el proceso de pago
  setTimeout(() => {
    loading.value = false
    router.push('/app/premium/confirmado')
  }, 700)
}
</script>

<template>
  <main class="premium-checkout">
    <header class="top">
      <button class="back-btn" type="button" @click="goBack">←</button>
      <h2>Premium</h2>
    </header>

    <section class="card">
      <div class="banner">
        <p class="banner-title">Suscribirte al plan premium</p>
        <p class="banner-sub">Precio: $10.000 por mes</p>
      </div>

      <div class="field">
        <label class="label">Email de confirmación</label>
        <input
          v-model="email"
          type="email"
          class="input"
          placeholder="tu@email.com"
        />
      </div>

      <div class="field">
        <label class="label">Número de tarjeta</label>
        <input
          v-model="cardNumber"
          type="text"
          class="input"
          placeholder="•••• •••• •••• ••••"
        />
      </div>

      <div class="grid">
        <div class="field">
          <label class="label">Fecha de vencimiento</label>
          <input
            v-model="expiry"
            type="text"
            class="input"
            placeholder="MM/AA"
          />
        </div>
        <div class="field">
          <label class="label">CVV</label>
          <input
            v-model="cvv"
            type="password"
            class="input"
            placeholder="•••"
          />
        </div>
      </div>

      <label class="terms">
        <input v-model="terms" type="checkbox" />
        <span>Acepto los términos y condiciones</span>
      </label>

      <p class="total">
        Total a pagar: <strong>$10.000</strong>
      </p>

      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

      <button
        class="primary-btn"
        type="button"
        :disabled="loading"
        @click="submit"
      >
        {{ loading ? 'Procesando…' : 'Continuar' }}
      </button>
    </section>
  </main>
</template>

<style scoped>
.premium-checkout {
  padding: 18px 16px 32px;
  min-height: calc(100dvh - 64px);
  background: #f5fbfd;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
}

.top {
  width: 100%;
  max-width: 540px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.top h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #0f172a;
}

.back-btn {
  border: none;
  background: #50bdbd;
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.2);
}

.card {
  width: 100%;
  max-width: 540px;
  background: #ffffff;
  border-radius: 20px;
  padding: 20px 18px 22px;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
  border: 1px solid #e2edf7;
  display: grid;
  gap: 12px;
  box-sizing: border-box;
}

.banner {
  background: #e3f6fb;
  border-radius: 12px;
  padding: 10px 12px;
}

.banner-title {
  margin: 0;
  font-weight: 700;
  color: #0f172a;
}

.banner-sub {
  margin: 2px 0 0;
  font-size: 0.9rem;
  color: #475569;
}

.field {
  display: grid;
  gap: 4px;
}

.label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #334155;
}

.input {
  border-radius: 12px;
  border: 1px solid #ccd7e2;
  padding: 0.55rem 0.9rem;
  font-size: 0.95rem;
  background: #f9fcff;
  width: 100%;
  box-sizing: border-box;
}

.grid {
  display: grid;
  gap: 10px;
}

@media (min-width: 520px) {
  .grid {
    grid-template-columns: 1.1fr 0.9fr;
  }
}

.terms {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #475569;
  margin-top: 2px;
}

.terms input {
  width: 16px;
  height: 16px;
}

.total {
  margin: 2px 0 0;
  font-size: 0.95rem;
  color: #1f2937;
}

.error-msg {
  margin: 4px 0 0;
  font-size: 0.9rem;
  color: #dc2626;
}

.primary-btn {
  margin-top: 6px;
  width: 100%;
  border: none;
  border-radius: 14px;
  padding: 0.65rem 1.2rem;
  font-size: 0.98rem;
  font-weight: 700;
  cursor: pointer;
  color: #ffffff;
  background: #50BDBD;
  box-shadow: 0 12px 26px rgba(91, 162, 204, 0.5);
}
.primary-btn:disabled {
  opacity: 0.7;
  cursor: progress;
}
</style>
