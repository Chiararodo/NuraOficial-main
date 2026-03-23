<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/composables/useSupabase'

type Mood = 'triste' | 'normal' | 'bien' | 'muybien'

const router = useRouter()
const auth = useAuthStore()

const BUCKET_PUBLIC = 'nura-content'
const BUCKET_LEGACY = 'avatars'

const profile = ref<{
  id: string
  name?: string | null
  full_name?: string | null
  avatar_url?: string | null
  premium?: boolean | null
  is_admin?: boolean | null
  plan?: string | null
  created_at?: string
  plan_expires_at?: string | null
} | null>(null)

const user = ref<any>(null)
const diaryPreview = ref<{ date: string; mood: Mood; snippet: string }[]>([])

function cacheBust(url: string) {
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

function publicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data?.publicUrl ? cacheBust(data.publicUrl) : ''
}

async function resolveAvatarAny(
  value: string | null | undefined
): Promise<string | null> {
  const raw = (value || '').trim()
  if (!raw) return null

  if (/^https?:\/\//i.test(raw)) return cacheBust(raw)

  const path = normalizeAvatarValue(raw)

  const u1 = publicUrl(BUCKET_PUBLIC, path)
  if (u1) return u1

  const u2 = publicUrl(BUCKET_LEGACY, path)
  if (u2) return u2

  const { data: signed, error } = await supabase.storage
    .from(BUCKET_LEGACY)
    .createSignedUrl(path, 60 * 60 * 24 * 7)

  if (!error && signed?.signedUrl) return cacheBust(signed.signedUrl)
  return null
}

const profileName = computed(() => {
  const p = profile.value
  const direct = p?.name || p?.full_name
  if (direct && String(direct).trim()) return String(direct)

  const metaName = (auth.user?.user_metadata as any)?.name
  if (metaName && String(metaName).trim()) return String(metaName)

  return (auth.user?.email || 'Usuario').split('@')[0]
})

const userEmail = computed(() => auth.user?.email ?? '')

const memberSinceYear = computed(() => {
  const iso = auth.user?.created_at
  if (!iso) return ''
  return String(new Date(iso).getFullYear())
})

const avatarPath = computed<string | null>(() => {
  const meta = (auth.user?.user_metadata as any) || {}
  const fromProfile = (profile.value?.avatar_url as string | null | undefined) ?? null
  const fromMeta = (meta.avatar_url as string | null | undefined) ?? null
  return fromProfile || fromMeta || null
})

const avatarUrl = ref<string>('')
const avatarOk = ref(false)

function fallbackInitial() {
  const base = profileName.value || auth.user?.email || 'U'
  return base.trim()[0]?.toUpperCase() || 'U'
}

async function refreshAvatar() {
  const resolved = await resolveAvatarAny(avatarPath.value)
  avatarUrl.value = resolved || ''
  avatarOk.value = !!resolved
}

function onAvatarError() {
  avatarOk.value = false
  avatarUrl.value = ''
}

const premiumDb = ref(false)
const loadingPremium = ref(true)

const isPremium = computed(() => {
  return premiumDb.value || localStorage.getItem('nura_is_premium') === 'true'
})

function syncPremiumCache(value: boolean) {
  if (value) localStorage.setItem('nura_is_premium', 'true')
  else localStorage.removeItem('nura_is_premium')
}

async function loadPremiumStatus() {
  if (!auth.user) {
    premiumDb.value = false
    loadingPremium.value = false
    syncPremiumCache(false)
    return
  }

  loadingPremium.value = true
  const { data, error } = await supabase
    .from('profiles')
    .select('premium')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (!error && data) {
    premiumDb.value = !!data.premium
    syncPremiumCache(premiumDb.value)
  }
  loadingPremium.value = false
}

async function loadProfile() {
  if (!auth.user) return

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', auth.user.id)
    .maybeSingle()

  const fallbackName =
    (auth.user.user_metadata as any)?.name ??
    auth.user.email?.split('@')[0] ??
    'Usuario'

  if (error || !data) {
    const fallback = {
      id: auth.user.id as string,
      name: fallbackName,
      full_name: fallbackName,
      avatar_url: null,
      premium: false,
      is_admin: false,
      plan: 'free',
      plan_expires_at: null,
      created_at: auth.user.created_at as string
    }
    profile.value = fallback
    user.value = fallback
    premiumDb.value = false
    syncPremiumCache(false)
    loadingPremium.value = false
    return
  }

  profile.value = {
    ...data,
    name: data.name && String(data.name).trim() ? data.name : fallbackName
  }
  user.value = profile.value
  premiumDb.value = !!profile.value?.premium
  syncPremiumCache(premiumDb.value)
  loadingPremium.value = false
}

const meds = ref<any[]>([])
const loadingMeds = ref(true)

async function loadMeds() {
  if (!auth.user) {
    loadingMeds.value = false
    return
  }

  const { data, error } = await supabase
    .from('medications')
    .select('id, name, dose')
    .eq('user_id', auth.user.id)

  if (!error && data) meds.value = data
  loadingMeds.value = false
}

function goMeds() {
  router.push('/app/medicaciones')
}

const moodsHistory = ref<{ date: string; mood: Mood }[]>([])

function loadLocalData() {
  if (!auth.user) return

  const moodsKey = `nura_moods_${auth.user.id}`
  const storedMoods = JSON.parse(localStorage.getItem(moodsKey) || '{}') as Record<string, Mood>

  const today = new Date()
  const sevenDaysAgoDate = new Date()
  sevenDaysAgoDate.setDate(today.getDate() - 6)

  const todayStr = today.toISOString().slice(0, 10)
  const sevenDaysAgoStr = sevenDaysAgoDate.toISOString().slice(0, 10)

  moodsHistory.value = Object.entries(storedMoods)
    .filter(([dateStr]) => dateStr >= sevenDaysAgoStr && dateStr <= todayStr)
    .map(([date, mood]) => ({ date, mood }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
}

const recentMoods = computed(() => {
  if (!auth.user) return []
  const key = `nura_moods_${auth.user.id}`
  const stored = JSON.parse(localStorage.getItem(key) || '{}')
  const entries = Object.entries(stored) as [string, Mood][]
  const sorted = entries.sort(
    (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
  )
  return sorted.slice(0, 3)
})

function setMood(mood: Mood) {
  const today = new Date().toISOString().slice(0, 10)
  if (auth.user) {
    const key = `nura_moods_${auth.user.id}`
    const stored = JSON.parse(localStorage.getItem(key) || '{}') as Record<string, Mood>
    stored[today] = mood
    localStorage.setItem(key, JSON.stringify(stored))
  }
  router.push({ name: 'mood-success', query: { mood, date: today } })
}

function goDiaryList() {
  router.push('/app/diario/entradas')
}

const showLogoutModal = ref(false)
const loggingOut = ref(false)

function openLogoutModal() {
  showLogoutModal.value = true
}

function closeLogoutModal() {
  if (!loggingOut.value) showLogoutModal.value = false
}

async function confirmLogout() {
  loggingOut.value = true
  await supabase.auth.signOut()
  auth.$reset?.()
  router.replace('/login')
}

const isAdmin = computed(() => user.value?.is_admin === true)

async function activatePremiumAdmin() {
  if (!auth.user || !isAdmin.value) return
  await supabase
    .from('profiles')
    .update({ premium: true, plan: 'premium', plan_expires_at: null })
    .eq('id', auth.user.id)

  premiumDb.value = true
  syncPremiumCache(true)
  await loadProfile()
}

async function deactivatePremiumAdmin() {
  if (!auth.user || !isAdmin.value) return
  await supabase
    .from('profiles')
    .update({ premium: false, plan: 'free', plan_expires_at: null })
    .eq('id', auth.user.id)

  premiumDb.value = false
  syncPremiumCache(false)
  await loadProfile()
}

onMounted(async () => {
  await loadProfile()
  await loadPremiumStatus()
  loadLocalData()
  setTimeout(loadMeds, 150)
  await refreshAvatar()
})

watch(avatarPath, async () => {
  await refreshAvatar()
})

const avatarInitial = computed(() => fallbackInitial())
</script>

<template>
  <h1 class="visually-hidden">{{ $t('profile.title') }}</h1>

  <main class="contenido">
    <header class="page-head">
      <h2 class="page-title">{{ $t('profile.title') }}</h2>
    </header>

    <div class="grid">
      <section class="col">
        <div class="card profile-head">
          <div class="avatar-container">
            <img
              v-if="avatarOk"
              :src="avatarUrl"
              class="avatar-img"
              :alt="$t('profile.avatarAlt')"
              @error="onAvatarError"
            />
            <div v-else class="avatar-fallback">{{ avatarInitial }}</div>
          </div>

          <div class="who">
            <p class="name">{{ profileName }}</p>
            <p class="email">{{ userEmail }}</p>
            <p class="since" v-if="memberSinceYear">
              {{ $t('profile.memberSince', { year: memberSinceYear }) }}
            </p>

            <button
              class="btn btn-full"
              type="button"
              @click="router.push('/app/perfil/editar')"
            >
              {{ $t('profile.edit') }}
            </button>
          </div>
        </div>

        <div class="card premium-box">
          <template v-if="user">
            <div class="premium-head-row">
              <h2 class="section-title">
                {{ isPremium ? $t('profile.plan.premiumTitle') : $t('profile.plan.freeTitle') }}
              </h2>

              <span class="premium-pill" :class="{ 'premium-pill--free': !isPremium }">
                <span class="premium-dot" :class="{ 'premium-dot--free': !isPremium }"></span>
                {{ isPremium ? $t('profile.plan.active') : $t('profile.plan.current') }}
              </span>
            </div>

            <p class="muted" v-if="!isPremium">
              {{ $t('profile.plan.freeDesc') }}
            </p>

            <ul class="plan-limits" v-if="!isPremium">
              <li>
                <strong>{{ $t('profile.plan.limits.forumTitle') }}</strong>
                {{ $t('profile.plan.limits.forumBody') }}
              </li>
              <li>
                <strong>{{ $t('profile.plan.limits.diaryTitle') }}</strong>
                <span v-html="$t('profile.plan.limits.diaryBody')"></span>
              </li>
              <li>
                <strong>{{ $t('profile.plan.limits.chatbotTitle') }}</strong>
                <span v-html="$t('profile.plan.limits.chatbotBody')"></span>
              </li>
            </ul>

            <p class="muted" v-else>
              {{ $t('profile.plan.premiumDesc') }}
            </p>

            <RouterLink :to="{ name: 'premium' }" class="btn btn-full">
              {{ isPremium ? $t('profile.plan.seeDetails') : $t('profile.plan.seePlans') }}
            </RouterLink>
          </template>

          <template v-else>
            <p class="muted small">{{ $t('profile.plan.loading') }}</p>
          </template>
        </div>

        <div class="card">
          <h2 class="section-title">{{ $t('profile.lastMoodsTitle') }}</h2>

          <p v-if="recentMoods.length === 0">
            {{ $t('profile.noMoodsThisWeek') }}
          </p>

          <ul v-else class="mood-history">
            <li v-for="(item, i) in recentMoods" :key="i">
              <span class="date">{{ item[0] }}</span>
              <span class="tag tag--mood">{{ $t(`profile.moods.${item[1]}`) }}</span>
            </li>
          </ul>
        </div>

        <div class="card meds-preview">
          <h2 class="section-title">{{ $t('profile.meds.title') }}</h2>

          <p v-if="loadingMeds">{{ $t('profile.meds.loading') }}</p>

          <p v-else-if="meds.length === 0">
            {{ $t('profile.meds.empty') }}
          </p>

          <ul v-else class="moods-list">
            <li v-for="m in meds" :key="m.id">
              {{ m.name }} — {{ m.dose }}
            </li>
          </ul>

          <button class="btn btn-full" type="button" @click="goMeds">
            {{ $t('profile.meds.myMeds') }}
          </button>
        </div>

        <div class="card">
          <h2 class="section-title">{{ $t('profile.diary.title') }}</h2>

          <ul v-if="diaryPreview.length" class="diary-list">
            <li v-for="d in diaryPreview" :key="d.date">
              <span class="date">{{ d.date }}</span>
              <span class="mood-pill">{{ $t(`profile.moods.${d.mood}`) }}</span>
              <span class="snippet">{{ d.snippet }}</span>
            </li>
          </ul>

          <p v-else class="muted small">{{ $t('profile.diary.emptyPreview') }}</p>

          <div class="row between">
            <button class="btn btn-full btn-ghost" type="button" @click="goDiaryList">
              {{ $t('profile.diary.viewAll') }}
            </button>
          </div>
        </div>

        <div class="card">
          <h2 class="section-title">{{ $t('profile.settings.helpChatTitle') }}</h2>
          <p class="muted">{{ $t('profile.settings.helpChatDesc') }}</p>
          <div class="row between">
            <button
              class="btn btn-full btn-ghost"
              type="button"
              @click="router.push('/app/chatbot')"
            >
              {{ $t('profile.actions.openChat') }}
            </button>
          </div>
        </div>
      </section>

      <section class="col">
        <div class="card aside-card">
          <h2 class="aside-title">{{ $t('profile.settings.title') }}</h2>
          <p class="aside-subtitle">{{ $t('profile.settings.subtitle') }}</p>
        </div>

        <div class="card">
          <h2 class="section-title">{{ $t('profile.settings.notificationsTitle') }}</h2>
          <p class="muted">{{ $t('profile.settings.notificationsDesc') }}</p>
          <div class="row end">
            <button class="btn btn-full" type="button" @click="router.push('/app/notificaciones')">
              {{ $t('profile.actions.edit') }}
            </button>
          </div>
        </div>

        <div class="card">
          <h2 class="section-title">{{ $t('profile.settings.privacyTitle') }}</h2>
          <p class="muted">{{ $t('profile.settings.privacyDesc') }}</p>
          <div class="row end">
            <button class="btn btn-full" type="button" @click="router.push('/app/privacidad')">
              {{ $t('profile.actions.read') }}
            </button>
          </div>
        </div>

        <div class="card">
          <h2 class="section-title">{{ $t('profile.settings.languageTitle') }}</h2>
          <p class="muted">{{ $t('profile.settings.languageDesc') }}</p>
          <div class="row end">
            <button class="btn btn-full" type="button" @click="router.push('/app/idioma')">
              {{ $t('profile.actions.edit') }}
            </button>
          </div>
        </div>

        <div class="card">
          <h2 class="section-title">{{ $t('profile.accountTitle') }}</h2>
          <div class="row end">
            <button class="btn btn-full btn-danger" type="button" @click="openLogoutModal">
              {{ $t('profile.logout') }}
            </button>
          </div>
        </div>
      </section>
    </div>

    <div v-if="showLogoutModal" class="modal-backdrop" @click.self="closeLogoutModal">
      <div class="modal-card" role="dialog" aria-modal="true">
        <h2 class="modal-title">{{ $t('profile.logoutModal.title') }}</h2>
        <p>{{ $t('profile.logoutModal.text') }}</p>

        <div class="modal-actions">
          <button class="btn btn-full btn-secondary" type="button" @click="closeLogoutModal">
            {{ $t('profile.logoutModal.cancel') }}
          </button>
          <button class="btn btn-full btn-danger" type="button" @click="confirmLogout">
            {{ loggingOut ? $t('profile.logoutModal.loggingOut') : $t('profile.logoutModal.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.contenido {
  background: #fff;
  padding: 20px 18px 48px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-head {
  display: grid;
  gap: 15px;
  margin-bottom: 12px;
}

.page-title {
  margin: 0;
  color: #50bdbd;
  font-size: 1.5rem;
  font-weight: 700;
}

.grid {
  display: grid;
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

@media (min-width: 980px) {
  .grid {
    grid-template-columns: 1.15fr 0.85fr;
  }
}

.col {
  display: grid;
  gap: 20px;
}

.card {
  width: 100%;
  height: fit-content;
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

.profile-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

@media (max-width: 520px) {
  .profile-head {
    flex-direction: column;
    align-items: flex-start;
  }
}

.avatar-container {
  width: 78px;
  height: 78px;
  border-radius: 999px;
  overflow: hidden;
  background: #d8f0ec;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: #127b7b;
  font-weight: 800;
  font-size: 1.5rem;
  background: #d8f0ec;
}

.who {
  width: 100%;
  display: grid;
  gap: 8px;
}

.name {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
}

.email {
  font-size: 0.95rem;
  color: #4b5563;
  margin: 0;
}

.since {
  font-size: 0.85rem;
  color: #6b7280;
  margin: 0;
}

.section-title {
  margin: 0 0 12px;
  font-size: 1.25rem;
  color: #50bdbd;
  font-weight: 700;
}

.row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.row.end {
  justify-content: flex-end;
}

.row.between {
  justify-content: space-between;
}

@media (max-width: 520px) {
  .row.between {
    flex-direction: column;
    align-items: stretch;
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #50bdbd;
  color: #ffffff;
  border: none;
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.22);
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  min-height: 44px;
  box-sizing: border-box;
}

@media (hover: hover) {
  .btn:hover {
    background: #3daaaa;
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(80, 189, 189, 0.3);
  }
}

.btn:active {
  transform: scale(0.98);
}

.btn-full {
  width: auto;
  min-width: 160px;
  max-width: 170px;
}

.btn-danger {
  background: #ef5350;
  box-shadow: 0 8px 18px rgba(239, 83, 80, 0.24);
}

@media (hover: hover) {
  .btn-danger:hover {
    background: #e53935;
    box-shadow: 0 14px 28px rgba(239, 83, 80, 0.32);
  }
}

.btn-secondary {
  background: #e3ecf6;
  color: #1f2937;
  box-shadow: none;
}

@media (hover: hover) {
  .btn-secondary:hover {
    background: #d7e6f6;
    transform: translateY(-2px);
    box-shadow: 0 10px 18px rgba(148, 163, 184, 0.18);
  }
}

.btn-ghost {
  background: #50bdbd;
}

.premium-head-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

@media (max-width: 520px) {
  .premium-head-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .btn-full {
    width: 35%;
  }
}

.premium-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1.5px solid #50bdbd;
  background: #e0faf7;
  font-size: 0.8rem;
  font-weight: 600;
  color: #0f766e;
  white-space: nowrap;
}

.premium-pill--free {
  border-color: #cbd5e1;
  background: #f1f5f9;
  color: #475569;
}

.premium-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 2px #bbf7d0;
}

.premium-dot--free {
  background: #94a3b8;
  box-shadow: none;
}

.muted {
  color: #475569;
  margin: 0;
  line-height: 1.5;
}

.small {
  font-size: 0.9rem;
}

.plan-limits {
  margin: 10px 0 14px;
  padding-left: 18px;
  color: #334155;
  font-size: 0.92rem;
}

.plan-limits li {
  margin-bottom: 6px;
}

.meds-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.moods-list,
.diary-list {
  margin: 0;
  padding-left: 18px;
  color: #1f2937;
}

.mood-history {
  display: grid;
  gap: 8px;
  margin-top: 6px;
  padding: 0;
  list-style: none;
}

.mood-history li {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.date {
  font-weight: 500;
  color: #222;
}

.tag--mood,
.mood-pill {
  background: #50bdbd;
  color: white;
  padding: 4px 10px;
  font-size: 0.75rem;
  border-radius: 999px;
  text-transform: capitalize;
}

.snippet {
  color: #475569;
}

.aside-card {
  border: 1px solid rgba(80, 189, 189, 0.24);
}

.aside-title {
  margin: 0 0 4px;
  font-size: 1.2rem;
  font-weight: 700;
  color: #50bdbd;
}

.aside-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: #4b5563;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 40;
}

.modal-card {
  background: #fff;
  border-radius: 18px;
  padding: 18px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22);
}

.modal-title {
  margin: 0 0 8px;
  color: #50bdbd;
  font-size: 1.2rem;
  font-weight: 700;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}

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

@media (max-width: 768px) {
  .contenido {
    padding: 16px 12px 96px;
  }

  .page-title {
    font-size: 1.25rem;
  }

  .section-title,
  .aside-title {
    font-size: 1.1rem;
  }

  .card {
    padding: 14px 14px;
  }
}

@media (max-width: 520px) {
  .modal-actions {
    flex-direction: row;
    align-items: center;
  }

  .modal-actions .btn {
    width: 50%;
    flex: 1 1 0;
    padding: 10px 12px;
    font-size: 0.9rem;
  }
}

@media (max-width: 360px) {
  .modal-actions {
    gap: 8px;
  }

  .modal-actions .btn {
    font-size: 0.85rem;
    padding: 9px 10px;
  }
}
</style>