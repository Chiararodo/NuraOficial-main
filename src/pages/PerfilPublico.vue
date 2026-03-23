<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'

const BUCKET = 'nura-content'
const LEGACY_BUCKET = 'avatars'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const uid = route.params.uid as string

const user = ref<any | null>(null)
const loading = ref(true)
const errorMsg = ref('')

const avatarPath = ref('')
const publicAvatar = ref<string | null>(null)
const triedLegacy = ref(false)

const commentCount = ref<number | null>(null)
const forumCount = ref<number | null>(null)

type CommentPreview = {
  id: string
  forum_id: string
  body: string
  created_at: string
}

type ForumPreview = {
  id: string
  title: string
  created_at: string
}

const recentComments = ref<CommentPreview[]>([])
const recentForums = ref<ForumPreview[]>([])

const canViewProfile = ref(false)
const isAdmin = ref(false)

const showPremiumModal = ref(false)
const premiumTitle = ref('Función Premium')
const premiumText = ref('Para ver el perfil completo de otros usuarios necesitás el Plan Premium.')

const showBlockModal = ref(false)
const blockActionLoading = ref(false)
const nextBlockedValue = ref(false)

const showDeleteModal = ref(false)
const deletingUser = ref(false)

const toastVisible = ref(false)
const toastText = ref('')
const toastType = ref<'success' | 'error'>('success')
let toastTimer: number | null = null

function showToast(message: string, type: 'success' | 'error' = 'success') {
  toastText.value = message
  toastType.value = type
  toastVisible.value = true

  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastVisible.value = false
  }, 2400)
}

function openPremiumModal() {
  showPremiumModal.value = true
}

function closePremiumModal() {
  showPremiumModal.value = false
}

function goPremium() {
  router.push('/app/premium')
}

function goBack() {
  router.back()
}

function goToAdminPanel() {
  router.push('/app/admin/usuarios')
}

function withCacheBust(url: string) {
  return `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`
}

function formatDate(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const displayName = computed(() => {
  if (!user.value) return 'Usuario Nura'
  return user.value.name || user.value.full_name || user.value.username || 'Usuario Nura'
})

const hasAvatar = computed(() => !!publicAvatar.value)

const initials = computed(() => {
  const n = displayName.value.trim()
  if (!n) return 'U'
  return n.charAt(0).toUpperCase()
})

const canManageThisUser = computed(() => {
  return isAdmin.value && !!user.value && user.value.is_admin !== true
})

function goToForum(id: string) {
  router.push({ path: `/app/foro/${id}` })
}

function goToComment(forumId: string, commentId: string) {
  router.push({
    path: `/app/foro/${forumId}`,
    query: { highlight: commentId },
  })
}

function publicUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data?.publicUrl ? withCacheBust(data.publicUrl) : ''
}

function buildAvatarPrimary(pathOrUrl: string): string | null {
  if (!pathOrUrl) return null
  if (/^https?:\/\//i.test(pathOrUrl)) return withCacheBust(pathOrUrl)
  return publicUrl(BUCKET, pathOrUrl) || null
}

function buildAvatarLegacy(pathOrUrl: string): string | null {
  if (!pathOrUrl) return null
  if (/^https?:\/\//i.test(pathOrUrl)) return withCacheBust(pathOrUrl)
  return publicUrl(LEGACY_BUCKET, pathOrUrl) || null
}

function onAvatarError() {
  if (!avatarPath.value) {
    publicAvatar.value = null
    return
  }

  if (!triedLegacy.value) {
    triedLegacy.value = true
    publicAvatar.value = buildAvatarLegacy(avatarPath.value)
    return
  }

  publicAvatar.value = null
}

async function loadAdminState() {
  const myUid = auth.user?.id
  if (!myUid) {
    isAdmin.value = false
    return
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', myUid)
    .single()

  isAdmin.value = !error && data?.is_admin === true
}

async function loadProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .maybeSingle()

  if (error) {
    console.error('Error cargando perfil público:', error)
    errorMsg.value = 'No se pudo cargar este perfil.'
    user.value = null
    return
  }

  user.value = data

  if (data?.deleted_at && !isAdmin.value) {
  errorMsg.value = 'No encontramos este perfil.'
  user.value = null
  return
}

  avatarPath.value = ''
  publicAvatar.value = null
  triedLegacy.value = false

  if (data?.avatar_url) {
    avatarPath.value = String(data.avatar_url)
    publicAvatar.value = buildAvatarPrimary(avatarPath.value)
  }
}

async function loadStatsAndActivity() {
  const { count: cCount, error: cError } = await supabase
    .from('forum_comments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid)

  commentCount.value = !cError && typeof cCount === 'number' ? cCount : null

  const { count: fCount, error: fError } = await supabase
    .from('forums')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid)

  forumCount.value = !fError && typeof fCount === 'number' ? fCount : null

  const { data: cData } = await supabase
    .from('forum_comments')
    .select('id, body, created_at, forum_id')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(3)

  recentComments.value = (cData || []) as CommentPreview[]

  const { data: fData } = await supabase
    .from('forums')
    .select('id, title, created_at')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(3)

  recentForums.value = (fData || []) as ForumPreview[]
}

function askToggleBlocked() {
  if (!user.value) return
  nextBlockedValue.value = !user.value.blocked
  showBlockModal.value = true
}

function closeBlockModal() {
  if (!blockActionLoading.value) {
    showBlockModal.value = false
  }
}

async function confirmToggleBlocked() {
  if (!user.value) return

  blockActionLoading.value = true

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ blocked: nextBlockedValue.value })
      .eq('id', user.value.id)

    if (error) {
      console.error(error)
      showToast('No se pudo actualizar la cuenta.', 'error')
      return
    }

    showBlockModal.value = false
    showToast(
      nextBlockedValue.value
        ? 'La cuenta quedó bloqueada correctamente.'
        : 'La cuenta volvió a estar activa.'
    )

    await loadProfile()
  } finally {
    blockActionLoading.value = false
  }
}

function askDeleteUser() {
  showDeleteModal.value = true
}

function closeDeleteUserModal() {
  if (!deletingUser.value) {
    showDeleteModal.value = false
  }
}

async function confirmDeleteUser() {
  if (!user.value) return

  deletingUser.value = true

  try {
    const { data, error } = await supabase.functions.invoke('admin-delete-user', {
      body: { targetUserId: user.value.id },
    })

    if (error || !data?.ok) {
      console.error(error || data)
      showToast('No se pudo eliminar el usuario.', 'error')
      return
    }

    showDeleteModal.value = false
    showToast('Usuario eliminado correctamente.')

    setTimeout(() => {
      router.replace('/app/admin/usuarios')
    }, 500)
  } finally {
    deletingUser.value = false
  }
}

onMounted(async () => {
  loading.value = true
  errorMsg.value = ''
  publicAvatar.value = null
  avatarPath.value = ''
  triedLegacy.value = false

  if (!auth.user) {
    loading.value = false
    premiumTitle.value = 'Iniciá sesión'
    premiumText.value = 'Para ver perfiles de otros usuarios, necesitás iniciar sesión.'
    openPremiumModal()
    return
  }

  await loadAdminState()

  const { data: myProfile, error: myErr } = await supabase
    .from('profiles')
    .select('is_admin, premium, plan, plan_expires_at')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (myErr || !myProfile) {
    loading.value = false
    premiumTitle.value = 'No pudimos validar tu cuenta'
    premiumText.value = 'Hubo un problema verificando tu plan. Probá de nuevo.'
    openPremiumModal()
    return
  }

  const adminFromProfile = myProfile.is_admin === true
  const planIsPremium = myProfile.plan === 'premium'
  const planIsActive =
    !myProfile.plan_expires_at || new Date(myProfile.plan_expires_at) > new Date()
  const premiumFromPlan = myProfile.premium === true || (planIsPremium && planIsActive)

  canViewProfile.value = adminFromProfile || premiumFromPlan

  if (!canViewProfile.value) {
    loading.value = false
    premiumTitle.value = 'Función Premium'
    premiumText.value = 'Para ver el perfil completo de otros usuarios necesitás el Plan Premium.'
    openPremiumModal()
    return
  }

  await loadProfile()
  await loadStatsAndActivity()

  loading.value = false
})

onBeforeUnmount(() => {
  if (toastTimer) window.clearTimeout(toastTimer)
})
</script>

<template>
  <h1 class="visually-hidden">Perfil público</h1>

  <main class="perfil-publico">
    <div v-if="loading" class="state-card">
      <p class="estado">Cargando perfil...</p>
    </div>

    <div v-else-if="errorMsg" class="state-card">
      <p class="estado error">{{ errorMsg }}</p>
    </div>

    <section v-else-if="user" class="perfil-card" aria-labelledby="public-profile-name">
      <button class="back-btn" type="button" @click="goBack" aria-label="Volver">
        ←
      </button>

      <div class="avatar-wrapper">
        <img
          v-if="hasAvatar"
          :src="publicAvatar!"
          alt="Foto de perfil"
          class="avatar-img"
          @error="onAvatarError"
        />
        <div v-else class="avatar-placeholder">
          <span>{{ initials }}</span>
        </div>
      </div>

      <h2 id="public-profile-name" class="nombre">{{ displayName }}</h2>

      <p class="miembro" v-if="user.created_at">
        Miembro desde {{ formatDate(user.created_at) }}
      </p>
      <p class="miembro" v-else>
        Miembro de la comunidad Nura
      </p>

      <div class="badges">
        <span class="badge">Comunidad Nura</span>
        <span class="badge badge-soft">Foro de bienestar</span>
        <span v-if="user.blocked" class="badge badge-danger">Cuenta bloqueada</span>
        <span v-if="user.is_admin" class="badge badge-admin">Admin</span>
      </div>

      <div v-if="canManageThisUser" class="admin-tools">
        <button class="admin-pill admin-pill-soft" type="button" @click="goToAdminPanel">
          Panel admin
        </button>

        <button class="admin-pill admin-pill-dark" type="button" @click="askToggleBlocked">
          {{ user.blocked ? 'Desbloquear usuario' : 'Bloquear usuario' }}
        </button>

        <button class="admin-pill admin-pill-danger" type="button" @click="askDeleteUser">
          Eliminar usuario
        </button>
      </div>

      <div class="stats">
        <div class="stat-item">
          <span class="stat-number">{{ commentCount ?? '—' }}</span>
          <span class="stat-label">Comentarios</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ forumCount ?? '—' }}</span>
          <span class="stat-label">Foros creados</span>
        </div>
      </div>

      <section v-if="recentForums.length" class="section-list" aria-labelledby="recent-forums-title">
        <h3 id="recent-forums-title" class="section-title">Foros recientes</h3>
        <ul>
          <li v-for="f in recentForums" :key="f.id" class="clickable" @click="goToForum(f.id)">
            <span class="item-title">{{ f.title || 'Foro sin título' }}</span>
            <span class="item-date">{{ formatDate(f.created_at) }}</span>
          </li>
        </ul>
      </section>

      <section v-if="recentComments.length" class="section-list" aria-labelledby="recent-comments-title">
        <h3 id="recent-comments-title" class="section-title">Comentarios recientes</h3>
        <ul>
          <li v-for="c in recentComments" :key="c.id" class="clickable" @click="goToComment(c.forum_id, c.id)">
            <span class="item-body">{{ c.body }}</span>
            <span class="item-date">{{ formatDate(c.created_at) }}</span>
          </li>
        </ul>
      </section>
    </section>

    <div v-else class="state-card">
      <p class="estado">No encontramos este perfil.</p>
    </div>

    <div v-if="showPremiumModal" class="modal" @click.self="closePremiumModal">
      <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="premium-modal-title">
        <h2 id="premium-modal-title" class="modal-title">{{ premiumTitle }}</h2>
        <p class="modal-text">{{ premiumText }}</p>

        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" @click="goBack">Volver</button>
          <button class="btn btn-primary" type="button" @click="goPremium">Ver planes</button>
        </div>
      </div>
    </div>

    <div v-if="showBlockModal" class="modal" @click.self="closeBlockModal">
      <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="block-modal-title">
        <h2 id="block-modal-title" class="modal-title">
          {{ nextBlockedValue ? '¿Bloquear usuario?' : '¿Desbloquear usuario?' }}
        </h2>

        <p class="modal-text">
          {{
            nextBlockedValue
              ? `La cuenta de ${user?.name || user?.email || 'este usuario'} quedará bloqueada y no podrá usar la app normalmente.`
              : `La cuenta de ${user?.name || user?.email || 'este usuario'} volverá a estar activa.`
          }}
        </p>

        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" :disabled="blockActionLoading" @click="closeBlockModal">
            Cancelar
          </button>

          <button class="btn btn-primary" type="button" :disabled="blockActionLoading" @click="confirmToggleBlocked">
            {{
              blockActionLoading
                ? 'Guardando…'
                : nextBlockedValue
                  ? 'Sí, bloquear'
                  : 'Sí, desbloquear'
            }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteModal" class="modal" @click.self="closeDeleteUserModal">
      <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
        <h2 id="delete-modal-title" class="modal-title modal-title-danger">¿Eliminar usuario?</h2>

        <p class="modal-text">
          Se eliminará la cuenta de
          <strong>{{ user?.name || user?.email || 'este usuario' }}</strong>
          junto con sus posteos y comentarios. Esta acción no se puede deshacer.
        </p>

        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" :disabled="deletingUser" @click="closeDeleteUserModal">
            Cancelar
          </button>

          <button class="btn btn-danger" type="button" :disabled="deletingUser" @click="confirmDeleteUser">
            {{ deletingUser ? 'Eliminando…' : 'Eliminar usuario' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="toastVisible"
      class="toast"
      :class="toastType === 'success' ? 'toast-success' : 'toast-error'"
      role="status"
      aria-live="polite"
    >
      {{ toastText }}
    </div>
  </main>
</template>

<style scoped>
.perfil-publico {
  min-height: calc(100vh - 64px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 72px 16px 40px;
  background: #ffffff;
  box-sizing: border-box;
}

.state-card {
  width: 100%;
  max-width: 540px;
  background: #ffffff;
  border-radius: 18px;
  padding: 24px 18px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
}

.estado {
  margin: 0;
  font-size: 0.95rem;
  color: #475569;
  text-align: center;
}

.error {
  color: #c62828;
}

.perfil-card {
  width: 100%;
  max-width: 560px;
  background: #ffffff;
  border-radius: 22px;
  padding: 64px 20px 24px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
  position: relative;
  text-align: center;
  box-sizing: border-box;
  transition: transform 0.22s ease, box-shadow 0.22s ease, background-color 0.22s ease;
}

@media (hover: hover) {
  .perfil-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.16);
  }
}

.back-btn {
  position: absolute;
  top: 14px;
  left: 16px;
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 999px;
  background: #e8fbf8;
  color: #50bdbd;
  font-size: 1.25rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease, transform 0.18s ease, box-shadow 0.2s ease;
}

@media (hover: hover) {
  .back-btn:hover {
    background: #d8f6f1;
    transform: translateY(-1px);
    box-shadow: 0 8px 16px rgba(80, 189, 189, 0.14);
  }
}

.avatar-wrapper {
  position: absolute;
  top: -42px;
  left: 50%;
  transform: translateX(-50%);
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6ad7d7, #2d9c9c);
  padding: 3px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-img,
.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.avatar-img {
  object-fit: cover;
}

.avatar-placeholder span {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2d9c9c;
}

.nombre {
  margin: 8px 0 6px;
  font-size: 1.35rem;
  font-weight: 700;
  color: #0f172a;
}

.miembro {
  margin: 0;
  font-size: 0.92rem;
  color: #64748b;
}

.badges {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.badge {
  font-size: 0.76rem;
  padding: 5px 10px;
  border-radius: 999px;
  background: #e0f5f5;
  color: #1a6a6a;
  font-weight: 600;
}

.badge-admin {
  background: #efe7ff;
  color: #5b3a8c;
}

.badge-soft {
  background: #f3e8ff;
  color: #5b3a8c;
}

.badge-danger {
  background: #fee2e2;
  color: #b91c1c;
}

.admin-tools {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 16px;
}

.admin-pill {
  padding: 9px 14px;
  min-height: 40px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 700;
  transition: background-color 0.2s ease, transform 0.18s ease, box-shadow 0.2s ease;
}

.admin-pill:hover {
  transform: translateY(-1px);
}

.admin-pill-soft {
  background: #50bdbd;
  color: #fff;
}

.admin-pill-soft:hover {
  background: #3daaaa;
}

.admin-pill-dark {
  background: #43164d;
  color: #fff;
}

.admin-pill-dark:hover {
  background: #34103c;
}

.admin-pill-danger {
  background: #ef4444;
  color: #fff;
}

.admin-pill-danger:hover {
  background: #dc2626;
}

.stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 96px;
}

.stat-number {
  font-size: 1.2rem;
  font-weight: 700;
  color: #50bdbd;
}

.stat-label {
  font-size: 0.78rem;
  color: #78909c;
}

.section-list {
  margin-top: 22px;
  text-align: left;
}

.section-title {
  margin: 0 0 10px;
  font-size: 1.02rem;
  font-weight: 700;
  color: #50bdbd;
}

.section-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.section-list li {
  padding: 10px 12px;
  border: 1px solid #edf2f2;
  border-radius: 12px;
  background: #ffffff;
  margin-bottom: 8px;
  transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.item-title,
.item-body {
  display: block;
  font-size: 0.88rem;
  color: #37474f;
  line-height: 1.4;
}

.item-date {
  display: block;
  font-size: 0.76rem;
  color: #90a4ae;
  margin-top: 4px;
}

.clickable {
  cursor: pointer;
}

@media (hover: hover) {
  .clickable:hover {
    background: #eefafa;
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(80, 189, 189, 0.12);
    border-color: #d7f1ef;
  }
}

.visually-hidden {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 60;
}

.modal-box {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 18px;
  padding: 18px 16px 14px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
  text-align: center;
}

.modal-title {
  margin: 0 0 8px;
  font-size: 1.1rem;
  font-weight: 800;
  color: #50bdbd;
}

.modal-title-danger {
  color: #dc2626;
}

.modal-text {
  margin: 0 0 12px;
  font-size: 0.92rem;
  color: #475569;
  line-height: 1.45;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 999px;
  border: none;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.18s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.btn-primary {
  background: #50bdbd;
  color: #fff;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.22);
}

@media (hover: hover) {
  .btn-primary:hover {
    background: #3daaaa;
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(80, 189, 189, 0.3);
  }
}

.btn-danger {
  background: #ef4444;
  color: #fff;
  box-shadow: 0 8px 18px rgba(239, 68, 68, 0.22);
}

@media (hover: hover) {
  .btn-danger:hover {
    background: #dc2626;
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(239, 68, 68, 0.3);
  }
}

.btn-ghost {
  background: #eef6ff;
  color: #1f2937;
}

@media (hover: hover) {
  .btn-ghost:hover {
    background: #ddeefe;
    transform: translateY(-1px);
  }
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 96px;
  transform: translateX(-50%);
  z-index: 2300;
  min-width: 220px;
  max-width: calc(100vw - 32px);
  padding: 12px 16px;
  border-radius: 14px;
  color: #fff;
  font-weight: 800;
  font-size: 0.92rem;
  text-align: center;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.22);
}

.toast-success {
  background: #50bdbd;
}

.toast-error {
  background: #ef4444;
}

@media (max-width: 768px) {
  .perfil-publico {
    padding: 64px 12px 96px;
  }

  .perfil-card {
    padding: 58px 14px 18px;
    border-radius: 18px;
  }

  .nombre {
    font-size: 1.2rem;
  }

  .section-title {
    font-size: 0.96rem;
  }
}

@media (max-width: 520px) {
  .modal-actions {
    flex-direction: column;
  }

  .modal-actions .btn,
  .admin-tools .admin-pill {
    width: 100%;
  }

  .stats {
    gap: 16px;
  }

  .admin-tools {
    flex-direction: column;
  }
}
</style>