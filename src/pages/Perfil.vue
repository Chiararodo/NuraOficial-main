<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/composables/useSupabase'

type Mood = 'triste' | 'normal' | 'bien' | 'muybien'

const router = useRouter()
const auth = useAuthStore()

const profile = ref<{
  id: string
  name?: string | null
  avatar_url?: string | null
  premium?: boolean | null
  created_at?: string
} | null>(null)

const user = ref<any>(null)

const profileName = computed(() => {
  const nameFromProfile = profile.value?.name
  if (nameFromProfile && nameFromProfile.trim()) return nameFromProfile

  const metaName = (auth.user?.user_metadata as any)?.name
  if (metaName && metaName.trim()) return metaName

  return (auth.user?.email || 'Usuario').split('@')[0]
})

const userEmail = computed(() => auth.user?.email ?? '')

const avatarPath = computed<string | null>(() => {
  const meta = (auth.user?.user_metadata as any) || {}
  const fromProfile = profile.value?.avatar_url as string | null | undefined
  const fromMeta = meta.avatar_url as string | null | undefined
  return fromProfile || fromMeta || null
})

const avatarUrl = ref<string>('')

function buildPlaceholder() {
  const base = profileName.value || auth.user?.email || 'U'
  const first = base.trim()[0]?.toUpperCase() || 'U'
  return `https://placehold.co/120x120/50bdbd/FFFFFF?text=${first}&font=Montserrat`
}

async function resolveAvatarUrl() {
  const path = avatarPath.value
  if (!path) {
    avatarUrl.value = buildPlaceholder()
    return
  }

  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUrl(path, 60 * 60 * 24 * 7)

  if (error || !data?.signedUrl) {
    avatarUrl.value = buildPlaceholder()
    return
  }

  avatarUrl.value = data.signedUrl
}

const memberSinceYear = computed(() => {
  const iso = auth.user?.created_at
  if (!iso) return ''
  return String(new Date(iso).getFullYear())
})

const isPremiumLS = computed(() => localStorage.getItem('nura_is_premium') === 'true')

async function loadProfile() {
  if (!auth.user) return

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (!data) {
    const fallback = {
      id: auth.user.id as string,
      name:
        (auth.user.user_metadata as any)?.name ??
        auth.user.email?.split('@')[0] ??
        'Usuario',
      avatar_url: null,
      premium: false,
      created_at: auth.user.created_at as string,
    }
    profile.value = fallback
    user.value = fallback
    return
  }

  profile.value = {
    ...data,
    name:
      (auth.user.user_metadata as any)?.name ??
      auth.user.email?.split('@')[0] ??
      'Usuario',
  }
  user.value = profile.value
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
const diaryPreview = ref<{ date: string; mood: Mood; snippet: string }[]>([])

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
  const sorted = entries.sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
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

  router.push({
    name: 'mood-success',
    query: { mood, date: today },
  })
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

const isPremium = computed(() => user.value?.premium === true || isPremiumLS.value)

onMounted(() => {
  loadProfile()
  loadLocalData()
  setTimeout(loadMeds, 150)
  resolveAvatarUrl()
})

watch(avatarPath, () => {
  resolveAvatarUrl()
})
</script>

<template>
  <h1 class="visually-hidden">{{ $t('profile.title') }}</h1>

  <main class="contenido">
    <header class="page-head">
      <h2>{{ $t('profile.title') }}</h2>
    </header>

    <div class="grid">
      <section class="col">
        <div class="card profile-head">
          <div class="avatar-container">
            <img :src="avatarUrl" class="avatar-img" :alt="$t('profile.avatarAlt')" />
          </div>

          <div class="who">
            <h1 class="name">{{ profileName }}</h1>
            <p class="email">{{ userEmail }}</p>
            <p class="since" v-if="memberSinceYear">
              {{ $t('profile.memberSince', { year: memberSinceYear }) }}
            </p>

            <button class="btn btn-full" type="button" @click="router.push('/app/perfil/editar')">
              {{ $t('profile.edit') }}
            </button>
          </div>
        </div>

        <div class="card premium-box">
          <template v-if="user">
            <div class="premium-head-row">
              <h3>
                {{ isPremium ? $t('profile.plan.premiumTitle') : $t('profile.plan.freeTitle') }}
              </h3>

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
          <h3 class="card-title">{{ $t('profile.lastMoodsTitle') }}</h3>

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
          <h3 class="card-title">{{ $t('profile.meds.title') }}</h3>

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
          <h3>{{ $t('profile.diary.title') }}</h3>

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
      </section>

      <section class="col">
        <div class="card aside-card">
          <h3 class="aside-title">{{ $t('profile.settings.title') }}</h3>
          <p class="aside-subtitle">{{ $t('profile.settings.subtitle') }}</p>
        </div>

        <div class="card">
          <h3>{{ $t('profile.settings.notificationsTitle') }}</h3>
          <p class="muted">{{ $t('profile.settings.notificationsDesc') }}</p>
          <div class="row end">
            <button class="btn btn-full" type="button" @click="router.push('/app/notificaciones')">
              {{ $t('profile.actions.edit') }}
            </button>
          </div>
        </div>

        <div class="card">
          <h3>{{ $t('profile.settings.privacyTitle') }}</h3>
          <p class="muted">{{ $t('profile.settings.privacyDesc') }}</p>
          <div class="row end">
            <button class="btn btn-full" type="button" @click="router.push('/app/privacidad')">
              {{ $t('profile.actions.read') }}
            </button>
          </div>
        </div>

        <div class="card">
          <h3>{{ $t('profile.settings.languageTitle') }}</h3>
          <p class="muted">{{ $t('profile.settings.languageDesc') }}</p>
          <div class="row end">
            <button class="btn btn-full" type="button" @click="router.push('/app/idioma')">
              {{ $t('profile.actions.edit') }}
            </button>
          </div>
        </div>

        <div class="card">
          <h3>{{ $t('profile.settings.helpChatTitle') }}</h3>
          <p class="muted">{{ $t('profile.settings.helpChatDesc') }}</p>
          <div class="row end">
            <button class="btn btn-full" type="button" @click="router.push('/app/chatbot')">
              {{ $t('profile.actions.openChat') }}
            </button>
          </div>
        </div>

        <div class="card">
          <h3>{{ $t('profile.accountTitle') }}</h3>
          <div class="row end">
            <button class="btn btn-full btn-danger" type="button" @click="openLogoutModal">
              {{ $t('profile.logout') }}
            </button>
          </div>
        </div>
      </section>
    </div>

    <div v-if="showLogoutModal" class="modal-backdrop" @click.self="closeLogoutModal">
      <div class="modal-card">
        <h3>{{ $t('profile.logoutModal.title') }}</h3>
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
  padding: 20px 14px 44px;
  max-width: 1100px;
  margin: 0 auto;
}

.page-head {
  display: grid;
  gap: 15px;
  margin-bottom: 12px;
}

h2 {
  margin: 0;
  padding: 10px;
}

.grid {
  display: grid;
  gap: 22px;
  max-width: 1100px;
  margin: 0 auto;
}

@media (min-width: 980px) {
  .grid {
    grid-template-columns: 1.15fr 0.85fr;
  }
}

.col {
  display: grid;
  gap: 18px;
}

.card {
  background: #ffffff;
  border-radius: 18px;
  padding: 16px 18px;
  box-shadow: 0 38px 58px rgba(0, 0, 0, 0.32);
}

.card:hover {
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(80, 189, 189, 0.35);
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
  width: 70px;
  height: 70px;
  border-radius: 999px;
  overflow: hidden;
  background: #d8f0ec;
  flex: 0 0 auto;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.who {
  width: 100%;
  display: grid;
  gap: 8px;
}

.name {
  font-size: 1.25rem;
  margin: 0;
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
  box-shadow: 0 3px 10px rgba(80, 189, 189, 0.25);
  transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
  min-height: 18px;
  width: 45%;
}

.btn:hover {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(80, 189, 189, 0.35);
}

.btn-full {
  width: 45%;
}

.btn-danger {
  background: #ef5350;
  box-shadow: 0 3px 10px rgba(239, 83, 80, 0.3);
}

.btn-danger:hover {
  background: #e53935;
}

.btn-secondary {
  background: #e3ecf6;
  color: #1f2937;
  box-shadow: none;
}

.btn-secondary:hover {
  background: #d7e6f6;
  transform: none;
}

.btn-ghost {
  background: #50bdbd;
}

.premium-box {
  background: #ffffff;
  border-radius: 18px;
  padding: 16px 18px;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.32);
}

.premium-box:hover {
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(80, 189, 189, 0.35);
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
}

.mood-history .date {
  font-weight: 450;
  color: #222;
}

.tag--mood {
  background: #50bdbd;
  color: white;
  padding: 4px 10px;
  font-size: 0.75rem;
  border-radius: 999px;
  text-transform: capitalize;
}

.aside-card {
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.07);
  padding: 16px 18px 18px;
  border: 0.3px solid #50bdbd;
}

.aside-card:hover {
  transform: none;
  box-shadow: none;
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
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 40;
}

.modal-card {
  background: #fff;
  border-radius: 16px;
  padding: 18px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}

@media (max-width: 520px) {
  .modal-actions {
    flex-direction: column;
    align-items: stretch;
  }
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
</style>