<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'

/* =========================
   STORAGE
========================= */
const BUCKET = 'nura-content'
const LEGACY_BUCKET = 'avatars'

function withCacheBust(url: string) {
  return `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`
}

function publicUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data?.publicUrl ? withCacheBust(data.publicUrl) : ''
}

function avatarPrimaryUrl(value: string) {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return withCacheBust(value)
  return publicUrl(BUCKET, value)
}

function avatarLegacyUrl(value: string) {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return withCacheBust(value)
  return publicUrl(LEGACY_BUCKET, value)
}

/* =========================
   STATE / TYPES
========================= */
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const myFlags = ref<{ is_admin: boolean; premium: boolean; plan: string | null } | null>(null)
const isAdmin = computed(() => !!myFlags.value?.is_admin)

type ForumRow = {
  id: string
  user_id: string | null
  title: string
  body: string | null
  category: string | null
  created_at: string
}

type CommentRow = {
  id: string
  forum_id: string
  user_id: string | null
  body: string
  created_at: string
}

const forumId = computed(() => route.params.id as string)
const highlightId = computed(() => (route.query.highlight as string | undefined) || null)

const forum = ref<ForumRow | null>(null)
const comments = ref<CommentRow[]>([])
const errorMsg = ref('')
const infoMsg = ref('')
const newComment = ref('')
const sending = ref(false)

const canSend = computed(() => newComment.value.trim().length > 1 && !sending.value)

const userNames = ref<Map<string, string>>(new Map())
const userAvatarPath = ref<Map<string, string>>(new Map())
const userAvatarUrl = ref<Map<string, string | null>>(new Map())
const userAvatarTriedLegacy = ref<Map<string, boolean>>(new Map())

function clearMessages() {
  errorMsg.value = ''
  infoMsg.value = ''
}

function setInfo(message: string) {
  infoMsg.value = message
  errorMsg.value = ''
  setTimeout(() => {
    if (infoMsg.value === message) infoMsg.value = ''
  }, 2500)
}

function setError(message: string) {
  errorMsg.value = message
  infoMsg.value = ''
  setTimeout(() => {
    if (errorMsg.value === message) errorMsg.value = ''
  }, 3000)
}

/* =========================
   HELPERS (names/avatars)
========================= */
function seedCurrentUserName() {
  if (!auth.user) return
  const metaName =
    (auth.user.user_metadata as any)?.name?.trim() || auth.user.email?.split('@')[0] || ''
  if (!metaName) return
  const m = new Map(userNames.value)
  m.set(auth.user.id, metaName)
  userNames.value = m
}

function getDisplayName(userId: string | null | undefined) {
  if (!userId) return 'Usuario'
  const fromMap = userNames.value.get(userId)
  if (fromMap) return fromMap

  if (auth.user && userId === auth.user.id) {
    const metaName =
      (auth.user.user_metadata as any)?.name?.trim() || auth.user.email?.split('@')[0]
    return metaName || 'Usuario'
  }
  return 'Usuario'
}

function displayAvatarFor(userId: string | null | undefined): string | null {
  if (!userId) return null
  return userAvatarUrl.value.get(userId) ?? null
}

function onAvatarError(userId: string | null | undefined) {
  if (!userId) return

  const tried = userAvatarTriedLegacy.value.get(userId) === true
  const path = userAvatarPath.value.get(userId) || ''

  if (!path) {
    const u = new Map(userAvatarUrl.value)
    u.set(userId, null)
    userAvatarUrl.value = u
    return
  }

  if (!tried) {
    const legacy = avatarLegacyUrl(path)
    const u = new Map(userAvatarUrl.value)
    u.set(userId, legacy || null)
    userAvatarUrl.value = u

    const t = new Map(userAvatarTriedLegacy.value)
    t.set(userId, true)
    userAvatarTriedLegacy.value = t
    return
  }

  const u = new Map(userAvatarUrl.value)
  u.set(userId, null)
  userAvatarUrl.value = u
}

/* =========================
   LOAD user names + avatars
========================= */
async function loadUserNames() {
  const ids = new Set<string>()
  if (forum.value?.user_id) ids.add(forum.value.user_id)
  comments.value.forEach((c) => c.user_id && ids.add(c.user_id))
  if (ids.size === 0) return

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, full_name, avatar_url')
    .in('id', Array.from(ids))

  if (error) {
    console.error('loadUserNames profiles error:', error)
    return
  }
  if (!data) return

  const nameMap = new Map(userNames.value)
  const pathMap = new Map(userAvatarPath.value)
  const urlMap = new Map(userAvatarUrl.value)
  const triedMap = new Map(userAvatarTriedLegacy.value)

  ;(data as any[]).forEach((u) => {
    const existingName = nameMap.get(u.id)

    const displayName =
      (u.name && String(u.name).trim()) ||
      (u.full_name && String(u.full_name).trim()) ||
      existingName ||
      'Usuario'

    nameMap.set(u.id, displayName)

    const av = u.avatar_url ? String(u.avatar_url) : ''

    if (av) {
      pathMap.set(u.id, av)
      urlMap.set(u.id, avatarPrimaryUrl(av) || null)
      triedMap.set(u.id, false)
    } else {
      if (!urlMap.has(u.id)) urlMap.set(u.id, null)
      if (!triedMap.has(u.id)) triedMap.set(u.id, true)
    }
  })

  userNames.value = nameMap
  userAvatarPath.value = pathMap
  userAvatarUrl.value = urlMap
  userAvatarTriedLegacy.value = triedMap
}

/* =========================
   UI helpers
========================= */
const authorLabel = computed(() => getDisplayName(forum.value?.user_id ?? null))

function displayNameForComment(c: CommentRow) {
  return getDisplayName(c.user_id)
}

function goBack() {
  router.back()
}

function goToProfile(userId?: string | null) {
  if (!userId) return
  router.push({ name: 'perfil-publico', params: { uid: userId } })
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/* =========================
   LOAD forum + comments
========================= */
async function loadForum() {
  const { data, error } = await supabase
    .from('forums')
    .select('id,title,body,category,created_at,user_id')
    .eq('id', forumId.value)
    .maybeSingle()

  if (error || !data) {
    console.error(error)
    setError('No se encontró este foro.')
  } else {
    forum.value = data as ForumRow
  }
}

async function loadComments() {
  const { data, error } = await supabase
    .from('forum_comments')
    .select('id,forum_id,user_id,body,created_at')
    .eq('forum_id', forumId.value)
    .order('created_at', { ascending: true })

  if (!error && data) comments.value = data as CommentRow[]
}

function scrollToHighlighted() {
  if (!highlightId.value) return
  requestAnimationFrame(() => {
    const el = document.getElementById(highlightId.value as string)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

/* =========================
   SEND comment
========================= */
async function sendComment() {
  if (!canSend.value) return

  if (!auth.user) {
    setError('Tenés que iniciar sesión para comentar.')
    return
  }

  sending.value = true
  clearMessages()

  try {
    const { data: me, error: meError } = await supabase
      .from('profiles')
      .select('blocked, deleted_at')
      .eq('id', auth.user.id)
      .single()

    if (meError) {
      console.error(meError)
      setError('No pudimos validar tu cuenta.')
      return
    }

    if (me?.blocked || me?.deleted_at) {
      setError('Tu cuenta no puede comentar.')
      return
    }

    const text = newComment.value.trim()

    const { data, error } = await supabase
      .from('forum_comments')
      .insert({
        forum_id: forumId.value,
        user_id: auth.user.id,
        body: text
      })
      .select('id,forum_id,user_id,body,created_at')
      .single()

    if (error) {
      console.error(error)
      setError('No se pudo enviar el comentario.')
    } else if (data) {
      comments.value.push(data as CommentRow)
      newComment.value = ''
      await loadUserNames()
      setInfo('Comentario enviado.')
    }
  } finally {
    sending.value = false
  }
}

/* =========================
   DELETE comment
========================= */
const showConfirmDelete = ref(false)
const commentToDelete = ref<CommentRow | null>(null)
const deleting = ref(false)

function askDelete(c: CommentRow) {
  if (!auth.user) return
  if (!isAdmin.value && c.user_id !== auth.user.id) return
  commentToDelete.value = c
  showConfirmDelete.value = true
}

function cancelDelete() {
  showConfirmDelete.value = false
  commentToDelete.value = null
}

async function confirmDelete() {
  if (!commentToDelete.value || !auth.user) return

  deleting.value = true
  clearMessages()

  let q = supabase.from('forum_comments').delete().eq('id', commentToDelete.value.id).select('id')
  if (!isAdmin.value) q = q.eq('user_id', auth.user.id)

  const { data, error } = await q

  if (error) {
    console.error('DELETE comment error:', error)
    setError(error.message || 'No se pudo borrar el comentario.')
  } else if (!data || data.length === 0) {
    setError('No se pudo borrar el comentario.')
  } else {
    comments.value = comments.value.filter((c) => c.id !== commentToDelete.value!.id)
    setInfo('Comentario borrado.')
  }

  deleting.value = false
  showConfirmDelete.value = false
  commentToDelete.value = null
}

/* =========================
   DELETE forum
========================= */
const canDeleteForum = computed(() => {
  if (!auth.user || !forum.value) return false
  return isAdmin.value || forum.value.user_id === auth.user.id
})

const showConfirmDeleteForum = ref(false)
const deletingForum = ref(false)

function askDeleteForum() {
  if (!canDeleteForum.value) return
  showConfirmDeleteForum.value = true
}

function cancelDeleteForum() {
  showConfirmDeleteForum.value = false
}

async function confirmDeleteForum() {
  if (!auth.user || !forum.value) return

  deletingForum.value = true
  clearMessages()

  let q = supabase.from('forums').delete().eq('id', forum.value.id).select('id')
  if (!isAdmin.value) q = q.eq('user_id', auth.user.id)

  const { data, error } = await q

  if (error) {
    console.error('DELETE forum error:', error)
    setError(error.message || 'No se pudo borrar el foro.')
    deletingForum.value = false
    return
  }

  if (!data || data.length === 0) {
    setError('No se pudo borrar el foro.')
    deletingForum.value = false
    return
  }

  deletingForum.value = false
  showConfirmDeleteForum.value = false
  router.push({ name: 'foro' })
}

/* =========================
   REALTIME
========================= */
let channel: any = null

function setupRealtime() {
  channel = supabase
    .channel(`forum-comments-${forumId.value}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'forum_comments', filter: `forum_id=eq.${forumId.value}` },
      async (payload: any) => {
        const c = payload.new as CommentRow
        if (!comments.value.find((x) => x.id === c.id)) {
          comments.value.push(c)
          await loadUserNames()
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'forum_comments', filter: `forum_id=eq.${forumId.value}` },
      (payload: any) => {
        const deletedId = payload.old?.id as string | undefined
        if (deletedId) comments.value = comments.value.filter((c) => c.id !== deletedId)
      }
    )
    .subscribe()
}

/* =========================
   MOUNT
========================= */
onMounted(async () => {
  if (auth.user) {
    const { data } = await supabase
      .from('profiles')
      .select('is_admin, premium, plan')
      .eq('id', auth.user.id)
      .maybeSingle()

    myFlags.value = data || { is_admin: false, premium: false, plan: 'free' }
  }

  seedCurrentUserName()
  await loadForum()

  if (!errorMsg.value) {
    await loadComments()
    await loadUserNames()
    setupRealtime()
    scrollToHighlighted()
  }
})

onBeforeUnmount(() => {
  if (channel) supabase.removeChannel(channel)
})
</script>

<template>
  <h1 class="visually-hidden">Ver foro</h1>

  <main class="contenido ver-foro">
    <header class="page-head">
      <button class="back-link" type="button" @click="goBack" aria-label="Volver">
        <span class="arrow">←</span>
      </button>

      <div class="page-copy">
        <h2 class="page-title">Detalle del foro</h2>
        <p class="page-sub">Leé la publicación y participá en la conversación.</p>
      </div>
    </header>

    <p v-if="errorMsg" class="form-message error" role="alert">
      {{ errorMsg }}
    </p>

    <p v-if="infoMsg" class="form-message success" role="status">
      {{ infoMsg }}
    </p>

    <section v-if="forum && !errorMsg" class="post-box" aria-labelledby="forum-title">
      <div class="post-header">
        <div class="post-header-main">
          <h2 id="forum-title" class="post-title">{{ forum.title }}</h2>

          <p class="meta">
            Publicado por
            <button
              v-if="forum.user_id"
              class="author-link"
              type="button"
              @click="goToProfile(forum.user_id)"
            >
              {{ authorLabel }}
            </button>
            <span v-else><strong>{{ authorLabel }}</strong></span>
            · {{ formatDateTime(forum.created_at) }}
          </p>
        </div>

        <button
          v-if="canDeleteForum"
          type="button"
          class="delete-forum-btn"
          @click="askDeleteForum"
        >
          Borrar foro
        </button>
      </div>

      <p class="body">{{ forum.body }}</p>

      <span v-if="forum.category" class="tag">{{ forum.category }}</span>
    </section>

    <section v-if="forum && !errorMsg" class="comments-box" aria-labelledby="comments-title">
      <h2 id="comments-title" class="section-title">Comentarios ({{ comments.length }})</h2>

      <div v-if="comments.length > 0" class="comments-list">
        <article
          v-for="c in comments"
          :key="c.id"
          :id="c.id"
          class="comment"
          :class="{ highlighted: c.id === highlightId }"
        >
          <div class="avatar" :class="{ clickable: !!c.user_id }" @click="goToProfile(c.user_id)">
            <div class="avatar-inner">
              <img
                v-if="displayAvatarFor(c.user_id)"
                :src="displayAvatarFor(c.user_id)!"
                alt=""
                class="avatar-img"
                @error="onAvatarError(c.user_id)"
              />
              <span v-else class="avatar-initial">
                {{ displayNameForComment(c).charAt(0).toUpperCase() }}
              </span>
            </div>
          </div>

          <div class="comment-body">
            <div class="comment-header">
              <button
                v-if="c.user_id"
                class="user-btn"
                type="button"
                @click="goToProfile(c.user_id)"
              >
                {{ displayNameForComment(c) }}
              </button>

              <span v-else class="user">
                {{ displayNameForComment(c) }}
              </span>

              <span class="date">
                {{ formatDateTime(c.created_at) }}
              </span>

              <button
                v-if="auth.user && (isAdmin || c.user_id === auth.user.id)"
                class="delete-comment-btn"
                type="button"
                @click="askDelete(c)"
              >
                Borrar
              </button>
            </div>

            <p class="comment-text">{{ c.body }}</p>
          </div>
        </article>
      </div>

      <div v-else class="empty">Todavía no hay comentarios. ¡Sé la primera en comentar!</div>
    </section>

    <section v-if="auth.user && forum && !errorMsg" class="new-comment" aria-labelledby="new-comment-title">
      <h2 id="new-comment-title" class="section-title">Agregar comentario</h2>

      <label class="visually-hidden" for="forum-comment">Escribí un comentario</label>
      <textarea
        id="forum-comment"
        v-model="newComment"
        placeholder="Escribí un comentario..."
        @input="clearMessages"
      ></textarea>

      <button class="btn-primary" type="button" :disabled="!canSend" @click="sendComment">
        {{ sending ? 'Enviando…' : 'Comentar' }}
      </button>
    </section>

    <p v-else-if="!auth.user && !errorMsg" class="login-msg">
      Tenés que iniciar sesión para comentar.
    </p>

    <div v-if="showConfirmDelete" class="modal-backdrop" @click.self="cancelDelete">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-comment-title">
        <h2 id="delete-comment-title" class="modal-title">¿Eliminar comentario?</h2>
        <p class="modal-text">Esta acción no se puede deshacer.</p>

        <div class="modal-actions">
          <button class="modal-btn soft" type="button" @click="cancelDelete">
            Cancelar
          </button>
          <button class="modal-btn danger" :disabled="deleting" type="button" @click="confirmDelete">
            {{ deleting ? 'Borrando…' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showConfirmDeleteForum" class="modal-backdrop" @click.self="cancelDeleteForum">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-forum-title">
        <h2 id="delete-forum-title" class="modal-title">¿Eliminar foro?</h2>
        <p class="modal-text">Se borrará todo el contenido y los comentarios.</p>

        <div class="modal-actions">
          <button class="modal-btn soft" type="button" @click="cancelDeleteForum">
            Cancelar
          </button>
          <button
            class="modal-btn danger"
            :disabled="deletingForum"
            type="button"
            @click="confirmDeleteForum"
          >
            {{ deletingForum ? 'Borrando…' : 'Eliminar foro' }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.visually-hidden {
  position: absolute !important;
  height: 1px;
  width: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
}

.contenido {
  background: #fff;
  padding: 20px 18px 48px;
  max-width: 1100px;
  margin: 0 auto;
}

.ver-foro {
  box-sizing: border-box;
}

.page-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.page-copy {
  display: grid;
  gap: 4px;
}

.page-title {
  margin: 0;
  color: #50bdbd;
  font-size: 1.5rem;
  font-weight: 800;
}

.page-sub {
  margin: 0;
  color: #6b7280;
  font-size: 0.95rem;
  line-height: 1.4;
}

.back-link {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 999px;
  background: #e8fbf8;
  color: #50bdbd;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease;
  flex: 0 0 auto;
}

@media (hover: hover) {
  .back-link:hover {
    background: #d8f6f1;
    transform: translateY(-1px);
    box-shadow: 0 8px 16px rgba(80, 189, 189, 0.14);
  }
}

.arrow {
  font-size: 1.35rem;
  line-height: 1;
}

.form-message {
  width: 100%;
  max-width: 720px;
  margin: 0 0 14px 54px;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 0.93rem;
  line-height: 1.35;
  box-sizing: border-box;
}

.form-message.error {
  background: #fff1f2;
  color: #b42318;
  border: 1px solid #fecdd3;
}

.form-message.success {
  background: #ecfdf3;
  color: #027a48;
  border: 1px solid #abefc6;
}

.post-box {
  background: #ffffff;
  border-radius: 18px;
  padding: 18px;
  border: 1px solid #e2edf7;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  margin-bottom: 20px;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease,
    background-color 0.22s ease;
}

@media (hover: hover) {
  .post-box:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
    border-color: #d7f1ef;
  }
}

.post-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.post-header-main {
  min-width: 0;
}

.post-title {
  margin: 0 0 8px;
  color: #111827;
  font-size: 1.25rem;
  line-height: 1.2;
}

.meta {
  color: #6b6f76;
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.4;
}

.author-link {
  border: none;
  background: none;
  padding: 0;
  margin: 0;
  font-weight: 700;
  color: #1f2933;
  cursor: pointer;
}

@media (hover: hover) {
  .author-link:hover {
    color: #50bdbd;
    text-decoration: underline;
  }
}

.body {
  color: #334155;
  line-height: 1.55;
  white-space: pre-wrap;
  margin: 0 0 12px;
}

.tag {
  display: inline-flex;
  align-items: center;
  background: #50bdbd;
  color: white;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
}

.section-title {
  margin: 0 0 12px;
  color: #50bdbd;
  font-size: 1.1rem;
  font-weight: 800;
}

.comments-box {
  margin-top: 20px;
}

.comments-list {
  display: grid;
  gap: 10px;
}

.comment {
  display: flex;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e8eef3;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.04);
  transition:
    background-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

@media (hover: hover) {
  .comment:hover {
    background: #eefafa;
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(80, 189, 189, 0.12);
    border-color: #d7f1ef;
  }
}

.highlighted {
  background: #e0f7f7;
  border-color: #9de2de;
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6ad7d7, #2d9c9c);
  padding: 3px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
  flex: 0 0 auto;
}

.avatar.clickable {
  cursor: pointer;
}

.avatar-inner {
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
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-initial {
  font-size: 1rem;
  font-weight: 700;
  color: #2d9c9c;
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  color: black;
  flex-wrap: wrap;
}

.user-btn {
  color: black;
  border: none;
  background: none;
  padding: 0;
  margin: 0;
  font-weight: 700;
  cursor: pointer;
}

@media (hover: hover) {
  .user-btn:hover {
    color: #50bdbd;
    text-decoration: underline;
  }
}

.user {
  font-weight: 700;
}

.date {
  font-size: 0.8rem;
  color: #6b6f76;
  margin-left: auto;
}

.comment-text {
  margin: 0;
  color: #334155;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
}

.delete-forum-btn,
.delete-comment-btn {
  border-radius: 999px;
  border: none;
  padding: 7px 14px;
  background: #ef4444;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease;
}

@media (hover: hover) {
  .delete-forum-btn:hover,
  .delete-comment-btn:hover {
    background: #dc2626;
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(239, 68, 68, 0.18);
  }
}

.new-comment {
  margin-top: 18px;
  background: #ffffff;
  border-radius: 18px;
  padding: 16px 18px 18px;
  border: 1px solid #e2edf7;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease,
    background-color 0.22s ease;
}

@media (hover: hover) {
  .new-comment:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
    border-color: #d7f1ef;
  }
}

.new-comment textarea {
  width: 100%;
  min-height: 96px;
  border-radius: 14px;
  border: 1px solid #dce5ec;
  padding: 12px;
  font-family: inherit;
  font-size: 0.95rem;
  box-sizing: border-box;
  resize: vertical;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.new-comment textarea:focus {
  border-color: #50bdbd;
  box-shadow: 0 0 0 3px rgba(80, 189, 189, 0.16);
}

.btn-primary {
  margin-top: 12px;
  background: #50bdbd;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 700;
  min-height: 42px;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.22);
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease;
}

@media (hover: hover) {
  .btn-primary:hover:not(:disabled) {
    background: #3ea9a9;
    transform: translateY(-1px);
    box-shadow: 0 12px 22px rgba(80, 189, 189, 0.28);
  }
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty {
  color: #6b6f76;
  text-align: center;
  padding: 20px;
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e8eef3;
}

.login-msg {
  margin-top: 16px;
  color: #6b6f76;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 40;
  padding: 16px;
}

.modal-card {
  background: white;
  border-radius: 18px;
  padding: 18px 20px 16px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);
  border: 1px solid #e2edf7;
}

.modal-title {
  margin: 0 0 8px;
  color: #50bdbd;
  font-size: 1.1rem;
  font-weight: 800;
}

.modal-text {
  margin: 0 0 16px;
  font-size: 0.92rem;
  color: #475569;
  line-height: 1.45;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.modal-btn {
  border-radius: 999px;
  border: none;
  padding: 9px 14px;
  min-height: 42px;
  font-weight: 700;
  cursor: pointer;
  background: #50bdbd;
  color: #fff;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease;
}

@media (hover: hover) {
  .modal-btn:hover:not(:disabled) {
    background: #3ea9a9;
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(80, 189, 189, 0.2);
  }
}

.modal-btn.soft {
  background: #ffffff;
  color: #50bdbd;
  border: 1px solid #b6ebe5;
}

@media (hover: hover) {
  .modal-btn.soft:hover:not(:disabled) {
    background: #e0faf7;
  }
}

.modal-btn.danger {
  background: #ef4444;
}

@media (hover: hover) {
  .modal-btn.danger:hover:not(:disabled) {
    background: #dc2626;
  }
}

.modal-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .contenido {
    padding: 16px 12px 96px;
  }

  .page-title {
    font-size: 1.35rem;
  }

  .form-message {
    margin-left: 0;
    max-width: 100%;
  }

  .post-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .delete-forum-btn {
    width: 100%;
  }

  .comment-header {
    align-items: flex-start;
  }

  .date {
    margin-left: 0;
  }

  .btn-primary {
    width: 100%;
  }
}

@media (max-width: 520px) {
  .modal-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .modal-actions .modal-btn {
    width: 100%;
  }

  .delete-comment-btn {
    width: 100%;
  }
}
</style>