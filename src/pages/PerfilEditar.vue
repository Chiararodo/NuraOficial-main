<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
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

const avatarInitial = computed(() => {
  const base = name.value?.trim() || auth.user?.email || 'U'
  return base.charAt(0).toUpperCase()
})

function clearProfileMessages() {
  errorMsg.value = ''
  successMsg.value = ''
}

function clearPasswordMessages() {
  pwdError.value = ''
  pwdSuccess.value = ''
}

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

async function resolveAvatarAny(
  value: string | null | undefined
): Promise<string | null> {
  const raw = (value || '').trim()
  if (!raw) return null

  if (/^https?:\/\//i.test(raw)) return withCacheBust(raw)

  const path = normalizeAvatarValue(raw)

  const u1 = publicUrlFrom(BUCKET, path)
  if (u1) return u1

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

  const { data: p } = await supabase
    .from('profiles')
    .select('avatar_url, name, full_name')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (p?.avatar_url) originalAvatarPath.value = String(p.avatar_url)

  if (p?.name && String(p.name).trim()) {
    name.value = String(p.name)
  } else if (p?.full_name && String(p.full_name).trim()) {
    name.value = String(p.full_name)
  }

  const resolved = await resolveAvatarAny(originalAvatarPath.value)
  avatarPreview.value = resolved
}

function onFileChange(e: Event) {
  clearProfileMessages()

  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    errorMsg.value = 'Seleccioná una imagen válida.'
    return
  }

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

  clearProfileMessages()

  if (!name.value.trim()) {
    errorMsg.value = 'Ingresá un nombre válido.'
    return
  }

  saving.value = true

  let savedAvatarPath: string | null = originalAvatarPath.value

  try {
    if (avatarFile.value) {
      const file = avatarFile.value
      const safeName = file.name.replace(/\s+/g, '-').toLowerCase()
      const path = `avatars/${auth.user.id}/${Date.now()}-${safeName}`

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
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

  try {
    const { error } = await supabase.auth.updateUser({
      data: {
        name: name.value.trim(),
        avatar_url: savedAvatarPath
      }
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

  try {
    const payload = {
      id: auth.user.id,
      name: name.value.trim(),
      full_name: name.value.trim(),
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

  const resolved = await resolveAvatarAny(savedAvatarPath)
  avatarPreview.value = resolved
  originalAvatarPath.value = savedAvatarPath

  successMsg.value = 'Cambios de perfil guardados correctamente.'
  saving.value = false
}

async function sendPasswordResetEmail() {
  clearPasswordMessages()

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
      if (msg.includes('rate limit')) {
        pwdError.value = 'Hiciste demasiadas solicitudes. Esperá unos minutos.'
      } else {
        pwdError.value =
          'No pudimos enviar el email. Probá de nuevo en unos minutos.'
      }
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
  <h1 class="visually-hidden">Editar perfil</h1>

  <main class="perfil-edit">
    <header class="page-head">
      <button class="back-btn" type="button" @click="goBack" aria-label="Volver">
        ←
      </button>
      <h2 class="page-title">Editar perfil</h2>
    </header>

    <div class="grid">
      <section class="col">
        <section class="card edit-card" aria-labelledby="edit-profile-title">
          <h2 id="edit-profile-title" class="section-title">Tus datos</h2>

          <div class="avatar-wrap">
            <div v-if="avatarPreview" class="avatar-img">
              <img
                :src="avatarPreview"
                alt="Avatar del perfil"
                @error="avatarPreview = null"
              />
            </div>

            <div v-else class="avatar-generated">
              {{ avatarInitial }}
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

          <div class="field-wrap">
            <label class="label" for="profile-name">Nombre</label>
            <input
              id="profile-name"
              v-model="name"
              type="text"
              class="input"
              aria-label="Nombre del perfil"
              @input="clearProfileMessages"
            />
          </div>

          <div class="field-wrap">
            <label class="label" for="profile-email">Email</label>
            <input
              id="profile-email"
              v-model="email"
              type="email"
              class="input"
              aria-label="Email del perfil"
              disabled
            />
            <p class="helper-text">
              El email se cambia con confirmación; por eso queda bloqueado acá.
            </p>
          </div>

          <p v-if="errorMsg" class="msg msg-error" role="alert">
            {{ errorMsg }}
          </p>

          <p v-if="successMsg" class="msg msg-success" role="status">
            {{ successMsg }}
          </p>

          <div class="actions-row">
            <button class="btn btn-primary" type="button" :disabled="saving" @click="saveProfile">
              {{ saving ? 'Guardando…' : 'Guardar cambios' }}
            </button>
          </div>
        </section>
      </section>

      <section class="col">
        <section class="card security-card" aria-labelledby="security-title">
          <h2 id="security-title" class="section-title">Seguridad y contraseña</h2>

          <p class="security-text">
            Por tu privacidad, el cambio de contraseña se hace en un formulario separado
            y se confirma por email. Te enviaremos un enlace seguro para que elijas
            una nueva contraseña.
          </p>

          <div class="field-wrap">
            <label class="label" for="security-email">Email para recibir el enlace</label>
            <div id="security-email" class="security-email-pill">
              {{ auth.user?.email }}
            </div>
          </div>

          <p v-if="pwdError" class="msg msg-error" role="alert">
            {{ pwdError }}
          </p>

          <p v-if="pwdSuccess" class="msg msg-success" role="status">
            {{ pwdSuccess }}
          </p>

          <div class="actions-row">
            <button
              type="button"
              class="btn btn-primary"
              :disabled="pwdSending"
              @click="sendPasswordResetEmail"
            >
              {{ pwdSending ? 'Enviando…' : 'Enviar email para cambiar contraseña' }}
            </button>
          </div>
        </section>
      </section>
    </div>
  </main>
</template>

<style scoped>
.perfil-edit {
  background: #fff;
  padding: 20px 18px 48px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  color: #50bdbd;
  font-size: 1.5rem;
  font-weight: 700;
}

.back-btn {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 999px;
  background: #e8fbf8;
  color: #50bdbd;
  font-size: 1.35rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease;
}

@media (hover: hover) {
  .back-btn:hover {
    background: #d8f6f1;
    transform: translateY(-1px);
    box-shadow: 0 8px 16px rgba(80, 189, 189, 0.14);
  }
}

.grid {
  display: grid;
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

@media (min-width: 980px) {
  .grid {
    grid-template-columns: 1.1fr 0.9fr;
    align-items: start;
  }
}

.col {
  display: grid;
  gap: 20px;
}

.card {
  width: 100%;
  box-sizing: border-box;
  background: #ffffff;
  border-radius: 18px;
  padding: 16px 18px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    background-color 0.22s ease,
    border-color 0.22s ease;
}

@media (hover: hover) {
  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.16);
    background: #ffffff;
  }
}

.section-title {
  margin: 0 0 14px;
  font-size: 1.25rem;
  color: #50bdbd;
  font-weight: 700;
}

.edit-card {
  display: grid;
  gap: 16px;
}

.avatar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.avatar-img img {
  width: 130px;
  height: 130px;
  border-radius: 999px;
  object-fit: cover;
  border: 2px solid #50bdbd;
  box-shadow: 0 10px 22px rgba(80, 189, 189, 0.14);
}

.avatar-generated {
  width: 118px;
  height: 118px;
  border-radius: 999px;
  background: #50bdbd;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44px;
  font-weight: 800;
  box-shadow: 0 10px 22px rgba(80, 189, 189, 0.16);
}

.upload-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 2px 18px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  background: #ffffff;
  color: #50bdbd;
  border: 1px solid #b6ebe5;
  box-shadow: 0 8px 18px rgba(148, 163, 184, 0.16);
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

@media (hover: hover) {
  .upload-btn:hover {
    background: #e0faf7;
    transform: translateY(-1px);
    box-shadow: 0 12px 24px rgba(80, 189, 189, 0.14);
  }
}

.upload-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.field-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-weight: 700;
  font-size: 0.98rem;
  color: #1f2937;
}

.input {
  width: 100%;
  box-sizing: border-box;
  border-radius: 12px;
  border: 1px solid #ccd7e2;
  padding: 0.75rem 0.9rem;
  font-size: 0.97rem;
  background: #f9fcff;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.input:focus {
  border-color: #50bdbd;
  box-shadow: 0 0 0 3px rgba(80, 189, 189, 0.18);
  outline: none;
}

.helper-text {
  margin: 2px 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.msg {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 0.93rem;
  line-height: 1.35;
}

.msg-error {
  background: #fff1f2;
  color: #b42318;
  border: 1px solid #fecdd3;
}

.msg-success {
  background: #ecfdf3;
  color: #027a48;
  border: 1px solid #abefc6;
}

.actions-row {
  display: flex;
  justify-content: flex-start;
  margin-top: 4px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 10px 18px;
  border: none;
  border-radius: 999px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  box-sizing: border-box;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.btn-primary {
  background: #50bdbd;
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.22);
  min-width: 180px;
  max-width: 320px;
}

@media (hover: hover) {
  .btn-primary:hover:not(:disabled) {
    background: #3daaaa;
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(80, 189, 189, 0.3);
  }
}

.btn:active:not(:disabled) {
  transform: scale(0.98);
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.security-card {
  display: grid;
  gap: 14px;
}

.security-text {
  margin: 0;
  font-size: 0.98rem;
  color: #4b5563;
  line-height: 1.5;
}

.security-email-pill {
  border-radius: 12px;
  border: 1px solid #ccd7e2;
  padding: 0.75rem 0.9rem;
  font-size: 0.97rem;
  background: #f9fcff;
  color: #334155;
  word-break: break-word;
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
  .perfil-edit {
    padding: 16px 12px 96px;
  }

  .page-title {
    font-size: 1.25rem;
  }

  .section-title {
    font-size: 1.1rem;
  }

  .card {
    padding: 14px 14px;
  }

  .avatar-img img {
    width: 112px;
    height: 112px;
  }

  .avatar-generated {
    width: 104px;
    height: 104px;
    font-size: 38px;
  }
}

@media (max-width: 520px) {
  .actions-row {
    justify-content: stretch;
  }

  .btn-primary {
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }
}
</style>