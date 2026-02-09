<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/composables/useSupabase'

const route = useRoute()
const router = useRouter()
const uid = route.params.uid as string

const user = ref<any | null>(null)
const loading = ref(true)
const errorMsg = ref('')

// NUEVO: URL firmada pública del avatar
const publicAvatar = ref<string | null>(null)

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

function formatDate(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const displayName = computed(() => {
  if (!user.value) return 'Usuario Nura'
  return (
    user.value.name ||
    user.value.full_name ||
    user.value.username ||
    'Usuario Nura'
  )
})

// AHORA usamos la URL firmada
const hasAvatar = computed(() => !!publicAvatar.value)

const initials = computed(() => {
  const n = displayName.value.trim()
  if (!n) return 'U'
  return n.charAt(0).toUpperCase()
})

function goBack() {
  router.back()
}

function goToForum(id: string) {
  router.push({ path: `/app/foro/${id}` })
}

function goToComment(forumId: string, commentId: string) {
  router.push({
    path: `/app/foro/${forumId}`,
    query: { highlight: commentId }
  })
}

onMounted(async () => {
  loading.value = true
  errorMsg.value = ''

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .maybeSingle()

  if (error) {
    console.error('Error cargando perfil público:', error)
    errorMsg.value = 'No se pudo cargar este perfil.'
    user.value = null
    loading.value = false
    return
  }

  user.value = data

  // NUEVO: si tiene avatar_url (path en bucket avatars) generamos signed URL
  if (data?.avatar_url) {
    const { data: signed, error: signError } = await supabase.storage
      .from('avatars')
      .createSignedUrl(data.avatar_url as string, 60 * 60 * 24 * 7) // 7 días

    if (!signError && signed?.signedUrl) {
      publicAvatar.value = signed.signedUrl
    }
  }

  const { count: cCount, error: cError } = await supabase
    .from('forum_comments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid)

  if (!cError && typeof cCount === 'number') {
    commentCount.value = cCount
  }

  const { count: fCount, error: fError } = await supabase
    .from('forums')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid)

  if (!fError && typeof fCount === 'number') {
    forumCount.value = fCount
  }

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

  loading.value = false
})
</script>

<template>
  <h1 class="visually-hidden">Perfil </h1>

  <main class="perfil-publico">
    <p v-if="loading" class="estado">Cargando perfil...</p>

    <p v-else-if="errorMsg" class="estado error">
      {{ errorMsg }}
    </p>

    <section v-else-if="user" class="perfil-card">
      <button class="back-btn" @click="goBack">← </button>

      <div class="avatar-wrapper">
        <img
          v-if="hasAvatar"
          :src="publicAvatar!"
          alt="Foto de perfil"
          class="avatar-img"
        />
        <div v-else class="avatar-placeholder">
          <span>{{ initials }}</span>
        </div>
      </div>

      <h2 class="nombre">
        {{ displayName }}
      </h2>

      <p class="miembro" v-if="user.created_at">
        Miembro desde {{ formatDate(user.created_at) }}
      </p>
      <p class="miembro" v-else>
        Miembro de la comunidad Nura
      </p>

      <div class="badges">
        <span class="badge">Comunidad Nura</span>
        <span class="badge badge-soft">Foro de bienestar</span>
      </div>

      <div class="stats">
        <div class="stat-item">
          <span class="stat-number">
            {{ commentCount ?? '—' }}
          </span>
          <span class="stat-label">Comentarios</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">
            {{ forumCount ?? '—' }}
          </span>
          <span class="stat-label">Foros creados</span>
        </div>
      </div>

      <div v-if="recentForums.length" class="section-list">
        <h3>Foros recientes</h3>
        <ul>
          <li
            v-for="f in recentForums"
            :key="f.id"
            class="clickable"
            @click="goToForum(f.id)"
          >
            <span class="item-title">{{ f.title || 'Foro sin título' }}</span>
            <span class="item-date">{{ formatDate(f.created_at) }}</span>
          </li>
        </ul>
      </div>

      <div v-if="recentComments.length" class="section-list">
        <h3>Comentarios recientes</h3>
        <ul>
          <li
            v-for="c in recentComments"
            :key="c.id"
            class="clickable"
            @click="goToComment(c.forum_id, c.id)"
          >
            <span class="item-body">{{ c.body }}</span>
            <span class="item-date">{{ formatDate(c.created_at) }}</span>
          </li>
        </ul>
      </div>
    </section>

    <p v-else class="estado">No encontramos este perfil.</p>
  </main>
</template>

<style scoped>
.perfil-publico {
  min-height: calc(100vh - 64px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 80px 16px 40px;
  background: #f4f8f8;
  box-sizing: border-box;
}

.estado {
  margin-top: 40px;
  font-size: 0.95rem;
  color: #555;
}

.error {
  color: #c62828;
}

.perfil-card {
  width: 100%;
  max-width: 480px;
  background: #ffffff;
  border-radius: 22px;
  padding: 64px 20px 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  position: relative;
  text-align: center;
  box-sizing: border-box;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
    sans-serif;
}

.back-btn {
  position: absolute;
  top: 12px;
  left: 16px;
  border: none;
  background: transparent;
  color: #1a6a6a;
  font-size: 0.85rem;
  cursor: pointer;
}

.avatar-wrapper {
  position: absolute;
  top: -42px;
  left: 50%;
  transform: translateX(-50%);
  width: 84px;
  height: 84px;
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
  font-weight: 600;
  color: #2d9c9c;
}

.nombre {
  margin-top: 8px;
  margin-bottom: 6px;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a6a6a;
}

.miembro {
  font-size: 0.9rem;
  color: #607d8b;
}

.badges {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.badge {
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 999px;
  background: #e0f5f5;
  color: #1a6a6a;
  font-weight: 500;
}

.badge-soft {
  background: #f3e8ff;
  color: #5b3a8c;
}

.stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 18px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1a6a6a;
}

.stat-label {
  font-size: 0.75rem;
  color: #78909c;
}

.section-list {
  margin-top: 20px;
  text-align: left;
}

.section-list h3 {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1a6a6a;
  margin-bottom: 8px;
}

.section-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.section-list li {
  padding: 8px 0;
  border-bottom: 1px solid #edf2f2;
}

.item-title,
.item-body {
  display: block;
  font-size: 0.85rem;
  color: #37474f;
}

.item-date {
  display: block;
  font-size: 0.75rem;
  color: #90a4ae;
  margin-top: 2px;
}

.clickable {
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
}

.clickable:hover {
  background: #f1fbfb;
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
</style>
