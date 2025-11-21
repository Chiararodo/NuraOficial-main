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

// Estado
const forum = ref<ForumRow | null>(null)
const comments = ref<CommentRow[]>([])
const loadingForum = ref(true)
const loadingComments = ref(true)
const errorMsg = ref('')

// Nuevo comentario
const newComment = ref('')
const sending = ref(false)

const canSend = computed(() => {
  return !sending.value && newComment.value.trim().length > 1
})

function goBack() {
  router.back()
}

/* ---------- Helpers de formato ---------- */
function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Nombre a mostrar para el autor del foro */
const authorLabel = computed(() => {
  if (!forum.value) return 'Usuario'

  // Si el post es del usuario logueado, mostramos su nombre real o mail
  if (auth.user && forum.value.user_id === auth.user.id) {
    const metaName = (auth.user.user_metadata as any)?.name
    if (metaName) return metaName
    if (auth.user.email) return auth.user.email.split('@')[0]
  }

  // Para otros usuarios (de momento) usamos un nombre genérico
  return 'Usuario'
})

/** Nombre a mostrar para cada comentario */
function displayNameForComment(c: CommentRow): string {
  if (auth.user && c.user_id === auth.user.id) {
    const metaName = (auth.user.user_metadata as any)?.name
    if (metaName) return metaName
    if (auth.user.email) return auth.user.email.split('@')[0]
  }
  return 'Usuario'
}

/* ---------- Carga post original ---------- */
async function loadForum() {
  loadingForum.value = true
  errorMsg.value = ''

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

  loadingForum.value = false
}

/* ---------- Carga comentarios ---------- */
async function loadComments() {
  loadingComments.value = true

  const { data, error } = await supabase
    .from('forum_comments')
    .select('id,forum_id,user_id,body,created_at')
    .eq('forum_id', forumId.value)
    .order('created_at', { ascending: true })

  if (error) {
    console.error(error)
  } else {
    comments.value = (data ?? []) as CommentRow[]
  }

  loadingComments.value = false
}

/* ---------- Enviar comentario ---------- */
async function sendComment() {
  if (!canSend.value) return
  sending.value = true
  errorMsg.value = ''

  try {
    const text = newComment.value.trim()

    const { data, error } = await supabase
      .from('forum_comments')
      .insert({
        forum_id: forumId.value,
        user_id: auth.user?.id ?? null,
        body: text,
      })
      .select('id,forum_id,user_id,body,created_at')
      .single()

    if (error) throw error

    if (data) {
      comments.value = [...comments.value, data as CommentRow]
    }

    newComment.value = ''
  } catch (err: any) {
    console.error(err)
    errorMsg.value = 'No se pudo enviar el comentario.'
  } finally {
    sending.value = false
  }
}

/* ---------- Realtime ---------- */
let channel: ReturnType<typeof supabase.channel> | null = null

function setupRealtime() {
  if (!forumId.value) return

  channel = supabase
    .channel(`forum-comments-${forumId.value}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'forum_comments',
        filter: `forum_id=eq.${forumId.value}`,
      },
      (payload: any) => {
        const c = payload.new as CommentRow
        if (!comments.value.find((x) => x.id === c.id)) {
          comments.value = [...comments.value, c]
        }
      }
    )
    .subscribe()
}

onMounted(async () => {
  if (!forumId.value) {
    errorMsg.value = 'Foro no válido.'
    return
  }
  await loadForum()
  if (!errorMsg.value) {
    await loadComments()
    setupRealtime()
  }
})

onBeforeUnmount(() => {
  if (channel) {
    supabase.removeChannel(channel)
    channel = null
  }
})
</script>

<template>
  <main class="foro-view">
    <!-- Header -->
    <header class="head">
      <button class="back-btn" type="button" @click="goBack">←</button>
      <h2>Foro</h2>
    </header>

    <section v-if="loadingForum" class="state">Cargando foro…</section>
    <section v-else-if="errorMsg" class="state error">{{ errorMsg }}</section>

    <section v-else-if="forum" class="content">
      <!-- Post principal -->
      <article class="post-card">
        <p class="post-title">{{ forum.title }}</p>
        <p class="post-meta">
          por {{ authorLabel }} • {{ formatDateTime(forum.created_at) }}
        </p>
        <p class="post-body">
          {{ forum.body }}
        </p>
      </article>

      <!-- Comentarios -->
      <h3 class="comments-title">
        Comentarios ({{ comments.length }})
      </h3>

      <div v-if="loadingComments" class="state">Cargando comentarios…</div>
      <p v-else-if="!comments.length" class="state empty">
        Todavía no hay comentarios. ¡Sé la primera persona en comentar!
      </p>

      <div v-else class="comments-list">
        <article v-for="c in comments" :key="c.id" class="comment">
          <div class="avatar">
            <span>🙂</span>
          </div>
          <div class="comment-body">
            <div class="comment-header">
              <span class="name">{{ displayNameForComment(c) }}</span>
              <span class="time">{{ formatTime(c.created_at) }}</span>
            </div>
            <p class="text">{{ c.body }}</p>
          </div>
        </article>
      </div>

      <!-- Mensaje de error envío -->
      <p v-if="errorMsg && !loadingForum" class="state error">
        {{ errorMsg }}
      </p>

      <!-- Composer -->
      <div class="composer-wrap">
        <form class="composer" @submit.prevent="sendComment">
          <input
            v-model="newComment"
            type="text"
            placeholder="Escribí tu comentario…"
          />
          <button type="submit" :disabled="!canSend">
            {{ sending ? 'Enviando…' : 'Enviar' }}
          </button>
        </form>
      </div>
    </section>
  </main>
</template>

<style scoped>
.foro-view{
  background:#fff;
  max-width:900px;
  margin:0 auto;
  padding:0 18px 24px;
  min-height: calc(100dvh - 64px);
}

/* Header */
.head{
  display:flex;
  align-items:center;
  gap:8px;
  padding:16px 0 10px;
}
.head h2{
  margin:0;
  font-size:1.3rem;
  color:#111;
}
.back-btn{
  border:none;
  background:#50bdbd;
  color:#fff;
  width:32px;
  height:32px;
  border-radius:999px;
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
}

.content{
  display:grid;
  gap:16px;
}

/* Post principal */
.post-card{
  background:#eaf6ff;
  border-radius:16px;
  padding:12px 14px;
}
.post-title{
  margin:0 0 4px;
  font-weight:600;
}
.post-meta{
  margin:0 0 8px;
  font-size:.8rem;
  opacity:.75;
}
.post-body{
  margin:0;
  font-size:.95rem;
}

/* Comentarios */
.comments-title{
  margin:0;
  font-size:1rem;
  font-weight:600;
}

.comments-list{
  display:grid;
  gap:10px;
}
.comment{
  display:flex;
  gap:10px;
  padding:10px 12px;
  border-radius:16px;
  background:#f3fbfb;
  border:1px solid #e0edf5;
}
.avatar{
  width:38px;
  height:38px;
  border-radius:50%;
  background:#d8f0ec;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-shrink:0;
}
.comment-body{
  flex:1;
}
.comment-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:2px;
}
.name{
  font-weight:600;
  font-size:.9rem;
}
.time{
  font-size:.8rem;
  opacity:.7;
}
.text{
  margin:2px 0 0;
  font-size:.92rem;
}

/* Composer */
.composer-wrap{
  position:sticky;
  bottom:0;
  padding-top:8px;
  background: linear-gradient(to top, #fff 70%, rgba(255,255,255,0));
}
.composer{
  display:flex;
  gap:8px;
  padding:8px 0 2px;
}
.composer input{
  flex:1;
  border-radius:999px;
  border:1px solid #e3edf2;
  background:#f6fbff;
  padding:8px 12px;
  font-size:.9rem;
}
.composer button{
  border:none;
  border-radius:999px;
  padding:8px 14px;
  background:#85b6e0;
  color:#fff;
  font-weight:600;
  cursor:pointer;
  transition:background .15s ease, transform .1s ease, box-shadow .2s ease;
}
.composer button:disabled{
  opacity:.5;
  cursor:not-allowed;
  box-shadow:none;
  transform:none;
}
.composer button:not(:disabled):hover{
  background:#50bdbd;
  box-shadow:0 8px 20px rgba(0,0,0,.12);
  transform:translateY(-1px);
}

/* Estados */
.state{
  font-size:.9rem;
  opacity:.8;
}
.state.error{
  color:#b3261e;
}
.state.empty{
  opacity:.7;
}
</style>
