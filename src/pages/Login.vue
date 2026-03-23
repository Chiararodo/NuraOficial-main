<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '@/composables/useSupabase'
import Footer from '@/components/Footer.vue'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)

const formError = ref('')
const formInfo = ref('')

const blockedMsg = computed(() => route.query.blocked === '1')
const deletedMsg = computed(() => route.query.deleted === '1')

type Provider = 'google' | 'facebook'

function clearMessages() {
  formError.value = ''
  formInfo.value = ''
}

async function ensureProfileForUser(user: any) {
  const metaName =
    (user.user_metadata as any)?.name?.trim() ||
    user.email?.split('@')[0] ||
    null

  const metaAvatar = (user.user_metadata as any)?.avatar_url || null

  const { data: existing, error: existingErr } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (existingErr) {
    console.warn('ensureProfileForUser: error leyendo profile', existingErr)
    return
  }

  if (!existing) {
    const { error: upsertErr } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: metaName,
      name: metaName,
      avatar_url: metaAvatar
    })

    if (upsertErr) {
      console.warn('ensureProfileForUser: error upsert', upsertErr)
    }
  } else if (!existing.full_name && metaName) {
    const { error: updErr } = await supabase
      .from('profiles')
      .update({ full_name: metaName, name: metaName })
      .eq('id', user.id)

    if (updErr) {
      console.warn('ensureProfileForUser: error update', updErr)
    }
  }
}

async function checkUserStatus(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('blocked, blocked_reason, deleted_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.warn('checkUserStatus error', error)
    return {
      blocked: false,
      reason: '',
      deleted: false
    }
  }

  return {
    blocked: !!data?.blocked,
    reason: data?.blocked_reason || '',
    deleted: !!data?.deleted_at
  }
}

onMounted(async () => {
  clearMessages()

  const { data } = await supabase.auth.getSession()
  const user = data?.session?.user

 if (user) {
  const { data: userCheck, error: userCheckError } = await supabase.auth.getUser()

  if (userCheckError || !userCheck?.user) {
    await supabase.auth.signOut()
    return
  }

  await ensureProfileForUser(user)

  const status = await checkUserStatus(user.id)

    if (status.deleted) {
      await supabase.auth.signOut()
      formError.value =
        'Esta cuenta fue desactivada por administración. Si creés que es un error, contactanos.'
      return
    }

    if (status.blocked) {
      await supabase.auth.signOut()
      formError.value = status.reason
        ? `Tu cuenta está bloqueada: ${status.reason}`
        : 'Tu cuenta está bloqueada.'
      return
    }

    router.replace('/app/home')
  }
})

async function emailLogin() {
  clearMessages()

  const cleanEmail = email.value.trim()

  if (!cleanEmail || !password.value) {
    formError.value = 'Completá tu email y contraseña.'
    return
  }

  try {
    loading.value = true

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password.value
    })

    if (error) throw error

    const { data: userRes } = await supabase.auth.getUser()

if (!userRes?.user) {
  await supabase.auth.signOut()
  formError.value = 'Esta cuenta ya no existe.'
  return
}

    if (userRes?.user) {
      await ensureProfileForUser(userRes.user)

      const status = await checkUserStatus(userRes.user.id)

      if (status.deleted) {
        await supabase.auth.signOut()
        formError.value =
          'Esta cuenta fue desactivada por administración. Si creés que es un error, contactanos.'
        return
      }

      if (status.blocked) {
        await supabase.auth.signOut()
        formError.value = status.reason
          ? `Tu cuenta está bloqueada: ${status.reason}`
          : 'Tu cuenta está bloqueada.'
        return
      }
    }

    router.replace('/app/home')
  } catch (e: any) {
    formError.value = e?.message ?? 'No pudimos iniciar sesión.'
  } finally {
    loading.value = false
  }
}

async function oauth(provider: Provider) {
  clearMessages()

  try {
    loading.value = true

    const redirectTo = `${window.location.origin}/login`

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo }
    })

    if (error) throw error
  } catch (e: any) {
    formError.value =
      e?.message ?? 'No pudimos iniciar con el proveedor seleccionado.'
    loading.value = false
  }
}

async function forgot() {
  clearMessages()

  const cleanEmail = email.value.trim()

  if (!cleanEmail) {
    formError.value = 'Ingresá tu email primero para recuperar la contraseña.'
    return
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })

    if (error) throw error

    formInfo.value = 'Te enviamos un correo para recuperar tu contraseña.'
  } catch (e: any) {
    formError.value =
      e?.message ?? 'No pudimos enviar el correo. Intentá nuevamente.'
  }
}

function goRegister() {
  router.push('/register')
}
</script>

<template>
  <div class="login-layout">
    <h1 class="visually-hidden">Iniciar sesión en Nura</h1>

    <main class="login-page">
      <img
        src="/logos/OFICIALwhite.png"
        alt="Nura"
        class="brand"
        @error="(e: any) => (e.target.src = '/icons/icon-192.png')"
      />

      <section class="card" aria-labelledby="login-title">
        <h2 id="login-title" class="card-title">Iniciar sesión</h2>

        <p v-if="formError" class="message message-error" role="alert">
          {{ formError }}
        </p>

        <p v-if="blockedMsg" class="message message-error" role="alert">
          Tu cuenta está bloqueada. Si creés que es un error, contactá al administrador.
        </p>

        <p v-if="deletedMsg" class="message message-error" role="alert">
  No podés volver a entrar porque tu cuenta fue eliminada por administración.
</p>

        <p v-if="formInfo" class="message message-info" role="status">
          {{ formInfo }}
        </p>

        <button
          class="btn btn-oauth btn-facebook oauth-btn"
          type="button"
          @click="oauth('facebook')"
          :disabled="loading"
        >
          <img src="/logos/facebook.png" alt="" aria-hidden="true" />
          <span>Entrar con Facebook</span>
        </button>

        <button
          class="btn btn-oauth btn-google oauth-btn"
          type="button"
          @click="oauth('google')"
          :disabled="loading"
        >
          <img src="/logos/google.jpg" alt="" aria-hidden="true" />
          <span>Entrar con Google</span>
        </button>

        <div class="divider">o ingresá con</div>

        <form class="form" @submit.prevent="emailLogin" novalidate>
          <div class="field">
            <label for="login-email">Usuario</label>
            <input
              id="login-email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              aria-label="Usuario (email)"
              @input="clearMessages"
            />
          </div>

          <div class="field">
            <label for="login-password">Contraseña</label>
            <input
              id="login-password"
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              aria-label="Contraseña"
              @input="clearMessages"
            />
          </div>

          <button
            type="button"
            class="forgot"
            @click="forgot"
          >
            ¿Olvidaste tu contraseña?
          </button>

          <button
            type="submit"
            class="btn btn-primary action-btn"
            :disabled="loading"
          >
            {{ loading ? 'Ingresando…' : 'Entrar' }}
          </button>

          <button
            type="button"
            class="btn btn-secondary action-btn"
            @click="goRegister"
            :disabled="loading"
          >
            Registrarse
          </button>
        </form>
      </section>
    </main>
  </div>
</template>

<style scoped>
.login-layout {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: url('/bgs/splash.png') center / cover no-repeat;
}

.login-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

.brand {
  width: 150px;
  height: auto;
  margin-bottom: 18px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.12));
}

.card {
  width: 100%;
  max-width: 540px;
  background: #ffffff;
  border-radius: 42px;
  padding: 28px 24px 32px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
}

.card-title {
  margin: 0 0 16px;
  text-align: center;
  font-size: 1.35rem;
  color: #183153;
}

.message {
  width: 100%;
  max-width: 360px;
  margin: 0 auto 12px;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 0.93rem;
  line-height: 1.35;
  box-sizing: border-box;
}

.message-error {
  background: #fff1f2;
  color: #b42318;
  border: 1px solid #fecdd3;
}

.message-info {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.form {
  max-width: 360px;
  margin: 0 auto;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.field label {
  font-size: 0.93rem;
  font-weight: 600;
  color: #111827;
}

.field input {
  width: 100%;
  min-height: 46px;
  padding: 0.7rem 0.9rem;
  border-radius: 12px;
  border: 1px solid #ccd7e2;
  font-size: 0.95rem;
  outline: none;
  background: #f9fcff;
  box-sizing: border-box;
}

.field input:focus {
  border-color: #50bdbd;
  box-shadow: 0 0 0 3px rgba(80, 189, 189, 0.22);
}

.divider {
  width: 100%;
  max-width: 360px;
  margin: 14px auto 12px;
  text-align: center;
  opacity: 0.78;
  font-size: 0.92rem;
}

.forgot {
  display: block;
  margin: 4px auto 16px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #4f8fc4;
  font-size: 0.92rem;
  text-decoration: underline;
  cursor: pointer;
}

.btn {
  width: 100%;
  min-height: 48px;
  border-radius: 999px;
  padding: 0.78rem 1rem;
  font-weight: 600;
  font-size: 0.98rem;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.15s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0 auto 10px;
  box-sizing: border-box;
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.oauth-btn,
.action-btn {
  max-width: 360px;
}

.btn-oauth img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
}

.btn-facebook {
  background: #1877f2;
  color: #fff;
  border: 1px solid #1877f2;
  box-shadow: 0 8px 20px rgba(24, 119, 242, 0.22);
}

.btn-facebook:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(24, 119, 242, 0.28);
}

.btn-google {
  background: #fff;
  color: #2b2b2b;
  border: 1px solid #d1d5db;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
}

.btn-google:hover:not(:disabled) {
  background: #fafafa;
  transform: translateY(-1px);
}

.btn-primary {
  border: 1px solid #50bdbd;
  background: #50bdbd;
  color: #fff;
  box-shadow: 0 8px 20px rgba(80, 189, 189, 0.35);
}

.btn-primary:hover:not(:disabled) {
  background: #3ea9a9;
  border-color: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(80, 189, 189, 0.4);
}

.btn-secondary {
  border: 1px solid #50bdbd;
  background: #ffffff;
  color: #50bdbd;
  box-shadow: 0 8px 20px rgba(80, 189, 189, 0.12);
}

.btn-secondary:hover:not(:disabled) {
  background: #f3ffff;
  transform: translateY(-1px);
}

.visually-hidden {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

@media (max-width: 768px) {
  .login-page {
    padding: 20px 14px;
  }

  .brand {
    width: 128px;
    margin-bottom: 14px;
  }

  .card {
    border-radius: 28px;
    padding: 22px 16px 24px;
  }

  .card-title {
    font-size: 1.2rem;
  }
}
</style>