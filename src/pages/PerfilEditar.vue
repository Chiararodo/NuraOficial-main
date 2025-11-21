<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/composables/useSupabase'

const router = useRouter()
const auth = useAuthStore()

/* ======================= Estado inicial ======================= */
const originalName =
  (auth.user?.user_metadata as any)?.name ||
  auth.user?.email?.split('@')[0] ||
  ''

const originalEmail = auth.user?.email ?? ''

const originalAvatar =
  (auth.user?.user_metadata as any)?.avatar_url || '/icons/default-avatar.png'

const name = ref(originalName)
const email = ref(originalEmail)
const avatarPreview = ref<string>(originalAvatar)
const avatarFile = ref<File | null>(null)

const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

/* ======================= Manejo de avatar ======================= */
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

/* ======================= Guardar cambios ======================= */
async function save() {
  if (!auth.user) {
    errorMsg.value = 'No hay un usuario autenticado.'
    return
  }

  saving.value = true
  errorMsg.value = ''
  successMsg.value = ''

  let uploadedAvatarUrl = originalAvatar

  /* --- 1) Si hay nueva imagen → subirla --- */
  try {
    if (avatarFile.value) {
      const file = avatarFile.value
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${auth.user.id}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, {
          upsert: true,
        })

      if (uploadErr) throw uploadErr

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      uploadedAvatarUrl = pub.publicUrl
    }
  } catch (e: any) {
    console.error(e)
    errorMsg.value = 'No se pudo subir la foto.'
    saving.value = false
    return
  }

  /* --- 2) Actualizar auth.user_metadata --- */
  try {
    const { error } = await supabase.auth.updateUser({
      email: email.value,
      data: {
        name: name.value,
        avatar_url: uploadedAvatarUrl,
      },
    })
    if (error) throw error
  } catch (err: any) {
    console.error(err)
    errorMsg.value = 'Error al actualizar tu información.'
    saving.value = false
    return
  }

  /* --- 3) Actualizar tabla profiles --- */
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: auth.user.id,
        name: name.value,
        avatar_url: uploadedAvatarUrl,
        updated_at: new Date().toISOString(),
      })
    if (error) throw error
  } catch (err: any) {
    console.error(err)
    errorMsg.value = 'Error al actualizar tu perfil.'
    saving.value = false
    return
  }

  successMsg.value = 'Cambios guardados correctamente ✔'
  saving.value = false

  // esperar un segundo y volver al perfil
  setTimeout(() => {
    router.push('/app/perfil')
  }, 900)
}

function goBack() {
  router.back()
}
</script>

<template>
  <main class="perfil-edit">
    <header class="top">
      <button class="back-btn" type="button" @click="goBack">
        <span class="back-icon">←</span>
      </button>
      <h2>Editar Perfil</h2>
    </header>

    <section class="card edit-card">
      <!-- Avatar -->
      <div class="avatar-wrap">
        <img :src="avatarPreview" class="avatar-img" alt="Avatar de perfil" />
        <label class="upload-btn">
          Cambiar foto
          <input type="file" accept="image/*" @change="onFileChange" />
        </label>
      </div>

      <!-- Nombre -->
      <label class="label">Nombre</label>
      <input v-model="name" type="text" class="input" />

      <!-- Email -->
      <label class="label">Email</label>
      <input v-model="email" type="email" class="input" />

      <!-- Estado -->
      <p v-if="errorMsg" class="msg error">{{ errorMsg }}</p>
      <p v-if="successMsg" class="msg success">{{ successMsg }}</p>

      <!-- Guardar -->
      <button
        class="btn save-btn"
        type="button"
        :disabled="saving"
        @click="save"
      >
        {{ saving ? 'Guardando…' : 'Guardar cambios' }}
      </button>
    </section>
  </main>
</template>

<style scoped>
.perfil-edit {
  background: #fff;
  padding: 18px 16px 32px;
  max-width: 500px;
  margin: 0 auto;
  min-height: calc(100dvh - 64px);
}

.top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.top h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #222;
}

/* Botón atrás prolijo */
.back-btn {
  border: none;
  background: #50bdbd;
  color: #fff;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
}

.back-btn:hover {
  transform: translateY(-1px);
  filter: brightness(0.96);
  box-shadow: 0 9px 22px rgba(0, 0, 0, 0.2);
   background: #56bfcf;
}

.back-icon {
  font-size: 1.15rem;
  line-height: 1;
}

/* Card */
.card.edit-card {
  background: #fff;
  border-radius: 18px;
  padding: 20px 18px;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.07);
  border: 1px solid #eef2f7;
  display: grid;
  gap: 16px;
}

/* Avatar */
.avatar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.avatar-img {
  width: 96px;
  height: 96px;
  border-radius: 999px;
  object-fit: cover;
  border: 2px solid #e3edf5;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.upload-btn {
  background: #f0f7fb;
  color: #333;
  border: 1px solid #dbe8f0;
  border-radius: 12px;
  padding: 6px 12px;
  font-size: 0.9rem;
  cursor: pointer;
  display: inline-block;
  position: relative;
}

.upload-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

/* Inputs */
.label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #334;
}

.input {
  border-radius: 12px;
  border: 1px solid #ccd7e2;
  padding: 0.55rem 0.9rem;
  font-size: 0.95rem;
  background: #f9fcff;
}

/* Mensajes */
.msg {
  margin: 0;
  font-size: 0.9rem;
}

.msg.error {
  color: #d33;
}

.msg.success {
  color: #1a8f58;
}

/* Botón guardar */
.save-btn {
  margin-top: 6px;
  width: 100%;
  background: #50bdbd;
  color: #fff;
  font-weight: 600;
  padding: 0.55rem;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: filter 0.15s ease;
}

.save-btn:hover:not(:disabled) {
  filter: brightness(0.95);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
