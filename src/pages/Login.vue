<template>
  <section class="login-page">
    <!-- Botón Instalar (solo desktop) -->
    <InstallButton class="install desktop-only" />

    <!-- Logo fuera del card -->
    <img
      src="/logos/OFICIALwhite.png"
      alt="Nura"
      class="brand"
      onerror="this.src='/icons/icon-192.png'"
    />

    <!-- Card -->
    <div class="card">
      <!-- OAuth -->
      <button class="btn btn-oauth facebook with-icon w-field" @click="oauth('facebook')" :disabled="loading">
        <img src="/logos/facebook.png" alt="" />
        Entrar con Facebook
      </button>

      <button class="btn btn-oauth google with-icon w-field" @click="oauth('google')" :disabled="loading">
        <img src="/logos/google.jpg" alt="" />
        Entrar con Google
      </button>

      <div class="divider w-field">o ingresá con</div>

      <!-- Email / Password -->
      <form class="form" @submit.prevent="emailLogin">
        <input
          class="w-field"
          v-model="email"
          type="email"
          placeholder="Usuario"
          required
          autocomplete="email"
        />
        <input
          class="w-field"
          v-model="password"
          type="password"
          placeholder="Contraseña"
          required
          autocomplete="current-password"
        />

        <a class="forgot" href="" @click.prevent="forgot">
          ¿Olvidaste tu contraseña?
        </a>

        <!-- Acciones -->
        <button type="submit" class="btn btn-primary w-actions" :disabled="loading">
          {{ loading ? 'Ingresando…' : 'Entrar' }}
        </button>
        <button type="button" class="btn btn-primary w-actions" @click="goRegister" :disabled="loading">
          Registrarse
        </button>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import InstallButton from '@/components/InstallButton.vue'
import { supabase } from '@/composables/useSupabase'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)

async function emailLogin() {
  try {
    loading.value = true
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    })
    if (error) throw error

    // Refrescar sesión y navegar (el guard te manda a onboarding si corresponde)
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
      options: { redirectTo: window.location.origin + '/app/home' },
    })
    if (error) throw error
    // Para OAuth Supabase redirige; no hacemos nada más aquí.
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
    const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
      redirectTo: window.location.origin + '/login',
    })
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

<style scoped>
/* ===== Fondo (igual al splash) ===== */
.login-page {
  min-height: 100dvh;
  background: url('/bgs/splash.png') center/cover no-repeat;
  display: grid;
  grid-template-rows: auto 1fr;
  justify-items: center;
  align-items: start;
  padding: 48px 16px 32px;
}

/* ===== Logo fuera del card ===== */
.brand {
  width: 150px;
  height: auto;
  margin-bottom: 18px;
  filter: drop-shadow(0 2px 4px #0002);
}

/* ===== Card ===== */
.card {
  width: 100%;
  max-width: 500px;
  background: #fff;
  border-radius: 90px;
  padding: 28px 16px 34px;
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.22);
}

/* Anchuras helper */
:root, :host {
  --field-w: 50%;
  --actions-w: 40%;
}
.w-field, .w-actions { display: block; margin-left: auto; margin-right: auto; }
.w-field   { width: var(--field-w); }
.w-actions { width: var(--actions-w); }

/* Inputs */
input {
  padding: 0.7rem 0.9rem;
  margin: 0.45rem auto;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  font-size: 0.92rem;
  outline: none;
}
input:focus {
  border-color: #85b6e0;
  box-shadow: 0 0 0 3px rgba(133,182,224,.22);
}

/* Separador */
.divider { text-align: center; opacity: .75; margin: 12px auto 8px; font-size: .92rem; }

/* Forgot */
.forgot {
  display: block; text-align: center; margin: 6px auto 14px;
  color: #85b6e0; font-size: .9rem; text-decoration: none;
}
.forgot:hover { text-decoration: underline; }

/* Botones */
.btn {
  border: none; border-radius: 16px; padding: .62rem .9rem; font-weight: 600;
  cursor: pointer; transition: .2s ease; display: flex; align-items: center; justify-content: center;
  gap: 10px; box-shadow: 0 6px 18px rgba(0,0,0,.18); margin: .5rem auto;
}
.btn:disabled { opacity: .6; cursor: not-allowed; }

/* Primarios */
.btn-primary { background: #85b6e0; color: #fff; }
.btn-primary:hover { background: #50bdbd; }

/* OAuth */
.btn-oauth.with-icon img { width: 18px; height: 18px; object-fit: contain; }
.btn-oauth.facebook { background: #1877f2; color: #fff; }
.btn-oauth.facebook:hover { filter: brightness(.95); }
.btn-oauth.google { background: #fff; color: #2b2b2b; border: 1px solid #d1d5db; box-shadow: none; }
.btn-oauth.google:hover { background: #fafafa; }

/* Instalar (desktop) */
.install { position: fixed; top: 14px; right: 14px; z-index: 5; }
.desktop-only { display: none; }
@media (min-width: 900px) { .desktop-only { display: inline-flex; } }
</style>
