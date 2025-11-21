<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/composables/useSupabase'

type ForumRow = {
  id: string
  user_id: string | null
  title: string
  body: string | null
  category: 'Alimentación' | 'Ansiedad' | 'Autoestima' | string
  created_at: string
}

type CommentRow = {
  id: string
  forum_id: string
  user_id: string | null
  body: string
  created_at: string
}

const router = useRouter()

/* -------- UI state -------- */
const q = ref('')
const categories = ['Alimentación', 'Ansiedad', 'Autoestima'] as const
const activeCat = ref<string | 'Todas'>('Todas')

/* -------- Data -------- */
const forums = ref<ForumRow[]>([])
const commentCount = ref<Map<string, number>>(new Map())
const loading = ref(true)

/* -------- Fetch -------- */
async function loadForums() {
  loading.value = true
  const { data: f } = await supabase
    .from('forums')
    .select('id,user_id,title,body,category,created_at')
    .order('created_at', { ascending: false })
  forums.value = (f as ForumRow[]) ?? []

  // Traigo comentarios recientes y armo conteo por foro (rápido y simple)
  const { data: c } = await supabase
    .from('forum_comments')
    .select('id,forum_id')
    .order('created_at', { ascending: false })
    .limit(2000)

  const map = new Map<string, number>()
  ;(c as CommentRow[] | null)?.forEach((r) => {
    map.set(r.forum_id, (map.get(r.forum_id) ?? 0) + 1)
  })
  commentCount.value = map
  loading.value = false
}

/* -------- Realtime -------- */
let channel: ReturnType<typeof supabase.channel> | null = null
function setupRealtime() {
  channel = supabase
    .channel('forums-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'forums' },
      (payload: any) => {
        forums.value = [payload.new as ForumRow, ...forums.value]
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'forum_comments' },
      (payload: any) => {
        const fid = (payload.new as CommentRow).forum_id
        commentCount.value.set(fid, (commentCount.value.get(fid) ?? 0) + 1)
        // fuerza reactividad
        commentCount.value = new Map(commentCount.value)
      }
    )
    .subscribe()
}

onMounted(async () => {
  await loadForums()
  setupRealtime()
})

onBeforeUnmount(() => {
  if (channel) supabase.removeChannel(channel)
})

/* -------- Filters -------- */
const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  return forums.value.filter((f) => {
    const catOk = activeCat.value === 'Todas' || f.category === activeCat.value
    const txt =
      `${f.title ?? ''} ${f.body ?? ''}`.toLowerCase()
    const textOk = !term || txt.includes(term)
    return catOk && textOk
  })
})

/* -------- Navigation -------- */
function openForum(f: ForumRow) {
  // Asegurate de tener luego una ruta /app/foro/:id
  router.push({ name: 'foro-view', params: { id: f.id } })
}
function goNewForum() {
  // Asegurate de tener luego una ruta /app/foro/new
  router.push({ name: 'foro-new' })
}

/* -------- Helpers UI -------- */
function countFor(id: string) {
  return commentCount.value.get(id) ?? 0
}
</script>

<template>
  <main class="foro">
    <!-- Header simple -->
    <h2>Foro</h2>

    <!-- Search -->
    <div class="search">
      <span class="loupe">🔍</span>
      <input
        v-model="q"
        type="search"
        placeholder="Buscar por tema o palabra clave"
      />
    </div>

    <!-- Filtros por categoría -->
    <div class="filters">
      <button
        class="pill"
        :class="{ active: activeCat === 'Todas' }"
        @click="activeCat = 'Todas'"
      >
        Todas
      </button>
      <button
        v-for="c in categories"
        :key="c"
        class="pill"
        :class="{ active: activeCat === c }"
        @click="activeCat = c"
      >
        {{ c }}
      </button>
    </div>

    <!-- Lista de foros -->
    <div v-if="loading" class="loading">Cargando foros…</div>
    <p v-else-if="!filtered.length" class="empty">No hay foros para mostrar.</p>

    <ul v-else class="forum-list">
      <li
        v-for="f in filtered"
        :key="f.id"
        class="forum-item"
        @click="openForum(f)"
      >
        <span class="dot"></span>
        <span class="title">{{ f.title }}</span>
        <small class="count">({{ countFor(f.id) }})</small>
      </li>
    </ul>

    <!-- Acción principal -->
    <div class="cta">
      <button class="btn-primary" @click="goNewForum">Nuevo foro</button>
    </div>
  </main>
</template>

<style scoped>
.foro{
  background:#fff;
  max-width: 900px;
  margin: 0 auto;
  padding: 18px 18px 26px;
}
h2{
  margin:0 0 10px;
  color:#111;
  font-size:1.4rem;
}

/* Search */
.search{
  position: relative;
  margin-bottom: 16px;
}
.search .loupe{
  position:absolute; left:12px; top:50%; translate:0 -50%;
  opacity:.6; pointer-events:none;
}
.search input{
  width:100%;
  padding:12px 14px 12px 36px;
  border-radius:12px;
  border:1px solid #e3edf2;
  background:#f6fbff;
  outline:none;
}

/* Pills */
.filters{
  display:flex; gap:10px; flex-wrap:wrap;
  margin: 8px 0 14px;
}
.pill{
  padding:8px 14px;
  border-radius:999px;
  border:1px solid #cfe7f3;
  background:#eaf6ff;
  color:#2d2d2d;
  cursor:pointer;
  transition:all .15s ease;
}
.pill:hover{ transform: translateY(-1px); }
.pill.active{
  background:#50bdbd; color:#fff; border-color: transparent;
  box-shadow: 0 0 0 2px rgba(80,189,189,.15) inset;
}

/* List */
.forum-list{ list-style:none; padding:0; margin: 6px 0 18px; display:grid; gap:10px; }
.forum-item{
  display:flex; align-items:center; gap:10px;
  padding:10px 12px;
  background:#fff;
  border-radius:14px;
  border:1px solid #e8eef3;
  box-shadow:0 6px 16px rgba(0,0,0,.04);
  cursor:pointer;
  transition: transform .1s ease, box-shadow .2s ease, background .2s ease;
}
.forum-item:hover{
  background:#f1fbfb;
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(0,0,0,.08);
}
.dot{
  width:8px; height:8px; border-radius:999px; background:#50bdbd; flex:0 0 8px;
}
.title{ flex:1; color:#111; }
.count{ opacity:.7; }

/* CTA */
.cta{
  margin-top: 16px;
  display:flex; justify-content:center;
}
.btn-primary{
  padding:12px 20px;
  border-radius:999px;
  border:none;
  background:#85b6e0;
  color:#fff; font-weight:600;
  cursor:pointer;
  transition: transform .1s ease, box-shadow .2s ease, background .2s ease;
}
.btn-primary:hover{
  background:#50bdbd;
  box-shadow:0 10px 26px rgba(0,0,0,.12);
  transform: translateY(-1px);
}

/* Misc */
.loading,.empty{ opacity:.75; }
</style>
