<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/composables/useSupabase'
import { usePremium } from '@/composables/usePremium'
import { useAuthStore } from '@/store/auth'

const auth = useAuthStore()

const isAdmin = computed(() => (auth.user as any)?.email === 'admin@nura.app')


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
const { isPremium, refresh: refreshPremium } = usePremium()

const q = ref('')
const categories = ['Alimentación', 'Ansiedad', 'Autoestima'] as const
const activeCat = ref<string | 'Todas'>('Todas')

const forums = ref<ForumRow[]>([])
const commentCount = ref<Map<string, number>>(new Map())
const loading = ref(true)

const showUpsell = ref(false)

const showPremiumCta = computed(() => !isPremium.value)

const ctaTitle = computed(() => 'Solo Premium')
const ctaText = computed(() => 'Para publicar un foro necesitás el plan Premium. Podés leer y comentar gratis.')

const showPurge = ref(false)
const purging = ref(false)

function askPurge() {
  showPurge.value = true
}

async function confirmPurge() {
  if (!isAdmin.value) return
  purging.value = true
  try {
    const { error } = await supabase.rpc('admin_purge_forum')
    if (error) throw error
    showPurge.value = false
    await loadForums()
  } catch (e) {
    console.error(e)
  } finally {
    purging.value = false
  }
}

function goPremium() {
  router.push('/app/premium')
}

async function loadForums() {
  loading.value = true

  const { data: f } = await supabase
    .from('forums')
    .select('id,user_id,title,body,category,created_at')
    .order('created_at', { ascending: false })

  forums.value = (f as ForumRow[]) ?? []

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

let channel: ReturnType<typeof supabase.channel> | null = null
function setupRealtime() {
  channel = supabase
    .channel('forums-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forums' }, (payload: any) => {
      forums.value = [payload.new as ForumRow, ...forums.value]
    })
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'forum_comments' },
      (payload: any) => {
        const fid = (payload.new as CommentRow).forum_id
        commentCount.value.set(fid, (commentCount.value.get(fid) ?? 0) + 1)
        commentCount.value = new Map(commentCount.value)
      }
    )
    .subscribe()
}

onMounted(async () => {
  await refreshPremium()
  await loadForums()
  setupRealtime()
})

onBeforeUnmount(() => {
  if (channel) supabase.removeChannel(channel)
})

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  return forums.value.filter((f) => {
    const catOk = activeCat.value === 'Todas' || f.category === activeCat.value
    const txt = `${f.title ?? ''} ${f.body ?? ''}`.toLowerCase()
    const textOk = !term || txt.includes(term)
    return catOk && textOk
  })
})

function openForum(f: ForumRow) {
  router.push({ name: 'foro-view', params: { id: f.id } })
}

function goNewForum() {
  if (!isPremium.value) {
    showUpsell.value = true
    return
  }
  router.push({ name: 'foro-new' })
}

function countFor(id: string) {
  return commentCount.value.get(id) ?? 0
}
</script>

<template>
  <h1 class="visually-hidden">Foro Nura</h1>

  <main class="foro">
    <header class="page-head">
      <h2>Foro</h2>
      <p class="subtitle">Compartí experiencias, dudas y recursos con la comunidad.</p>

      <div v-if="showPremiumCta" class="premium-inline">
        <div class="premium-inline__left">
          <div class="premium-inline__top">
            <span class="premium-badge">Gratis</span>
          </div>
          <p class="premium-inline__title">{{ ctaTitle }}</p>
          <p class="premium-inline__desc">{{ ctaText }}</p>
        </div>

        <button type="button" class="premium-inline__btn" @click="goPremium">
          Pasar a Premium
        </button>
      </div>
    </header>


    <div v-if="isAdmin" style="display:flex;justify-content:flex-end;margin:10px 0;">
  <button class="pill" type="button" style="background:#ef4444;color:#fff;border:none;" @click="askPurge">
    Borrar todo el foro
  </button>
</div>

<div v-if="showPurge" class="modal-overlay" @click.self="showPurge = false">
  <div class="modal-card" role="dialog" aria-modal="true">
    <h3 class="modal-title">¿Borrar TODO?</h3>
    <p class="modal-text">Se eliminarán todos los foros y comentarios. Esta acción no se puede deshacer.</p>
    <div class="modal-actions">
      <button class="modal-btn soft" type="button" @click="showPurge = false">Cancelar</button>
      <button class="modal-btn" type="button" :disabled="purging" style="background:#ef4444" @click="confirmPurge">
        {{ purging ? 'Borrando…' : 'Borrar todo' }}
      </button>
    </div>
  </div>
</div>


    <div class="search">
      <label for="forum-search" class="visually-hidden">Buscar en el foro</label>
      <span class="loupe">🔍</span>
      <input id="forum-search" v-model="q" type="search" placeholder="Buscar por tema o palabra clave" />
    </div>

    <div class="filters" aria-label="Filtrar por categoría">
      <button class="pill" :class="{ active: activeCat === 'Todas' }" type="button" @click="activeCat = 'Todas'">
        Todas
      </button>
      <button
        v-for="c in categories"
        :key="c"
        class="pill"
        type="button"
        :class="{ active: activeCat === c }"
        @click="activeCat = c"
      >
        {{ c }}
      </button>
    </div>

    <div v-if="loading" class="loading">Cargando foros…</div>
    <p v-else-if="!filtered.length" class="empty">No hay foros para mostrar con esos filtros.</p>

    <ul v-else class="forum-list">
      <li v-for="f in filtered" :key="f.id" class="forum-item" @click="openForum(f)">
        <span class="dot"></span>
        <span class="title">{{ f.title }}</span>
        <small class="count">({{ countFor(f.id) }})</small>
      </li>
    </ul>

    <div class="cta">
      <button class="btn-primary" type="button" @click="goNewForum">
        Nuevo foro
      </button>
    </div>

    <div v-if="showUpsell" class="modal-overlay" @click.self="showUpsell = false">
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="Requiere Premium">
        <h3 class="modal-title">Requiere Premium</h3>
        <p class="modal-text">Para crear un foro necesitás el plan Premium.</p>
        <div class="modal-actions">
          <button class="modal-btn soft" type="button" @click="showUpsell = false">Entendido</button>
          <button class="modal-btn" type="button" @click="goPremium">Suscribirme</button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.foro {
  background: #fff;
  max-width: 1100px;
  margin: 0 auto;
  padding: 18px 18px 26px;
}

.page-head {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

h2 {
  margin: 0 0 2px;
  color: #50bdbd;
  font-size: 1.4rem;
}

.subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: #6b7280;
}

.premium-inline {
  background: #f6fffe;
  border: 1px solid #b6ebe5;
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow: 0 10px 18px rgba(80, 189, 189, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 6px;
}

.premium-inline__left {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.premium-inline__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.premium-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(80, 189, 189, 0.15);
  color: #137b7b;
  font-weight: 800;
  font-size: 0.72rem;
}

.premium-inline__right {
  font-size: 0.78rem;
  color: #475569;
  font-weight: 800;
  white-space: nowrap;
}

.premium-inline__title {
  margin: 0;
  font-weight: 900;
  color: #0f172a;
  font-size: 0.9rem;
  line-height: 1.15;
}

.premium-inline__desc {
  margin: 0;
  color: #475569;
  font-size: 0.82rem;
  line-height: 1.25;
}

.premium-inline__btn {
  border: none;
  border-radius: 999px;
  padding: 7px 10px;
  font-weight: 900;
  font-size: 0.82rem;
  cursor: pointer;
  background: #50bdbd;
  color: #fff;
  white-space: nowrap;
}

.premium-inline__btn:hover {
  background: #3daaaa;
}

.search {
  position: relative;
  margin: 12px 0 16px;
}

.search .loupe {
  position: absolute;
  left: 12px;
  top: 50%;
  translate: 0 -50%;
  opacity: 0.6;
  pointer-events: none;
}

.search input {
  width: 100%;
  padding: 12px 14px 12px 36px;
  border-radius: 999px;
  border: 1px solid #e3edf2;
  background: #f6fbff;
  outline: none;
  font-size: 0.95rem;
}

.filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin: 8px 0 14px;
}

.pill {
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid #cfe7f3;
  background: #eaf6ff;
  color: #2d2d2d;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.9rem;
}

.pill.active {
  background: #50bdbd;
  color: #fff;
  border-color: transparent;
}

.forum-list {
  list-style: none;
  padding: 0;
  margin: 6px 0 18px;
  display: grid;
  gap: 10px;
}

.forum-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid #e8eef3;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.04);
  cursor: pointer;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #50bdbd;
}

.title {
  flex: 1;
  color: #111827;
  font-size: 0.95rem;
}

.count {
  opacity: 0.7;
  font-size: 0.85rem;
}

.cta {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.btn-primary {
  padding: 12px 20px;
  border-radius: 999px;
  border: none;
  background: #50bdbd;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 10px 26px rgba(80, 189, 189, 0.45);
}

.loading,
.empty {
  opacity: 0.75;
  font-size: 0.9rem;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
  padding: 16px;
}

.modal-card {
  background: #ffffff;
  border-radius: 18px;
  max-width: 520px;
  width: 70%;
  padding: 16px 16px 12px;
  box-shadow: 0 18px 40px rgba(30, 41, 59, 0.22);
  border: 1px solid #e8eef3;
}

.modal-title {
  margin: 0 0 10px;
  font-size: 1.15rem;
  font-weight: 900;
  color: #0f172a;
}

.modal-text {
  margin: 0 0 12px;
  color: #475569;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-btn {
  border-radius: 999px;
  border: none;
  padding: 9px 14px;
  font-weight: 900;
  cursor: pointer;
  background: #50bdbd;
  color: #fff;
}

.modal-btn.soft {
  background: #ffffff;
  color: #50bdbd;
  border: 1px solid #b6ebe5;
}

@media (max-width: 640px) {
  .premium-inline {
    flex-direction: column;
    align-items: stretch;
  }
  .premium-inline__btn {
    width: 100%;
  }
}
</style>