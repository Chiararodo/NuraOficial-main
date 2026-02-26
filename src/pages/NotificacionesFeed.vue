<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'
import { useNotificationsStore } from '@/store/notifications'
import { useNotificationSettings } from '@/composables/useNotificationSettings'
import type { RealtimeChannel } from '@supabase/supabase-js'

type NotificationRow = {
  id: string
  user_id: string
  title: string
  body: string | null
  type: string | null
  created_at: string
  is_read: boolean
  read_at: string | null
}

const router = useRouter()
const auth = useAuthStore()
const notifStore = useNotificationsStore()
const prefs = useNotificationSettings()

const items = ref<NotificationRow[]>([])
const loading = ref(true)
const channel = ref<RealtimeChannel | null>(null)

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const NURI_ICON = '/icons/nuri-bien.png'
const NURA_LOGO = '/logos/isotipo.png'

function isWellbeing(n: NotificationRow) {
  const t = String(n.type || '').toLowerCase()
  const title = String(n.title || '').toLowerCase()
  if (t === 'daily') return true
  if (t.includes('bienestar')) return true
  if (t.includes('wellbeing')) return true
  if (t.includes('reminder')) return true
  if (
    title.includes('micro logros') ||
    title.includes('chequeo de sueño') ||
    title.includes('respirá') ||
    title.includes('respira')
  ) return true
  return false
}

function categoryFor(n: NotificationRow): 'bienestar' | 'profesional' | 'app_updates' {
  const t = String(n.type || '').toLowerCase()

  if (isWellbeing(n) || t === 'daily') return 'bienestar'

  if (
    t.includes('appointment') ||
    t.includes('turno') ||
    t.includes('professional') ||
    t.includes('profesional')
  ) {
    return 'profesional'
  }

  return 'app_updates'
}

function shouldShow(n: NotificationRow) {
  const cat = categoryFor(n)
  return prefs.categoryEnabled(cat)
}

function avatarFor(n: NotificationRow) {
  return isWellbeing(n) ? NURI_ICON : NURA_LOGO
}

const visibleItems = computed(() => items.value.filter(shouldShow))
const unread = computed(() => visibleItems.value.filter((n) => !n.is_read))
const read = computed(() => visibleItems.value.filter((n) => n.is_read))

async function ensureDailyNotificationsForToday() {
  if (!auth.user) return
  if (!prefs.categoryEnabled('bienestar')) return

  const today = new Date().toISOString().slice(0, 10)
  const localKey = `nura_daily_notifs_last_${auth.user.id}`
  const lastGenerated = localStorage.getItem(localKey)
  if (lastGenerated === today) return

  const start = new Date(`${today}T00:00:00.000Z`)
  const end = new Date(start.getTime())
  end.setUTCDate(end.getUTCDate() + 1)

  const { data, error } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('type', 'daily')
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())

  if (!error) {
    const already = data?.length ?? 0
    if (already >= 3) {
      localStorage.setItem(localKey, today)
      return
    }
  }

  const templates = [
    { title: 'Micro logros', body: 'Elegí una sola cosa chiquita para hacer hoy.', type: 'daily' },
    { title: 'Chequeo de sueño', body: 'Dormir bien cambia el ánimo. Intentá descansar mejor hoy.', type: 'daily' },
    { title: 'Respirá profundo', body: 'Tomate 1 minuto para inhalar y exhalar profundo.', type: 'daily' }
  ]

  const toInsert = templates.map((t) => ({ ...t, user_id: auth.user!.id }))
  const { error: insertError } = await supabase.from('notifications').insert(toInsert)
  if (!insertError) localStorage.setItem(localKey, today)
}

async function load() {
  if (!auth.user) {
    loading.value = false
    return
  }

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })

  items.value = (data ?? []) as NotificationRow[]
  loading.value = false
}

function setupRealtime() {
  if (!auth.user) return
  if (channel.value) return

  channel.value = supabase
    .channel(`notifications-feed-${auth.user.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${auth.user.id}`
      },
      (payload: any) => {
        const newRow = payload.new as NotificationRow | null
        const oldRow = payload.old as NotificationRow | null

        if (payload.eventType === 'INSERT' && newRow) {
          if (!items.value.some((n) => n.id === newRow.id)) items.value.unshift(newRow)
        }
        if (payload.eventType === 'UPDATE' && newRow) {
          items.value = items.value.map((n) => (n.id === newRow.id ? newRow : n))
        }
        if (payload.eventType === 'DELETE' && oldRow) {
          items.value = items.value.filter((n) => n.id !== oldRow.id)
        }

        notifStore.refreshTodayCount()
      }
    )
    .subscribe()
}

async function handleMarkAsRead(id: string) {
  await notifStore.markAsRead(id)
  items.value = items.value.map((n) =>
    n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
  )
}

async function handleDeleteOne(id: string) {
  await supabase.from('notifications').delete().eq('id', id).eq('user_id', auth.user?.id ?? '---')
  items.value = items.value.filter((n) => n.id !== id)
  notifStore.refreshTodayCount()
}

async function handleDeleteAll() {
  await supabase.from('notifications').delete().eq('user_id', auth.user?.id ?? '---')
  items.value = []
  notifStore.refreshTodayCount()
}

function goBack() {
  router.back()
}

onMounted(async () => {
  prefs.loadFromLocal()
  await prefs.loadFromSupabase()

  await ensureDailyNotificationsForToday()
  await load()
  setupRealtime()
})

onUnmounted(async () => {
  if (channel.value) {
    await channel.value.unsubscribe()
    channel.value = null
  }
})
</script>

<template>
  <main class="notifications-page">
    <header class="page-head">
      <h2>Notificaciones</h2>
    </header>

    

    <p v-if="loading" class="state">Cargando...</p>

    <div v-else-if="!items.length" class="empty-wrapper">
      <p class="empty-text">Aún no tenés notificaciones.</p>
    </div>

    

    <div v-else :class="['columns-wrapper', { 'single-column': !read.length }]">
      <section class="column">
        <header class="column-head">
          <h3>Nuevas</h3>
        
 <button class="danger-btn" @click="handleDeleteAll">Borrar todas</button>

 </header>
        <p v-if="!unread.length" class="state small">No hay nuevas.</p>

        <ul v-else class="list">
          <li v-for="n in unread" :key="n.id" class="card card-unread">
            <div class="card-avatar">
              <img :src="avatarFor(n)" class="avatar-img" :alt="isWellbeing(n) ? 'Nuri' : 'Nura'" />
            </div>

            <div class="card-main">
              <h4>{{ n.title }}</h4>
              <p v-if="n.body" class="body">{{ n.body }}</p>
              <p class="meta">{{ formatDate(n.created_at) }}</p>
            </div>

            <div class="card-actions">
              <button class="icon-btn check" @click="handleMarkAsRead(n.id)">✓</button>
              <button class="icon-btn close" @click="handleDeleteOne(n.id)">x</button>
            </div>
          </li>
        </ul>
      </section>

      <section v-if="read.length" class="column">
        <header class="column-head">
          <h3>Vistas</h3>
        </header>

        <ul class="list">
          <li v-for="n in read" :key="n.id" class="card card-read">
            <div class="card-avatar avatar-muted">
              <img :src="avatarFor(n)" class="avatar-img" :alt="isWellbeing(n) ? 'Nuri' : 'Nura'" />
            </div>

            <div class="card-main">
              <h4>{{ n.title }}</h4>
              <p v-if="n.body" class="body">{{ n.body }}</p>
              <p class="meta">
                {{ n.read_at ? 'Leída ' + formatDate(n.read_at) : formatDate(n.created_at) }}
              </p>
            </div>

            <div class="card-actions">
              <button class="icon-btn close" @click="handleDeleteOne(n.id)">×</button>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <footer v-if="items.length" class="page-actions">
    </footer>
  </main>
</template>

<style scoped>
.notifications-page {
  background: #fff;
  padding: 24px 18px 48px;
  max-width: 1100px;
  margin: 0 auto;
}

.page-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.page-head h2 {
  margin: 0;
  padding: 10px;
}

.state {
  font-size: 0.95rem;
  color: #6b7280;
  margin-top: 8px;
}

.state.small {
  font-size: 0.85rem;
}

.empty-wrapper {
  padding: 32px 16px;
  text-align: center;
}

.empty-text {
  font-size: 0.95rem;
  color: #6b7280;
}

.columns-wrapper {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-top: 8px;
}

@media (min-width: 768px) {
  .columns-wrapper:not(.single-column) {
    grid-template-columns: 1fr 1fr;
  }
}

.column {
  background: #d9f5f5;
  border-radius: 16px;
  padding: 12px;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.06);
}

.column-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.column-head h3 {
  font-size: 1.2rem;
  font-weight: 600;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 12px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.card-read {
  background: #f1fbfb;
  border-color: #50bdbd33;
}

.card-unread {
  background: #f9fafb;
}

.card-avatar {
  width: 52px;
  height: 52px;
  border-radius: 999px;
  overflow: hidden;
  background: #ffffff;
  padding: 9px;
  margin: 0 0 14px;
  border: 2px solid #b9e6e6;
  display: grid;
  place-items: center;
}

.avatar-muted {
  background: #a5e3e3;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 999px;
}

.card-main {
  flex: 1;
  min-width: 0;
}

.card-main h4 {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.card-main .body {
  font-size: 0.9rem;
  margin-bottom: 4px;
  color: #4b5563;
}

.meta {
  font-size: 0.75rem;
  color: #9ca3af;
}

.card-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: none;
  font-weight: 600;
  line-height: 1;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.icon-btn.check {
  background: #50bdbd;
  color: #ffffff;
  font-size: 1rem;
}

.icon-btn.check:hover {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(80, 189, 189, 0.4);
}

.icon-btn.close {
  background: #ef4444;
  color: #ffffff;
  font-size: 1rem;
}

.icon-btn.close:hover {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(248, 113, 113, 0.4);
}

.page-actions {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.danger-btn {
  border: none;
  background: #b91c1c;
  color: #ffffff;
  padding: 8px 20px;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
}
.danger-btn:hover {
  background: #dc2626;
  transform: translateY(-1px);
}
</style>