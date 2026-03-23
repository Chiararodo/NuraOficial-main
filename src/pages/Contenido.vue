<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const tabs = computed(() => [
  { key: 'videos', label: t('content.tabs.videos') },
  { key: 'biblioteca', label: t('content.tabs.library') },
  { key: 'guias', label: t('content.tabs.guides') }
] as const)

type TabKey = 'videos' | 'biblioteca' | 'guias'
const tab = ref<TabKey>('videos')

type IdType = string | number

type VideoRow = {
  id: IdType
  title: string
  description: string | null
  cover_path: string | null
  file_path: string
  duration_seconds: number | null
}

type BookRow = {
  id: IdType
  title: string
  cover_path: string | null
  file_path: string
}

type ArticleRow = {
  id: IdType
  title: string
  summary: string | null
  cover_path: string | null
  read_minutes: number | null
}

type GuideRow = {
  id: IdType
  title: string
  description: string | null
  cover_path: string | null
  file_path: string
}

const videos = ref<VideoRow[]>([])
const books = ref<BookRow[]>([])
const articles = ref<ArticleRow[]>([])
const guides = ref<GuideRow[]>([])
const loading = ref({ videos: false, books: false, guides: false })

const auth = useAuthStore()
const progressMap = ref<Map<IdType, number>>(new Map())

const isAdmin = computed(() => (auth.user as any)?.email === 'admin@nura.app')

const BUCKET = 'nura-content'

function publicUrl(path?: string | null) {
  if (!path) return ''
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

const toast = ref<{ message: string; kind: 'success' | 'error' } | null>(null)

function showToast(message: string, kind: 'success' | 'error' = 'success') {
  toast.value = { message, kind }
  setTimeout(() => {
    if (toast.value?.message === message) toast.value = null
  }, 2500)
}

/* Upload PDF */
const bookPdfInput = ref<HTMLInputElement | null>(null)
const guidePdfInput = ref<HTMLInputElement | null>(null)
const bookPdfFile = ref<File | null>(null)
const guidePdfFile = ref<File | null>(null)
const bookPdfName = ref('')
const guidePdfName = ref('')

function onBookPdfSelected(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0] ?? null
  bookPdfFile.value = file
  bookPdfName.value = file ? file.name : ''
}

function onGuidePdfSelected(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0] ?? null
  guidePdfFile.value = file
  guidePdfName.value = file ? file.name : ''
}

async function uploadPdf(file: File, folder: 'books' | 'guides') {
  const safeName = file.name.replace(/\s+/g, '-')
  const path = `${folder}/${Date.now()}-${safeName}`

  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: '3600',
    contentType: file.type
  })

  if (error) {
    console.error('Error al subir PDF:', error)
    showToast(t('content.toasts.uploadPdfError'), 'error')
    return null
  }

  return data?.path ?? null
}

/* Loaders */
async function loadVideos() {
  loading.value.videos = true

  const { data, error } = await supabase
    .from('videos')
    .select('id,title,description,cover_path,file_path,duration_seconds')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    showToast(t('content.toasts.loadVideosError'), 'error')
  }

  videos.value = (data as VideoRow[]) || []
  loading.value.videos = false
}

async function loadBooksAndArticles() {
  loading.value.books = true

  const { data: b, error: errB } = await supabase
    .from('books')
    .select('id,title,cover_path,file_path')
    .order('created_at', { ascending: false })

  if (errB) {
    console.error(errB)
    showToast(t('content.toasts.loadLibraryError'), 'error')
  }
  books.value = (b as BookRow[]) || []

  const { data: a, error: errA } = await supabase
    .from('articles')
    .select('id,title,summary,cover_path,read_minutes')
    .order('created_at', { ascending: false })

  if (errA) console.error(errA)
  articles.value = (a as ArticleRow[]) || []

  loading.value.books = false
}

async function loadGuides() {
  loading.value.guides = true

  const { data: g, error } = await supabase
    .from('guides')
    .select('id,title,description,cover_path,file_path')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading guides:', error)
    showToast(t('content.toasts.loadGuidesError'), 'error')
  }
  guides.value = (g as GuideRow[]) || []

  if (auth.user) {
    const { data: p, error: errP } = await supabase
      .from('guide_progress')
      .select('guide_id, percent')
      .eq('user_id', auth.user.id)

    if (errP) console.error(errP)

    progressMap.value = new Map(
      ((p as any[] | null) ?? []).map((r) => [r.guide_id as IdType, r.percent])
    )
  }

  loading.value.guides = false
}

/* CREATE */
const videoCreateForm = ref({
  title: '',
  description: '',
  cover_path: '',
  file_path: '',
  duration_seconds: null as number | null
})

function resetVideoCreateForm() {
  videoCreateForm.value = {
    title: '',
    description: '',
    cover_path: '',
    file_path: '',
    duration_seconds: null
  }
}

async function createVideo() {
  if (!videoCreateForm.value.title || !videoCreateForm.value.file_path) {
    showToast(t('content.toasts.videoRequired'), 'error')
    return
  }

  const payload = {
    title: videoCreateForm.value.title,
    description: videoCreateForm.value.description || null,
    cover_path: videoCreateForm.value.cover_path || null,
    file_path: videoCreateForm.value.file_path,
    duration_seconds: videoCreateForm.value.duration_seconds
  }

  const { error } = await supabase.from('videos').insert([payload])
  if (error) {
    console.error(error)
    showToast(t('content.toasts.videoCreateError'), 'error')
    return
  }

  showToast(t('content.toasts.videoCreated'), 'success')
  await loadVideos()
  resetVideoCreateForm()
}

const bookCreateForm = ref({
  title: '',
  cover_path: '',
  file_path: ''
})

function resetBookCreateForm() {
  bookCreateForm.value = { title: '', cover_path: '', file_path: '' }
  bookPdfFile.value = null
  bookPdfName.value = ''
}

async function createBook() {
  if (!bookCreateForm.value.title || (!bookCreateForm.value.file_path && !bookPdfFile.value)) {
    showToast(t('content.toasts.bookRequired'), 'error')
    return
  }

  if (!bookCreateForm.value.file_path && bookPdfFile.value) {
    const uploadedPath = await uploadPdf(bookPdfFile.value, 'books')
    if (!uploadedPath) return
    bookCreateForm.value.file_path = uploadedPath
  }

  const payload = {
    title: bookCreateForm.value.title,
    cover_path: bookCreateForm.value.cover_path || null,
    file_path: bookCreateForm.value.file_path
  }

  const { error } = await supabase.from('books').insert([payload])
  if (error) {
    console.error(error)
    showToast(t('content.toasts.bookCreateError'), 'error')
    return
  }

  showToast(t('content.toasts.bookCreated'), 'success')
  await loadBooksAndArticles()
  resetBookCreateForm()
}

const guideCreateForm = ref({
  title: '',
  description: '',
  cover_path: '',
  file_path: ''
})

function resetGuideCreateForm() {
  guideCreateForm.value = {
    title: '',
    description: '',
    cover_path: '',
    file_path: ''
  }
  guidePdfFile.value = null
  guidePdfName.value = ''
}

async function createGuide() {
  if (!guideCreateForm.value.title || (!guideCreateForm.value.file_path && !guidePdfFile.value)) {
    showToast(t('content.toasts.guideRequired'), 'error')
    return
  }

  if (!guideCreateForm.value.file_path && guidePdfFile.value) {
    const uploadedPath = await uploadPdf(guidePdfFile.value, 'guides')
    if (!uploadedPath) return
    guideCreateForm.value.file_path = uploadedPath
  }

  const payload = {
    title: guideCreateForm.value.title,
    description: guideCreateForm.value.description || null,
    cover_path: guideCreateForm.value.cover_path || null,
    file_path: guideCreateForm.value.file_path
  }

  const { error } = await supabase.from('guides').insert([payload])
  if (error) {
    console.error(error)
    showToast(t('content.toasts.guideCreateError'), 'error')
    return
  }

  showToast(t('content.toasts.guideCreated'), 'success')
  await loadGuides()
  resetGuideCreateForm()
}

/* EDIT MODAL */
const editModal = ref<{
  type: 'video' | 'book' | 'guide'
  id: IdType
  title: string
  description?: string
  cover_path?: string
  file_path?: string
  duration_seconds?: number | null
} | null>(null)

function startEditVideo(v: VideoRow) {
  editModal.value = {
    type: 'video',
    id: v.id,
    title: v.title,
    description: v.description ?? '',
    cover_path: v.cover_path ?? '',
    file_path: v.file_path,
    duration_seconds: v.duration_seconds ?? null
  }
}

function startEditBook(b: BookRow) {
  editModal.value = {
    type: 'book',
    id: b.id,
    title: b.title,
    cover_path: b.cover_path ?? '',
    file_path: b.file_path
  }
}

function startEditGuide(g: GuideRow) {
  editModal.value = {
    type: 'guide',
    id: g.id,
    title: g.title,
    description: g.description ?? '',
    cover_path: g.cover_path ?? '',
    file_path: g.file_path
  }
}

function closeEditModal() {
  editModal.value = null
}

async function saveEdit() {
  if (!editModal.value) return

  const m = editModal.value

  if (!m.title || !m.file_path) {
    showToast(t('content.toasts.editRequired'), 'error')
    return
  }

  try {
    if (m.type === 'video') {
      const payload = {
        title: m.title,
        description: m.description || null,
        cover_path: m.cover_path || null,
        file_path: m.file_path,
        duration_seconds: m.duration_seconds ?? null
      }
      const { error } = await supabase.from('videos').update(payload).eq('id', m.id)
      if (error) throw error
      showToast(t('content.toasts.videoEdited'), 'success')
      await loadVideos()
    } else if (m.type === 'book') {
      const payload = {
        title: m.title,
        cover_path: m.cover_path || null,
        file_path: m.file_path
      }
      const { error } = await supabase.from('books').update(payload).eq('id', m.id)
      if (error) throw error
      showToast(t('content.toasts.bookEdited'), 'success')
      await loadBooksAndArticles()
    } else {
      const payload = {
        title: m.title,
        description: m.description || null,
        cover_path: m.cover_path || null,
        file_path: m.file_path
      }
      const { error } = await supabase.from('guides').update(payload).eq('id', m.id)
      if (error) throw error
      showToast(t('content.toasts.guideEdited'), 'success')
      await loadGuides()
    }
  } catch (err) {
    console.error(err)
    showToast(t('content.toasts.saveError'), 'error')
    return
  }

  closeEditModal()
}

/* DELETE */
const confirmDelete = ref<{
  type: 'video' | 'book' | 'guide'
  id: IdType
  title: string
} | null>(null)

function askDelete(type: 'video' | 'book' | 'guide', id: IdType, title: string) {
  confirmDelete.value = { type, id, title }
}

function cancelDelete() {
  confirmDelete.value = null
}

async function performDelete() {
  if (!confirmDelete.value) return
  const { type, id } = confirmDelete.value

  if (type === 'video') {
    await supabase.from('videos').delete().eq('id', id)
    await loadVideos()
  } else if (type === 'book') {
    await supabase.from('books').delete().eq('id', id)
    await loadBooksAndArticles()
  } else {
    await supabase.from('guides').delete().eq('id', id)
    await loadGuides()
  }

  showToast(t('content.toasts.deleted'), 'success')
  confirmDelete.value = null
}

/* Video overlay */
const currentVideo = ref<VideoRow | null>(null)
const videoSrc = ref('')

function openVideo(v: VideoRow) {
  currentVideo.value = v
  videoSrc.value = publicUrl(v.file_path)
}

function closeVideo() {
  currentVideo.value = null
  videoSrc.value = ''
}

/* PDF overlay */
const currentPdf = ref<{ title: string; description?: string | null } | null>(null)
const pdfSrc = ref('')

function openBook(b: BookRow) {
  currentPdf.value = { title: b.title }
  pdfSrc.value = publicUrl(b.file_path)
}

function openGuide(g: GuideRow) {
  currentPdf.value = { title: g.title, description: g.description }
  pdfSrc.value = publicUrl(g.file_path)
}

function closePdf() {
  currentPdf.value = null
  pdfSrc.value = ''
}

onMounted(async () => {
  await loadVideos()
  await loadBooksAndArticles()
  await loadGuides()
})

function mmss(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
</script>

<template>
  <main class="contenido">
    <header class="page-head">
      <h1 class="visually-hidden">{{ $t('content.pageSrTitle') }}</h1>
      <h2 class="page-title">{{ $t('content.pageTitle') }}</h2>

      <nav class="tabs" :aria-label="$t('content.tabsAria')">
        <button
          v-for="t in tabs"
          :key="t.key"
          class="tab"
          :class="{ active: tab === t.key }"
          type="button"
          @click="tab = t.key"
        >
          {{ t.label }}
        </button>
      </nav>
    </header>

    <section v-if="tab === 'videos'" class="section">
      <div v-if="isAdmin" class="content-row">
        <div class="content-main">
          <div v-if="loading.videos" class="loading">{{ $t('content.loadingVideos') }}</div>
          <p v-else-if="!videos.length" class="empty">{{ $t('content.emptyVideos') }}</p>

          <div v-else class="grid">
            <article
              v-for="v in videos"
              :key="v.id"
              class="card media-card"
              @click="openVideo(v)"
            >
              <div class="thumb thumb-video">
                <img :src="publicUrl(v.cover_path)" :alt="v.title" />
                <span class="duration" v-if="v.duration_seconds">{{ mmss(v.duration_seconds) }}</span>
              </div>

              <h3 class="card-title">{{ v.title }}</h3>

              <div v-if="isAdmin" class="small-actions" @click.stop>
                <button class="abm-btn abm-btn--edit" type="button" @click="startEditVideo(v)">
                  {{ $t('content.actions.edit') }}
                </button>
                <button class="abm-btn abm-btn--delete" type="button" @click="askDelete('video', v.id, v.title)">
                  {{ $t('content.actions.delete') }}
                </button>
              </div>
            </article>
          </div>
        </div>

        <section class="abm card abm-box">
          <h3 class="abm-title">{{ $t('content.video.newTitle') }}</h3>

          <div class="abm-grid">
            <div class="field">
              <label>{{ $t('content.fields.title') }}</label>
              <input v-model="videoCreateForm.title" type="text" />
            </div>

            <div class="field">
              <label>{{ $t('content.fields.coverPath') }}</label>
              <input v-model="videoCreateForm.cover_path" type="text" />
            </div>

            <div class="field">
              <label>{{ $t('content.video.filePath') }}</label>
              <input v-model="videoCreateForm.file_path" type="text" />
            </div>

            <div class="field">
              <label>{{ $t('content.video.duration') }}</label>
              <input v-model.number="videoCreateForm.duration_seconds" type="number" min="0" />
            </div>

            <div class="field">
              <label>{{ $t('content.fields.description') }}</label>
              <textarea rows="2" v-model="videoCreateForm.description" />
            </div>
          </div>

          <div class="abm-actions">
            <button type="button" class="pill pill--primary" @click="createVideo">
              {{ $t('content.video.create') }}
            </button>
            <button type="button" class="pill pill--soft" @click="resetVideoCreateForm">
              {{ $t('content.actions.clear') }}
            </button>
          </div>
        </section>
      </div>

      <div v-else class="content-main">
        <div v-if="loading.videos" class="loading">{{ $t('content.loadingVideos') }}</div>
        <p v-else-if="!videos.length" class="empty">{{ $t('content.emptyVideos') }}</p>

        <div v-else class="grid">
          <article
            v-for="v in videos"
            :key="v.id"
            class="card media-card"
            @click="openVideo(v)"
          >
            <div class="thumb thumb-video">
              <img :src="publicUrl(v.cover_path)" :alt="v.title" />
              <span class="duration" v-if="v.duration_seconds">{{ mmss(v.duration_seconds) }}</span>
            </div>
            <h3 class="card-title">{{ v.title }}</h3>
          </article>
        </div>
      </div>
    </section>

    <section v-else-if="tab === 'biblioteca'" class="section">
      <div v-if="isAdmin" class="content-row">
        <div class="content-main">
          <div v-if="loading.books" class="loading">{{ $t('content.loadingLibrary') }}</div>
          <p v-else-if="!books.length" class="empty">{{ $t('content.emptyBooks') }}</p>

          <div v-else class="grid">
            <article
              v-for="b in books"
              :key="b.id"
              class="card media-card"
              @click="openBook(b)"
            >
              <div class="thumb thumb-book">
                <img :src="publicUrl(b.cover_path)" :alt="b.title" />
              </div>

              <h3 class="card-title">{{ b.title }}</h3>

              <div v-if="isAdmin" class="small-actions" @click.stop>
                <button class="abm-btn abm-btn--edit" type="button" @click="startEditBook(b)">
                  {{ $t('content.actions.edit') }}
                </button>
                <button class="abm-btn abm-btn--delete" type="button" @click="askDelete('book', b.id, b.title)">
                  {{ $t('content.actions.delete') }}
                </button>
              </div>
            </article>
          </div>

          <section v-if="articles.length" class="articles-section">
            <h3 class="subhead">{{ $t('content.articles.title') }}</h3>

            <div class="articles">
              <article v-for="a in articles" :key="a.id" class="article-card">
                <img class="art-cover" :src="publicUrl(a.cover_path)" :alt="a.title" />
                <div class="art-body">
                  <h4 class="art-title">{{ a.title }}</h4>
                  <p class="art-summary">{{ a.summary }}</p>
                  <small v-if="a.read_minutes">
                    {{ $t('content.articles.reading', { m: a.read_minutes }) }}
                  </small>
                </div>
              </article>
            </div>
          </section>
        </div>

        <section class="abm card abm-box">
          <h3 class="abm-title">{{ $t('content.book.newTitle') }}</h3>

          <div class="abm-grid">
            <div class="field">
              <label>{{ $t('content.fields.title') }}</label>
              <input v-model="bookCreateForm.title" type="text" />
            </div>

            <div class="field">
              <label>{{ $t('content.fields.coverPath') }}</label>
              <input v-model="bookCreateForm.cover_path" type="text" />
            </div>

            <div class="field">
              <label>{{ $t('content.book.filePath') }}</label>
              <input
                v-model="bookCreateForm.file_path"
                type="text"
                :placeholder="$t('content.book.filePlaceholder')"
              />
            </div>

            <div class="field">
              <label>{{ $t('content.pdf.orUpload') }}</label>
              <div class="upload-row">
                <input
                  ref="bookPdfInput"
                  type="file"
                  accept="application/pdf"
                  class="file-input"
                  @change="onBookPdfSelected"
                />
                <button type="button" class="upload-btn" @click="bookPdfInput?.click()">
                  {{ $t('content.pdf.select') }}
                </button>
                <span v-if="bookPdfName" class="file-name">{{ bookPdfName }}</span>
              </div>
            </div>
          </div>

          <div class="abm-actions">
            <button type="button" class="pill pill--primary" @click="createBook">
              {{ $t('content.book.create') }}
            </button>
            <button type="button" class="pill pill--soft" @click="resetBookCreateForm">
              {{ $t('content.actions.clear') }}
            </button>
          </div>
        </section>
      </div>

      <div v-else class="content-main">
        <div v-if="loading.books" class="loading">{{ $t('content.loadingLibrary') }}</div>
        <p v-else-if="!books.length" class="empty">{{ $t('content.emptyBooks') }}</p>

        <div v-else class="grid">
          <article
            v-for="b in books"
            :key="b.id"
            class="card media-card"
            @click="openBook(b)"
          >
            <div class="thumb thumb-book">
              <img :src="publicUrl(b.cover_path)" :alt="b.title" />
            </div>
            <h3 class="card-title">{{ b.title }}</h3>
          </article>
        </div>

        <section v-if="articles.length" class="articles-section">
          <h3 class="subhead">{{ $t('content.articles.title') }}</h3>

          <div class="articles">
            <article v-for="a in articles" :key="a.id" class="article-card">
              <img class="art-cover" :src="publicUrl(a.cover_path)" :alt="a.title" />
              <div class="art-body">
                <h4 class="art-title">{{ a.title }}</h4>
                <p class="art-summary">{{ a.summary }}</p>
                <small v-if="a.read_minutes">
                  {{ $t('content.articles.reading', { m: a.read_minutes }) }}
                </small>
              </div>
            </article>
          </div>
        </section>
      </div>
    </section>

    <section v-else-if="tab === 'guias'" class="section">
      <div v-if="isAdmin" class="content-row">
        <div class="content-main">
          <div v-if="loading.guides" class="loading">{{ $t('content.loadingGuides') }}</div>
          <p v-else-if="!guides.length" class="empty">{{ $t('content.emptyGuides') }}</p>

          <div v-else class="grid">
            <article
              v-for="g in guides"
              :key="g.id"
              class="card media-card"
              @click="openGuide(g)"
            >
              <div class="thumb thumb-guide">
                <img :src="publicUrl(g.cover_path)" :alt="g.title" />
              </div>

              <div class="guide-body">
                <h3 class="card-title">{{ g.title }}</h3>
                <p class="guide-summary">{{ g.description }}</p>

                <div class="guide-actions">
                  <button class="btn" type="button" @click.stop="openGuide(g)">
                    {{ $t('content.actions.continue') }}
                  </button>

                  <div class="progress-wrap" v-if="progressMap.get(g.id) !== undefined">
                    <div class="progress">
                      <div class="bar" :style="{ width: (progressMap.get(g.id) ?? 0) + '%' }" />
                    </div>
                    <small class="pct">{{ progressMap.get(g.id) }}%</small>
                  </div>
                </div>

                <div v-if="isAdmin" class="small-actions" @click.stop>
                  <button class="abm-btn abm-btn--edit" type="button" @click="startEditGuide(g)">
                    {{ $t('content.actions.edit') }}
                  </button>
                  <button class="abm-btn abm-btn--delete" type="button" @click="askDelete('guide', g.id, g.title)">
                    {{ $t('content.actions.delete') }}
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>

        <section class="abm card abm-box">
          <h3 class="abm-title">{{ $t('content.guide.newTitle') }}</h3>

          <div class="abm-grid">
            <div class="field">
              <label>{{ $t('content.fields.title') }}</label>
              <input v-model="guideCreateForm.title" type="text" />
            </div>

            <div class="field">
              <label>{{ $t('content.fields.coverPath') }}</label>
              <input v-model="guideCreateForm.cover_path" type="text" />
            </div>

            <div class="field">
              <label>{{ $t('content.guide.filePath') }}</label>
              <input
                v-model="guideCreateForm.file_path"
                type="text"
                :placeholder="$t('content.guide.filePlaceholder')"
              />
            </div>

            <div class="field">
              <label>{{ $t('content.pdf.orUpload') }}</label>
              <div class="upload-row">
                <input
                  ref="guidePdfInput"
                  type="file"
                  accept="application/pdf"
                  class="file-input"
                  @change="onGuidePdfSelected"
                />
                <button type="button" class="upload-btn" @click="guidePdfInput?.click()">
                  {{ $t('content.pdf.select') }}
                </button>
                <span v-if="guidePdfName" class="file-name">{{ guidePdfName }}</span>
              </div>
            </div>

            <div class="field">
              <label>{{ $t('content.fields.description') }}</label>
              <textarea rows="2" v-model="guideCreateForm.description" />
            </div>
          </div>

          <div class="abm-actions">
            <button type="button" class="pill pill--primary" @click="createGuide">
              {{ $t('content.guide.create') }}
            </button>
            <button type="button" class="pill pill--soft" @click="resetGuideCreateForm">
              {{ $t('content.actions.clear') }}
            </button>
          </div>
        </section>
      </div>

      <div v-else class="content-main">
        <div v-if="loading.guides" class="loading">{{ $t('content.loadingGuides') }}</div>
        <p v-else-if="!guides.length" class="empty">{{ $t('content.emptyGuides') }}</p>

        <div v-else class="grid">
          <article
            v-for="g in guides"
            :key="g.id"
            class="card media-card"
            @click="openGuide(g)"
          >
            <div class="thumb thumb-guide">
              <img :src="publicUrl(g.cover_path)" :alt="g.title" />
            </div>

            <div class="guide-body">
              <h3 class="card-title">{{ g.title }}</h3>
              <p class="guide-summary">{{ g.description }}</p>

              <div class="guide-actions">
                <button class="btn" type="button" @click.stop="openGuide(g)">
                  {{ $t('content.actions.continue') }}
                </button>

                <div class="progress-wrap" v-if="progressMap.get(g.id) !== undefined">
                  <div class="progress">
                    <div class="bar" :style="{ width: (progressMap.get(g.id) ?? 0) + '%' }" />
                  </div>
                  <small class="pct">{{ progressMap.get(g.id) }}%</small>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <div v-if="currentVideo" class="overlay" @click.self="closeVideo">
      <div class="modal-card media-modal">
        <button type="button" class="close" @click="closeVideo">×</button>
        <div class="player">
          <video v-if="videoSrc" :src="videoSrc" controls playsinline />
        </div>
        <div class="modal-copy">
          <h2 class="modal-title">{{ currentVideo?.title }}</h2>
          <p class="modal-desc" v-if="currentVideo?.description">{{ currentVideo?.description }}</p>
        </div>
      </div>
    </div>

    <div v-if="currentPdf" class="overlay" @click.self="closePdf">
      <div class="modal-card media-modal">
        <button type="button" class="close" @click="closePdf">×</button>
        <div class="modal-copy">
          <h2 class="modal-title">{{ currentPdf?.title }}</h2>
          <p class="modal-desc" v-if="currentPdf?.description">{{ currentPdf?.description }}</p>
        </div>
        <div class="pdf">
          <iframe v-if="pdfSrc" :src="pdfSrc" :title="$t('content.pdf.iframeTitle')" />
        </div>
      </div>
    </div>

    <div v-if="editModal" class="overlay" @click.self="closeEditModal">
      <div class="modal-card edit-card">
        <header class="edit-header">
          <h2 class="edit-title">
            <span v-if="editModal.type === 'video'">{{ $t('content.edit.video') }}</span>
            <span v-else-if="editModal.type === 'book'">{{ $t('content.edit.book') }}</span>
            <span v-else>{{ $t('content.edit.guide') }}</span>
          </h2>
          <button class="edit-close" type="button" @click="closeEditModal">×</button>
        </header>

        <section class="edit-body">
          <div class="abm-grid">
            <div class="field">
              <label>{{ $t('content.fields.title') }}</label>
              <input v-model="editModal.title" type="text" />
            </div>

            <div class="field">
              <label>{{ $t('content.fields.coverPath') }}</label>
              <input v-model="editModal.cover_path" type="text" />
            </div>

            <div class="field">
              <label>
                {{ $t('content.fields.file') }}
                <span v-if="editModal.type === 'video'">{{ $t('content.video.fileLabelSuffix') }}</span>
                <span v-else>{{ $t('content.pdf.fileLabelSuffix') }}</span>
                (file_path)
              </label>
              <input v-model="editModal.file_path" type="text" />
            </div>

            <div v-if="editModal.type === 'video'" class="field">
              <label>{{ $t('content.video.duration') }}</label>
              <input v-model.number="editModal.duration_seconds" type="number" min="0" />
            </div>

            <div v-if="editModal.type !== 'book'" class="field">
              <label>{{ $t('content.fields.description') }}</label>
              <textarea rows="3" v-model="editModal.description" />
            </div>
          </div>
        </section>

        <footer class="edit-footer">
          <button class="pill pill--soft" type="button" @click="closeEditModal">
            {{ $t('content.actions.cancel') }}
          </button>
          <button class="pill pill--primary" type="button" @click="saveEdit">
            {{ $t('content.actions.save') }}
          </button>
        </footer>
      </div>
    </div>

    <div v-if="confirmDelete" class="overlay" @click.self="cancelDelete">
      <div class="modal-card confirm-card">
        <h2 class="confirm-title">
          {{ $t('content.delete.title', { item: $t(`content.delete.labels.${confirmDelete.type}`) }) }}
        </h2>
        <p class="confirm-text">
          {{ $t('content.delete.text') }}
          <strong>«{{ confirmDelete.title }}»</strong>?
        </p>
        <div class="confirm-actions">
          <button class="pill pill--soft" type="button" @click="cancelDelete">
            {{ $t('content.actions.cancel') }}
          </button>
          <button class="pill pill--danger" type="button" @click="performDelete">
            {{ $t('content.actions.delete') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="toast" class="toast" :class="toast.kind">
      {{ toast.message }}
    </div>
  </main>
</template>

<style scoped>
.contenido {
  background: #fff;
  padding: 20px 18px 48px;
  max-width: 1400px;
  margin: 0 auto;
  font-family: 'Inter', sans-serif;
}

.page-head {
  display: grid;
  gap: 14px;
  margin-bottom: 14px;
}

.page-title {
  margin: 0;
  font-size: 1.55rem;
  font-weight: 800;
  color: #50bdbd;
}

.tabs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.tab {
  padding: 10px 18px;
  border-radius: 999px;
  border: none;
  background: #85b6e0;
  color: #fff;
  font-size: 0.96rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

@media (hover: hover) {
  .tab:hover {
    background: #50bdbd;
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(80, 189, 189, 0.18);
  }
}

.tab.active {
  background: #50bdbd;
  box-shadow: 0 0 0 2px rgba(80, 189, 189, 0.15) inset;
}

.section {
  display: grid;
  gap: 16px;
}

.content-row {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.content-main {
  flex: 1 1 auto;
  min-width: 0;
}

.abm-box {
  flex: 0 0 320px;
  max-width: 320px;
}

@media (max-width: 980px) {
  .content-row {
    flex-direction: column-reverse;
  }

  .abm-box {
    width: 100%;
    max-width: 100%;
  }
}

.grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.card {
  width: 100%;
  box-sizing: border-box;
  background: #ffffff;
  border-radius: 18px;
  padding: 14px;
  border: 1px solid #e2edf7;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    background-color 0.22s ease,
    border-color 0.22s ease;
}

@media (hover: hover) {
  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
    background: #ffffff;
  }
}

.media-card {
  cursor: pointer;
}

.thumb {
  border-radius: 14px;
  overflow: hidden;
  background: #f8fafc;
  border: 1px solid #e8eef5;
}

.thumb img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.thumb-video {
  position: relative;
  aspect-ratio: 16 / 9;
}

.thumb-book,
.thumb-guide {
  aspect-ratio: 7 / 10;
  display: grid;
  place-items: center;
}

.duration {
  position: absolute;
  right: 8px;
  bottom: 8px;
  font-size: 0.76rem;
  padding: 4px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
}

.card-title {
  margin: 10px 4px 6px;
  font-size: 1rem;
  color: #111827;
}

.guide-body {
  display: grid;
  gap: 8px;
}

.guide-summary {
  margin: 0 4px;
  color: #4b5563;
  font-size: 0.9rem;
  line-height: 1.35;
}

.guide-actions {
  display: grid;
  gap: 8px;
  padding: 0 4px 4px;
}

.progress-wrap {
  display: grid;
  gap: 4px;
}

.progress {
  height: 10px;
  background: #e8eef3;
  border-radius: 999px;
  overflow: hidden;
}

.bar {
  height: 100%;
  background: #85b6e0;
}

.pct {
  color: #6b7280;
}

.btn {
  align-self: flex-start;
  padding: 8px 16px;
  border-radius: 999px;
  border: none;
  background: #50bdbd;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.22);
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease;
}

@media (hover: hover) {
  .btn:hover {
    background: #3ea9a9;
    transform: translateY(-1px);
    box-shadow: 0 12px 22px rgba(80, 189, 189, 0.28);
  }
}

.small-actions {
  display: flex;
  justify-content: flex-start;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.abm-btn {
  border-radius: 999px;
  padding: 7px 14px;
  border: 1px solid #b6ebe5;
  background: #ffffff;
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.abm-btn--edit {
  color: #50bdbd;
}

@media (hover: hover) {
  .abm-btn--edit:hover {
    background: #f3fffe;
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(80, 189, 189, 0.12);
  }
}

.abm-btn--delete {
  color: #e53935;
  border-color: rgba(229, 57, 53, 0.5);
}

@media (hover: hover) {
  .abm-btn--delete:hover {
    background: rgba(229, 57, 53, 0.08);
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(229, 57, 53, 0.12);
  }
}

.abm {
  display: grid;
  gap: 14px;
}

.abm-title {
  margin: 0;
  font-size: 1.08rem;
  color: #50bdbd;
  font-weight: 800;
}

.abm-grid {
  display: grid;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 0.86rem;
  font-weight: 700;
  color: #50bdbd;
}

.field input,
.field textarea {
  border-radius: 12px;
  border: 1.5px solid #dbe7f3;
  background: #ffffff;
  padding: 9px 12px;
  font-size: 0.92rem;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.field input:focus,
.field textarea:focus {
  border-color: #50bdbd;
  box-shadow: 0 0 0 3px rgba(80, 189, 189, 0.18);
}

.abm-actions {
  margin-top: 4px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.upload-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.file-input {
  display: none;
}

.upload-btn {
  padding: 8px 14px;
  border-radius: 999px;
  border: none;
  background: #50bdbd;
  color: #fff;
  cursor: pointer;
  font-size: 0.86rem;
  font-weight: 700;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease;
}

@media (hover: hover) {
  .upload-btn:hover {
    background: #37a8a8;
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(80, 189, 189, 0.18);
  }
}

.file-name {
  font-size: 0.82rem;
  color: #374151;
  word-break: break-word;
}

.articles-section {
  margin-top: 18px;
}

.subhead {
  margin: 0 0 12px;
  font-size: 1.08rem;
  color: #50bdbd;
  font-weight: 800;
}

.articles {
  display: grid;
  gap: 12px;
}

.article-card {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2edf7;
  transition:
    transform 0.18s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

@media (hover: hover) {
  .article-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 18px rgba(15, 23, 42, 0.08);
  }
}

.art-cover {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: 10px;
}

.art-title {
  margin: 0 0 4px;
  font-size: 1rem;
}

.art-summary {
  margin: 0 0 4px;
  color: #4b5563;
}

.loading,
.empty {
  color: #6b7280;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
}

.modal-card {
  background: #ffffff;
  border-radius: 18px;
  width: min(920px, 96vw);
  box-shadow: 0 18px 40px rgba(30, 41, 59, 0.22);
  border: 1px solid #e8eef3;
  overflow: hidden;
  position: relative;
}

.media-modal {
  display: grid;
  gap: 0;
}

.modal-copy {
  padding: 14px 18px 16px;
}

.close {
  z-index: 20;
  position: absolute;
  right: 14px;
  top: 12px;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background: #e53935;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
}

.modal-title {
  margin: 0 40px 8px 0;
  font-size: 1.2rem;
  color: #50bdbd;
  font-weight: 800;
}

.modal-desc {
  margin: 0;
  color: #475569;
}

.player {
  background: #000;
}

.player video {
  width: 100%;
  height: auto;
  display: block;
}

.pdf {
  height: 70vh;
}

.pdf iframe {
  width: 100%;
  height: 100%;
  border: 0;
}

.edit-card {
  max-width: 440px;
}

.edit-header {
  padding: 14px 18px;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.edit-title {
  margin: 0;
  font-size: 1.15rem;
  color: #50bdbd;
  font-weight: 800;
}

.edit-close {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #f0f4f8;
  border: none;
  font-size: 1.1rem;
  color: #111827;
  cursor: pointer;
}

.edit-body {
  padding: 18px;
}

.edit-footer {
  padding: 14px 18px 18px;
  border-top: 1px solid #eef2f7;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.confirm-card {
  max-width: 400px;
  padding: 20px;
}

.confirm-title {
  margin: 0 0 8px;
  font-size: 1.15rem;
  color: #111827;
}

.confirm-text {
  margin: 0 0 16px;
  color: #475569;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.pill {
  border-radius: 999px;
  padding: 9px 18px;
  font-size: 0.9rem;
  border: none;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    transform 0.18s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.pill--primary {
  background: #50bdbd;
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.22);
}

@media (hover: hover) {
  .pill--primary:hover {
    background: #3ea9a9;
    transform: translateY(-1px);
    box-shadow: 0 12px 22px rgba(80, 189, 189, 0.28);
  }
}

.pill--soft {
  background: #ffffff;
  color: #50bdbd;
  border: 1px solid #b6ebe5;
  box-shadow: 0 4px 12px rgba(148, 163, 184, 0.16);
}

@media (hover: hover) {
  .pill--soft:hover {
    background: #e0faf7;
    transform: translateY(-1px);
  }
}

.pill--danger {
  background: #e53935;
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(229, 57, 53, 0.24);
}

@media (hover: hover) {
  .pill--danger:hover {
    background: #c62828;
    transform: translateY(-1px);
  }
}

.toast {
  position: fixed;
  right: 18px;
  bottom: 20px;
  padding: 10px 16px;
  border-radius: 12px;
  color: #ffffff;
  font-size: 0.85rem;
  z-index: 3000;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.25);
}

.toast.success {
  background: #50bdbd;
}

.toast.error {
  background: #ef4444;
}

.visually-hidden {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

@media (max-width: 768px) {
  .contenido {
    padding: 16px 12px 96px;
  }

  .page-title {
    font-size: 1.35rem;
  }

  .card {
    padding: 12px;
  }

  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .tab {
    font-size: 0.9rem;
    padding: 9px 14px;
  }

  .article-card {
    grid-template-columns: 80px 1fr;
  }

  .art-cover {
    width: 80px;
    height: 80px;
  }

  .edit-footer,
  .confirm-actions,
  .abm-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .edit-footer .pill,
  .confirm-actions .pill,
  .abm-actions .pill {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .thumb-book,
  .thumb-guide {
    aspect-ratio: 16 / 10;
  }

  .thumb-book img,
  .thumb-guide img {
    object-fit: contain;
    padding: 6px;
    background: #ffffff;
  }

  .card-title {
    font-size: 0.92rem;
  }

  .guide-summary {
    font-size: 0.82rem;
  }

  .guide-actions .btn {
    width: 100%;
  }

  .tabs {
    gap: 8px;
  }

  .tab {
    flex: 1 1 auto;
    text-align: center;
  }
}

@media (max-width: 360px) {
  .contenido {
    padding: 16px 10px 36px;
  }

  .tab {
    font-size: 0.82rem;
    padding: 8px 10px;
  }

  .abm-btn {
    padding: 6px 10px;
    font-size: 0.8rem;
  }
}
</style>