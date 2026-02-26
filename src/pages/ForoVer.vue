<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'

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

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const forumId = computed(() => route.params.id as string)
const highlightId = computed(() => (route.query.highlight as string | undefined) || null)

const forum = ref<ForumRow | null>(null)
const comments = ref<CommentRow[]>([])
const errorMsg = ref('')
const newComment = ref('')
const sending = ref(false)

const isAdmin = computed(() => (auth.user as any)?.email === 'admin@nura.app')

const canSend = computed(() => newComment.value.trim().length > 1 && !sending.value)

const userNames = ref<Map<string, string>>(new Map())
const userAvatars = ref<Map<string, string | null>>(new Map())

function seedCurrentUserName() {
  if (!auth.user) return
  const metaName =
    (auth.user.user_metadata as any)?.name?.trim() || auth.user.email?.split('@')[0] || ''
  if (!metaName) return
  const map = new Map(userNames.value)
  map.set(auth.user.id, metaName)
  userNames.value = map
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
  const fromMap = userAvatars.value.get(userId)
  return fromMap ?? null
}

async function loadUserNames() {
  const ids = new Set<string>()
  if (forum.value?.user_id) ids.add(forum.value.user_id)
  comments.value.forEach((c) => c.user_id && ids.add(c.user_id))
  if (ids.size === 0) return

  const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').in(
    'id',
    Array.from(ids)
  )

  if (!data) return

  const nameMap = new Map(userNames.value)
  const avatarMap = new Map(userAvatars.value)

  const avatarPromises: Promise<void>[] = []

  ;(data as any[]).forEach((u) => {
    const existingName = nameMap.get(u.id)
    const displayName = u.full_name?.trim() || existingName || 'Usuario'
    nameMap.set(u.id, displayName)

    if (u.avatar_url) {
      const path = u.avatar_url as string
      avatarPromises.push(
        (async () => {
          const { data: signed, error } = await supabase.storage
            .from('avatars')
            .createSignedUrl(path, 60 * 60 * 24 * 7)
          if (!error && signed?.signedUrl) {
            avatarMap.set(u.id, signed.signedUrl)
          }
        })()
      )
    }
  })

  await Promise.all(avatarPromises)

  userNames.value = nameMap
  userAvatars.value = avatarMap
}

const authorLabel = computed(() => getDisplayName(forum.value?.user_id ?? null))

function displayNameForComment(c: CommentRow) {
  return getDisplayName(c.user_id)
}

function goBack() {
  router.back()
}

function goToProfile(userId?: string | null) {
  if (!userId) return
  router.push({
    name: 'perfil-publico',
    params: { uid: userId }
  })
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

async function loadForum() {
  const { data, error } = await supabase
    .from('forums')
    .select('id,title,body,category,created_at,user_id')
    .eq('id', forumId.value)
    .maybeSingle()

  if (error || !data) {
    console.error(error)
    errorMsg.value = 'No se encontró este foro.'
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

  if (!error && data) {
    comments.value = data as CommentRow[]
  }
}

function scrollToHighlighted() {
  if (!highlightId.value) return
  requestAnimationFrame(() => {
    const el = document.getElementById(highlightId.value as string)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

async function sendComment() {
  if (!canSend.value) return

  sending.value = true
  errorMsg.value = ''

  const text = newComment.value.trim()

  const { data, error } = await supabase
    .from('forum_comments')
    .insert({
      forum_id: forumId.value,
      user_id: auth.user?.id ?? null,
      body: text
    })
    .select('id,forum_id,user_id,body,created_at')
    .single()

  if (error) {
    console.error(error)
    errorMsg.value = 'No se pudo enviar el comentario.'
  } else if (data) {
    const c = data as CommentRow
    comments.value.push(c)
    newComment.value = ''
    if (c.user_id && !userNames.value.get(c.user_id)) {
      await loadUserNames()
    }
  }

  sending.value = false
}

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
  errorMsg.value = ''

  let q = supabase.from('forum_comments').delete().eq('id', commentToDelete.value.id)
  if (!isAdmin.value) q = q.eq('user_id', auth.user.id)

  const { error } = await q

  if (error) {
    console.error(error)
    errorMsg.value = 'No se pudo borrar el comentario.'
  } else {
    comments.value = comments.value.filter((c) => c.id !== commentToDelete.value!.id)
  }

  deleting.value = false
  showConfirmDelete.value = false
  commentToDelete.value = null
}

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
  errorMsg.value = ''

  let q = supabase.from('forums').delete().eq('id', forum.value.id)
  if (!isAdmin.value) q = q.eq('user_id', auth.user.id)

  const { error } = await q

  if (error) {
    console.error(error)
    errorMsg.value = 'No se pudo borrar el foro.'
    deletingForum.value = false
    return
  }

  deletingForum.value = false
  showConfirmDeleteForum.value = false
  router.push({ name: 'foro' })
}

let channel: any = null

function setupRealtime() {
  channel = supabase
    .channel(`forum-comments-${forumId.value}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'forum_comments',
        filter: `forum_id=eq.${forumId.value}`
      },
      async (payload: any) => {
        const c = payload.new as CommentRow
        if (!comments.value.find((x) => x.id === c.id)) {
          comments.value.push(c)
          if (c.user_id && !userNames.value.get(c.user_id)) {
            await loadUserNames()
          }
        }
      }
    )
    .subscribe()
}

onMounted(async () => {
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
  <h1 class="visually-hidden">Foro Ver</h1>

  <main class="contenido ver-foro">
    <button class="back-link" type="button" @click="goBack">
      <span class="arrow">←</span>
    </button>

    <div v-if="errorMsg" class="error">{{ errorMsg }}</div>

    <div v-else-if="forum" class="post-box">
      <div class="post-header">
        <h2>{{ forum.title }}</h2>

        <button v-if="canDeleteForum" type="button" class="delete-forum-btn" @click="askDeleteForum">
          Borrar foro
        </button>
      </div>

      <p class="meta">
        Publicado por
        <button v-if="forum.user_id" class="author-link" @click="goToProfile(forum.user_id)">
          {{ authorLabel }}
        </button>
        <span v-else><strong>{{ authorLabel }}</strong></span>
        · {{ formatDateTime(forum.created_at) }}
      </p>

      <p class="body">{{ forum.body }}</p>

      <span class="tag">{{ forum.category }}</span>
    </div>

    <section class="comments-box">
      <h3>Comentarios ({{ comments.length }})</h3>

      <div v-if="comments.length > 0">
        <div
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
                alt="Avatar"
                class="avatar-img"
              />
              <span v-else class="avatar-initial">
                {{ displayNameForComment(c).charAt(0).toUpperCase() }}
              </span>
            </div>
          </div>

          <div class="comment-body">
            <div class="comment-header">
              <button v-if="c.user_id" class="user-btn" @click="goToProfile(c.user_id)">
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
                @click="askDelete(c)"
              >
                Borrar
              </button>
            </div>

            <p>{{ c.body }}</p>
          </div>
        </div>
      </div>

      <div v-else class="empty">Todavía no hay comentarios. ¡Sé la primera en comentar!</div>
    </section>

    <section v-if="auth.user" class="new-comment">
      <textarea v-model="newComment" placeholder="Escribí un comentario..."></textarea>

      <button class="btn" :disabled="!canSend" @click="sendComment">Comentar</button>
    </section>

    <p v-else class="login-msg">Tenés que iniciar sesión para comentar.</p>

    <div v-if="showConfirmDelete" class="modal-backdrop">
      <div class="modal">
        <h4>¿Eliminar comentario?</h4>
        <p>Esta acción no se puede deshacer.</p>

        <div class="modal-actions">
          <button class="modal-cancel" @click="cancelDelete">Cancelar</button>
          <button class="modal-delete" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? 'Borrando…' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showConfirmDeleteForum" class="modal-backdrop">
      <div class="modal">
        <h4>¿Eliminar foro?</h4>
        <p>Se borrará todo el contenido y los comentarios.</p>

        <div class="modal-actions">
          <button class="modal-cancel" @click="cancelDeleteForum">Cancelar</button>
          <button class="modal-delete" :disabled="deletingForum" @click="confirmDeleteForum">
            {{ deletingForum ? 'Borrando…' : 'Eliminar foro' }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.contenido {
  background: #fff;
  padding: 24px 18px 48px;
  max-width: 1100px;
  margin: 0 auto;
}

.ver-foro {
  padding: 16px;
}

.back-link {
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 0;
}

.arrow {
  font-size: 1.5rem;
  color: #46bdbd;
}

.error {
  margin-top: 10px;
  color: #b3261e;
}

.post-box {
  background: white;
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
}

.post-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.meta {
  color: #6b6f76;
  font-size: 0.9rem;
  margin-bottom: 10px;
}

.author-link {
  border: none;
  background: none;
  padding: 0;
  margin: 0;
  font-weight: 600;
  color: #1f2933;
  cursor: pointer;
}

.tag {
  background: #50bdbd;
  color: white;
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 0.8rem;
}

.comments-box {
  margin-top: 20px;
}

.comment {
  display: flex;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6ad7d7, #2d9c9c);
  padding: 3px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
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
  font-weight: 600;
  color: #2d9c9c;
}

.comment-body {
  flex: 1;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  color: black;
}

.user-btn {
  color: black;
  border: none;
  background: none;
  padding: 0;
  margin: 0;
  font-weight: bold;
  cursor: pointer;
}

.user {
  font-weight: bold;
}

.date {
  font-size: 0.8rem;
  color: #6b6f76;
  margin-left: auto;
}

.delete-forum-btn {
  border-radius: 999px;
  border: none;
  padding: 6px 14px;
  background: #ef4444;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.delete-forum-btn:hover {
  background: #dc2626;
}

.delete-comment-btn {
  border-radius: 999px;
  border: none;
  padding: 6px 14px;
  background: #ef4444;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.delete-comment-btn:hover {
  background: #dc2626;
}

.new-comment textarea {
  width: 95%;
  min-height: 80px;
  border-radius: 12px;
  border: 1px solid #dce5ec;
  padding: 10px;
  font-family: inherit;
}

.btn {
  margin-top: 10px;
  background: #50bdbd;
  color: white;
  border: none;
  padding: 10px 14px;
  border-radius: 999px;
  cursor: pointer;
}

.btn:hover {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(80, 189, 189, 0.35);
}

.btn:disabled {
  opacity: 0.5;
}

.empty {
  color: #6b6f76;
  text-align: center;
  padding: 20px;
}

.login-msg {
  margin-top: 16px;
  color: #6b6f76;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 40;
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 18px 20px;
  width: 70%;
  max-width: 360px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);
}

.modal h4 {
  margin: 0 0 8px;
}

.modal p {
  margin: 0 0 16px;
  font-size: 0.9rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-cancel {
  align-self: flex-start;
  padding: 7px 18px;
  border-radius: 999px;
  border: none;
  background: #50bdbd;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(80, 189, 189, 0.4);
  transition: background 0.15s ease, transform 0.08s ease, box-shadow 0.18s ease;
}

.modal-cancel:hover {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(80, 189, 189, 0.5);
}

.modal-delete {
  background: #ef5350;
  box-shadow: 0 3px 10px rgba(239, 83, 80, 0.3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #ffffff;
  border: none;
  border-radius: 999px;
  padding: 7px 14px;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
}

.modal-delete:hover {
  background: #e53935;
}

.modal-delete:disabled {
  opacity: 0.6;
}

.highlighted {
  background: #e0f7f7;
  border-radius: 8px;
}

.comment {
  padding: 8px;
  margin-bottom: 8px;
}
</style>