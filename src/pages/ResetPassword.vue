<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/composables/useSupabase'

const router = useRouter()

const password = ref('')
const passwordConfirm = ref('')

const loading = ref(false)
const errorMsg = ref('')
const success = ref(false)

async function handleSubmit() {
  if (loading.value || success.value) return

  errorMsg.value = ''

  if (!password.value || !passwordConfirm.value) {
    errorMsg.value = 'Completá ambos campos.'
    return
  }
  if (password.value.length < 6) {
    errorMsg.value = 'La contraseña debe tener al menos 6 caracteres.'
    return
  }
  if (password.value !== passwordConfirm.value) {
    errorMsg.value = 'Las contraseñas no coinciden.'
    return
  }

  loading.value = true

  const { error } = await supabase.auth.updateUser({
    password: password.value
  })

  loading.value = false

  if (error) {
    console.error(error)

    const msg = error.message.toLowerCase()

    if (msg.includes('expired') || msg.includes('invalid')) {
      errorMsg.value =
        'Este enlace ya venció o no es válido. Volvé a pedir un email de cambio de contraseña desde tu perfil.'
    } else if (msg.includes('same as')) {
      errorMsg.value =
        'La nueva contraseña no puede ser igual a la anterior. Probá con otra distinta.'
    } else {
      errorMsg.value =
        'No pudimos guardar la nueva contraseña. Probá de nuevo o pedí otro enlace.'
    }
    return
  }

  success.value = true
  password.value = ''
  passwordConfirm.value = ''
}

function goLogin() {
  router.push('/login')
}

function goHome() {
  router.push('/')
}
</script>

<template>
  <main class="reset-page">
    <div class="reset-shell">
      <div class="logo-pill">

        <img
  src="
https://dfjdulbonssbzgkkvlep.supabase.co/storage/v1/object/public/nura-content/avatars/logo.png"
  alt="Nura"
  width="120"
  style="display:block;border:0;outline:none;text-decoration:none;margin:0 auto 14px;"
/>


        <img src="/logos/OFICIALwhite.png" alt="Nura" class="logo-img" />
      </div>

      <section class="reset-card" v-if="!success">
        <header class="reset-header">
          <h1>Cambiar contraseña</h1>
          <p>
            Ingresá tu nueva contraseña y confirmala para completar el cambio
            de manera segura.
          </p>
        </header>

        <form class="reset-form" @submit.prevent="handleSubmit">
          <label class="field-label" for="new-password">
            Nueva contraseña
          </label>
          <input
            id="new-password"
            v-model="password"
            type="password"
            class="field-input"
            autocomplete="new-password"
            placeholder="Mínimo 6 caracteres"
            aria-label="Nueva contraseña"
          />

          <label class="field-label" for="new-password-confirm">
            Confirmar nueva contraseña
          </label>
          <input
            id="new-password-confirm"
            v-model="passwordConfirm"
            type="password"
            class="field-input"
            autocomplete="new-password"
            placeholder="Repetí la nueva contraseña"
            aria-label="Confirmar nueva contraseña"
          />

          <p v-if="errorMsg" class="msg msg-error">
            {{ errorMsg }}
          </p>

          <button
            type="submit"
            class="primary-btn"
            :disabled="loading"
          >
            {{ loading ? 'Guardando…' : 'Guardar nueva contraseña' }}
          </button>
        </form>

        <p class="helper-text">
          Si no pediste este cambio, podés ignorar el email y mantener tu
          contraseña actual.
        </p>

        <button type="button" class="link-btn" @click="goHome">
          Volver al inicio
        </button>
      </section>

      <!-- PANTALLA DE ÉXITO -->
      <section class="reset-card reset-card--success" v-else>
        <div class="success-icon-wrap">
          <div class="success-circle">
            <span class="success-check">✔</span>
          </div>
        </div>

        <h1 class="success-title">Contraseña actualizada</h1>
        <p class="success-text">
          Tu contraseña se cambió correctamente. La próxima vez que inicies
          sesión, usá tu nueva contraseña.
        </p>

        <div class="success-actions">
          <button type="button" class="primary-btn" @click="goLogin">
            Iniciar sesión
          </button>
          <button type="button" class="link-btn" @click="goHome">
            Volver al inicio
          </button>
        </div>
      </section>
    </div>
  </main>
</template>


<style scoped>
.reset-page {
  min-height: 100vh;
   background: url('/bgs/splash.png') center/cover no-repeat;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 40px 16px;
}

.reset-shell {
  width: 100%;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

/* logo pill */


.logo-img {
  width: 92px;
  height: 70px;
}

/* card */
.reset-card {
  width:90%;
  border-radius: 26px;
  background: #ffffff;
  padding: 26px 26px 22px;
  box-shadow: 0 22px 48px rgba(15, 23, 42, 0.18);
  border: 1px solid #dbeaf1;
}

.reset-header h1 {
  margin: 0 0 6px;
  font-size: 1.6rem;
  color: #0f172a;
}

.reset-header p {
  margin: 0;
  font-size: 0.96rem;
  color: #4b5563;
}

/* form */
.reset-form {
  margin-top: 18px;
  display: grid;
  gap: 10px;
}

.field-label {
  font-size: 0.88rem;
  font-weight: 600;
  color: #374151;
}

.field-input {
  border-radius: 999px;
  border: 1px solid #d1e2eb;
  padding: 10px 14px;
  font-size: 0.95rem;
  background: #f5fbff;
  outline: none;
  transition: border-color 0.16s ease, box-shadow 0.16s ease,
    background-color 0.16s ease;
}

.field-input:focus {
  border-color: #50bdbd;
  background: #ecfdf7;
  box-shadow: 0 0 0 2px rgba(80, 189, 189, 0.22);
}

/* buttons & messages */
.primary-btn {
  margin-top: 8px;
  width: 100%;
  border-radius: 999px;
  border: none;
  background: #50bdbd;
  color: #ffffff;
  padding: 11px 16px;
  font-size: 0.96rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 12px 26px rgba(80, 189, 189, 0.45);
  transition: background 0.18s ease, transform 0.08s ease,
    box-shadow 0.18s ease;
}

.primary-btn:hover:not(:disabled) {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 16px 34px rgba(80, 189, 189, 0.55);
}

.primary-btn:disabled {
  opacity: 0.7;
  cursor: default;
  transform: none;
  box-shadow: none;
}

.link-btn {
   margin-top: 10px;
  background: #50bdbd;
  border: none;
  color: #fff;
  border-radius: 999px;
  cursor: pointer;
 font-size: 0.96rem;
  font-weight: 700;
}

.link-btn:hover {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 16px 34px rgba(80, 189, 189, 0.55);
}

.msg {
  margin: 4px 0 0;
  font-size: 0.86rem;
}

.msg-error {
  color: #dc2626;
}

/* helper */
.helper-text {
  margin: 14px 0 0;
  font-size: 0.86rem;
  color: #6b7280;
}

/* éxito */
.reset-card--success {
  text-align: center;
}

.success-icon-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.success-circle {
  width: 80px;
  height: 80px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 20%, #ffffff, #50bdbd);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 14px 32px rgba(80, 189, 189, 0.6);
  animation: pop-in 0.45s ease-out;
}

.success-check {
  font-size: 2.4rem;
  color: #ffffff;
  transform: translateY(1px);
}

.success-title {
  margin: 10px 0 4px;
  font-size: 1.5rem;
  color: #0f172a;
}

.success-text {
  margin: 0 0 16px;
  font-size: 0.96rem;
  color: #4b5563;
}

.success-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

/* animation */
@keyframes pop-in {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  60% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}

@media (max-width: 640px) {
  .reset-card {
    padding-inline: 18px;
    width: 90% ;
  }
}
</style>
