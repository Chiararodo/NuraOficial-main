<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/composables/useSupabase'

const router = useRouter()
const auth = useAuthStore()

const BUCKET = 'nura-content'
const LEGACY_BUCKET = 'avatars'

const originalName =
  (auth.user?.user_metadata as any)?.name ||
  auth.user?.email?.split('@')[0] ||
  ''

const originalEmail = auth.user?.email ?? ''

const originalAvatarPath = ref<string | null>(
  ((auth.user?.user_metadata as any)?.avatar_url as string | null) || null
)

const name = ref(originalName)
const email = ref(originalEmail)

const avatarPreview = ref<string | null>(null)
const avatarFile = ref<File | null>(null)

const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const pwdEmail = ref(originalEmail)
const pwdSending = ref(false)
const pwdError = ref('')
const pwdSuccess = ref('')

function withCacheBust(url: string) {
  return `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`
}

function normalizeAvatarValue(value: string) {
  let v = value.trim()
  if (/^https?:\/\//i.test(v)) return v
  v = v.replace(/^\/+/, '')
  v = v.replace(/^nura-content\//i, '')
  v = v.replace(/^public\/nura-content\//i, '')
  return v
}

function publicUrlFrom(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data?.publicUrl ? withCacheBust(data.publicUrl) : ''
}

async function resolveAvatarAny(value: string | null | undefined): Promise<string | null> {
  const raw = (value || '').trim()
  if (!raw) return null

  if (/^https?:\/\//i.test(raw)) return withCacheBust(raw)

  const path = normalizeAvatarValue(raw)

  // intento público (bucket nuevo)
  const u1 = publicUrlFrom(BUCKET, path)
  if (u1) return u1

  // fallback legacy: public o signed
  const u2 = publicUrlFrom(LEGACY_BUCKET, path)
  if (u2) return u2

  const { data: signed, error } = await supabase.storage
    .from(LEGACY_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7)

  if (!error && signed?.signedUrl) return withCacheBust(signed.signedUrl)
  return null
}

async function loadExistingAvatar() {
  if (!auth.user) return

  // fuente de verdad: profiles
  const { data: p } = await supabase
    .from('profiles')
    .select('avatar_url, name, full_name')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (p?.avatar_url) originalAvatarPath.value = String(p.avatar_url)

  // nombre también (si querés)
  if (p?.name && String(p.name).trim()) name.value = String(p.name)

  const resolved = await resolveAvatarAny(originalAvatarPath.value)
  avatarPreview.value = resolved
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  avatarFile.value = file

  const reader = new FileReader()
  reader.onload = () => {
    avatarPreview.value = reader.result as string
  }
  reader.readAsDataURL(file)
}

async function saveProfile() {
  if (!auth.user) {
    errorMsg.value = 'No hay un usuario autenticado.'
    return
  }

  saving.value = true
  errorMsg.value = ''
  successMsg.value = ''

  let savedAvatarPath: string | null = originalAvatarPath.value

  // 1) upload si hay archivo nuevo
  try {
    if (avatarFile.value) {
      const file = avatarFile.value
      const safeName = file.name.replace(/\s+/g, '-').toLowerCase()
      const path = `avatars/${auth.user.id}/${Date.now()}-${safeName}`

      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/png'
      })

      if (uploadErr) throw uploadErr
      savedAvatarPath = path
    }
  } catch (err) {
    console.error('UPLOAD avatar error:', err)
    errorMsg.value = 'Error al subir la foto. Intentá de nuevo.'
    saving.value = false
    return
  }

  // 2) auth metadata
  try {
    const { error } = await supabase.auth.updateUser({
      data: { name: name.value, avatar_url: savedAvatarPath }
    })
    if (error) throw error

    const { data: refUser } = await supabase.auth.getUser()
    if (refUser?.user) (auth as any).user = refUser.user
  } catch (err: any) {
    console.error('updateUser error:', err)
    errorMsg.value = err?.message || 'Error al actualizar tus datos.'
    saving.value = false
    return
  }

  // 3) profiles (lo que consume perfil + foro + perfil publico)
  try {
    const payload = {
      id: auth.user.id,
      name: name.value,
      full_name: name.value,
      avatar_url: savedAvatarPath
    }
    const { error } = await supabase.from('profiles').upsert(payload)
    if (error) throw error
  } catch (err) {
    console.error('upsert profiles error:', err)
    errorMsg.value = 'Error al guardar el perfil en Nura.'
    saving.value = false
    return
  }

  // 4) refrescar preview con url real
  const resolved = await resolveAvatarAny(savedAvatarPath)
  avatarPreview.value = resolved
  originalAvatarPath.value = savedAvatarPath

  successMsg.value = 'Cambios de perfil guardados correctamente ✔'
  saving.value = false
}

async function sendPasswordResetEmail() {
  pwdError.value = ''
  pwdSuccess.value = ''

  if (!pwdEmail.value || !pwdEmail.value.includes('@')) {
    pwdError.value = 'Ingresá un email válido para continuar.'
    return
  }

  pwdSending.value = true
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(pwdEmail.value, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })

    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('rate limit')) pwdError.value = 'Hiciste demasiadas solicitudes. Esperá unos minutos.'
      else pwdError.value = 'No pudimos enviar el email. Probá de nuevo en unos minutos.'
      return
    }

    pwdSuccess.value = `Te enviamos un correo a ${pwdEmail.value} con el enlace para cambiar tu contraseña. Revisá también spam.`
  } catch (err) {
    console.error(err)
    pwdError.value = 'Ocurrió un error al solicitar el cambio de contraseña.'
  } finally {
    pwdSending.value = false
  }
}

function goBack() {
  router.back()
}

onMounted(() => {
  loadExistingAvatar()
})
</script>

<template>
  <h1 class="visually-hidden">Perfil</h1>

  <main class="perfil-edit">
    <header class="top">
      <button class="back-btn" type="button" @click="goBack">←</button>
      <h2>Editar perfil</h2>
    </header>

    <section class="card edit-card">
      <div class="avatar-wrap">
        <div v-if="avatarPreview" class="avatar-img">
         <img
  v-if="avatarPreview"
  :src="avatarPreview"
  alt="Avatar"
  @error="avatarPreview = null"
/> </div>
        <div v-else class="avatar-generated">
          {{ name.charAt(0).toUpperCase() }}
        </div>

        <label class="upload-btn">
          Cambiar foto
          <input
            type="file"
            accept="image/*"
            @change="onFileChange"
            aria-label="Cambiar foto de perfil"
          />
        </label>
      </div>

      <label class="label" for="profile-name">Nombre</label>
      <input
        id="profile-name"
        v-model="name"
        type="text"
        class="input"
        aria-label="Nombre del perfil"
      />

      <label class="label" for="profile-email">Email</label>
      <input
        id="profile-email"
        v-model="email"
        type="email"
        class="input"
        aria-label="Email del perfil"
        disabled
      />
      <p class="security-msg" style="margin-top:-10px;color:#64748b;font-size:.9rem;">
        (El email se cambia con confirmación; lo dejamos bloqueado acá.)
      </p>

      <p v-if="errorMsg" class="msg error">{{ errorMsg }}</p>
      <p v-if="successMsg" class="msg success">{{ successMsg }}</p>

      <button class="save-btn" type="button" :disabled="saving" @click="saveProfile">
        {{ saving ? 'Guardando…' : 'Guardar cambios' }}
      </button>
    </section>

    <section class="security-card">
      <h3 class="security-title">Seguridad · Contraseña</h3>

      <p class="security-text">
        Por tu privacidad, el cambio de contraseña se hace en un formulario
        separado y se confirma por email. Te enviaremos un enlace seguro
        para que elijas una nueva contraseña.
      </p>

      <label class="security-label">Email para recibir el enlace</label>

      <div class="security-email-pill">
        {{ auth.user?.email }}
      </div>

      <p v-if="pwdError" class="security-msg security-msg--error">
        {{ pwdError }}
      </p>

      <p v-if="pwdSuccess" class="security-msg security-msg--ok">
        {{ pwdSuccess }}
      </p>

      <button
        type="button"
        class="primary-btn security-btn"
        :disabled="pwdSending"
        @click="sendPasswordResetEmail"
      >
        {{ pwdSending ? 'Enviando…' : 'Enviar email para cambiar contraseña' }}
      </button>
    </section>
  </main>
</template>

<style scoped>
/* 👇 dejo tus estilos tal como estaban, no toqué la estética */
.perfil-edit {
  background: #fff;
  padding: 20px 16px 40px;
  max-width: 1100px;
  margin: 0 auto;
}

.top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.back-btn {
  border: none;
  background: transparent;
  color: #50bdbd;
  font-size: 1.5rem;
  cursor: pointer;
}

.card {
  background: #ffffff;
  border-radius: 18px;
  padding: 22px 20px;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.07);
  border: 1px solid #eef2f7;
}

.edit-card {
  display: grid;
  gap: 16px;
  margin-bottom: 18px;
}

.avatar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.avatar-img img {
  width: 130px;
  height: 130px;
  border-radius: 999px;
  object-fit: cover;
  border: 1.5px solid #50bdbd;
}

.avatar-generated {
  width: 110px;
  height: 110px;
  border-radius: 999px;
  background: #50bdbd;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: bold;
}

.upload-btn {
  padding: 7px 14px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  position: relative;
  background: #ffffff;
  color: #50bdbd;
  border: 3px solid #b6ebe5;
  box-shadow: 0 6px 12px rgba(148, 163, 184, 0.22);
}

.upload-btn:hover {
  background: #e0faf7;
  transform: translateY(-1px);
}

.upload-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.label {
  font-weight: 700;
  font-size: 1rem;
  color: #333;
}

.input {
  border-radius: 12px;
  border: 1px solid #ccd7e2;
  padding: 0.55rem 0.9rem;
  font-size: 0.99rem;
  background: #f9fcff;
}

.input:focus {
  border-color: #50bdbd;
  box-shadow: 0 0 0 3px rgba(80, 189, 189, 0.18);
  outline: none;
}

.msg {
  margin: 0;
  font-size: 1rem;
}

.error {
  color: #d33;
}

.success {
  color: #1a8f58;
}

.save-btn {
  background: #50bdbd;
  color: #fff;
  font-weight: 600;
  font-size: 1rem;
  padding: 0.7rem;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: 0.15s ease;
  box-shadow: 0 6px 18px rgba(80, 189, 189, 0.35);
}

.save-btn:hover:not(:disabled) {
  background: #3ea9a9;
  transform: translateY(-1px);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.security-card {
  margin-top: 18px;
  padding: 22px 22px 20px;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
  border: 1px solid #e4eef5;
}

.security-title {
  margin: 0 0 6px;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.security-text {
  margin: 0 0 14px;
  font-size: 1rem;
  color: #4b5563;
  line-height: 1.5;
}

.security-label {
  display: block;
  margin-bottom: 6px;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
}

.security-email-pill {
  border-radius: 12px;
  border: 1px solid #ccd7e2;
  padding: 0.55rem 0.9rem;
  font-size: 1rem;
  background: #f9fcff;
}

.security-msg {
  margin: 6px 0 0;
  font-size: 0.93rem;
  width: 100%;
}

.security-msg--error {
  color: #dc2626;
}

.security-msg--ok {
  color: #16a34a;
}

.primary-btn {
  width: 100%;
  background: #50bdbd;
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  padding: 0.8rem;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: 0.15s ease;
  box-shadow: 0 5px 16px rgba(80, 189, 189, 0.35);
}

.primary-btn:hover:not(:disabled) {
  background: #3ea9a9;
  transform: translateY(-1px);
}

.security-btn {
  margin-top: 8px;
}

.visually-hidden {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
</style>