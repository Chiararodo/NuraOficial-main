<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import InstallButton from '@/components/InstallButton.vue'
import { supabase } from '@/composables/useSupabase'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)

async function ensureProfileForUser(user: any) {
  // Por si el nombre se guardó en metadata en el onboarding
  const metaName =
    (user.user_metadata as any)?.name?.trim() ||
    user.email?.split('@')[0] ||
    null
  const metaAvatar =
    (user.user_metadata as any)?.avatar_url || null

  const { data: existing } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!existing) {
    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: metaName,
      name: metaName,
      avatar_url: metaAvatar
    })
  } else if (!existing.full_name && metaName) {
    await supabase
      .from('profiles')
      .update({
        full_name: metaName,
        name: metaName
      })
      .eq('id', user.id)
  }
}

async function emailLogin() {
  try {
    loading.value = true
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value
    })
    if (error) throw error

    // Aseguramos perfil con nombre para foro/perfil público
    const { data: userRes } = await supabase.auth.getUser()
    if (userRes?.user) {
      await ensureProfileForUser(userRes.user)
    }

    await supabase.auth.refreshSession()
    window.location.replace('/app/home')
  } catch (e: any) {
    alert(e?.message ?? 'No pudimos iniciar sesión.')
  } finally {
    loading.value = false
  }
}

async function oauth(provider: 'google' | 'facebook') {
  try {
    loading.value = true
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + '/app/home' }
    })
    if (error) throw error
  } catch (e: any) {
    alert(e?.message ?? 'No pudimos iniciar con el proveedor seleccionado.')
  } finally {
    loading.value = false
  }
}

async function forgot() {
  if (!email.value.trim()) {
    alert('Ingresá tu email primero.')
    return
  }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.value.trim(),
      {
        redirectTo: window.location.origin + '/login'
      }
    )
    if (error) throw error
    alert('Te enviamos un correo para recuperar tu contraseña.')
  } catch (e: any) {
    alert(e?.message ?? 'No pudimos enviar el correo. Intentá nuevamente.')
  }
}

function goRegister() {
  router.push('/register')
}
</script>

<template>
  <h1 class="visually-hidden">Login</h1>
  <section class="login-page">
    <!-- Logo -->
    <img
      src="/logos/OFICIALwhite.png"
      alt="Nura"
      class="brand"
      onerror="this.src='/icons/icon-192.png'"
    />

    <!-- Card -->
    <div class="card">
      <!-- OAuth -->
      <button
        class="btn btn-oauth facebook with-icon w-field"
        @click="oauth('facebook')"
        :disabled="loading"
      >
        <img src="/logos/facebook.png" alt="" />
        Entrar con Facebook
      </button>

      <button
        class="btn btn-oauth google with-icon w-field"
        @click="oauth('google')"
        :disabled="loading"
      >
        <img src="/logos/google.jpg" alt="" />
        Entrar con Google
      </button>

      <div class="divider w-field">o ingresá con</div>

      <!-- Email / Password -->
      <form class="form" @submit.prevent="emailLogin">
        <div class="field w-field">
          <label for="login-email">Usuario</label>
          <input
            id="login-email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            aria-label="Usuario (email)"
          />
        </div>

        <div class="field w-field">
          <label for="login-password">Contraseña</label>
          <input
            id="login-password"
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            aria-label="Contraseña"
          />
        </div>

        <a class="forgot" href="" @click.prevent="forgot">
          ¿Olvidaste tu contraseña?
        </a>

        <!-- Acciones -->
        <button
          type="submit"
          class="btn btn-primary w-actions"
          :disabled="loading"
        >
          {{ loading ? 'Ingresando…' : 'Entrar' }}
        </button>
        <button
          type="button"
          class="btn btn-primary w-actions"
          @click="goRegister"
          :disabled="loading"
        >
          Registrarse
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.login-page {
  min-height: 100dvh;
  background: url('/bgs/splash.png') center/cover no-repeat;
  display: grid;
  grid-template-rows: auto 1fr;
  justify-items: center;
  align-items: start;
  padding: 48px 16px 32px;
}

/* ===== Logo ===== */
.brand {
  width: 150px;
  height: auto;
  margin-bottom: 18px;
  filter: drop-shadow(0 2px 4px #0002);
}

/* ===== Card ===== */
.card {
 width: 100%;
  max-width: 540px;
  background: #ffffff;
  border-radius: 60px;
  padding: 28px 20px 34px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.2);
}

.form {
  padding: 0px 36px 4px;
}

/* Helpers de ancho */
:root,
:host {
  --field-w: 60%;
  --actions-w: 40%;
}
.w-field,
.w-actions {
  display: block;
  margin-left: auto;
  margin-right: auto;
}
.w-field {
  width: var(--field-w);
}
.w-actions {
  width: var(--actions-w);
}

/* Campos con label */
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0.45rem auto;
}

.field label {
  font-size: 0.93rem;
  font-weight: 600;
  color: #000000ff;
   padding: 0.62rem 0.3rem;
}

/* Inputs */
.field input {
  padding: 0.7rem 0.9rem;
  border-radius: 12px;
  border: 1px solid #ccd7e2;
  font-size: 0.92rem;
  outline: none;
  width: 93%;
  background: #f9fcff;
}

.field input:focus {
  border-color: #50bdbd;
  box-shadow: 0 0 0 3px rgba(80, 189, 189, 0.22);
}

/* Separador */
.divider {
  text-align: center;
  opacity: 0.75;
  margin: 12px auto 8px;
  font-size: 0.92rem;
}

/* Forgot */
.forgot {
  display: block;
  text-align: center;
  margin: 6px auto 14px;
  color: #85b6e0;
  font-size: 0.9rem;
  text-decoration: none;
   padding: 0.62rem 0.9rem;
}
.forgot:hover {
  text-decoration: underline;
}

/* Botones */
.btn {
  border: none;
  border-radius: 16px;
  padding: 0.62rem 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  margin: 0.5rem auto;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Primarios (Entrar / Registrarse) – VERDE NURA */

.btn {
  width: 74%;
  border: none;
  border-radius: 999px;
  padding: 0.75rem 1rem;
  background: #50bdbd;
  color: #ffffff;
  font-weight: 600;
  font-size: 0.98rem;
  text-align: center;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(80, 189, 189, 0.35);
  transition: background 0.15s ease, transform 0.08s ease,
    box-shadow 0.15s ease;
}

.btn:hover{
  background: #a9873eff;
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(80, 189, 189, 0.4);
}
.btn-primary {
  background: #50bdbd;
  color: #fff;
}
.btn-primary:hover {
  background: #3ea9a9;
}



/* OAuth */

.btn-oauth.with-icon img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}
.btn-oauth.facebook {
  background: #1877f2;
  color: #fff;
}
.btn-oauth.facebook:hover {
  filter: brightness(0.95);
}
.btn-oauth.google {
  background: #fff;
  color: #2b2b2b;
  border: 1px solid #d1d5db;
  box-shadow: none;
  
}
.btn-oauth.google:hover {
  background: #fafafa;
}

/* Visually hidden */
.visually-hidden {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
</style>
