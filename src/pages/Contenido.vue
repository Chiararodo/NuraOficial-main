<template>
  <main class="contenido">
    <header class="page-head">
    <h1 class="visually-hidden">Contenido educativo</h1>

      <h2>Contenido educativo</h2>
      <nav class="tabs">
        <button
          v-for="t in TABS"
          :key="t.key"
          class="tab"
          :class="{ active: tab === t.key }"
          @click="tab = t.key"
        >
          {{ t.label }}
        </button>
      </nav>
    </header>

    <!-- VIDEOS -->
    <section v-if="tab === 'videos'" class="section">
      <div v-if="isAdmin" class="content-row">
        <!-- LISTA VIDEOS IZQUIERDA -->
        <div class="content-main">
          <div v-if="loading.videos" class="loading">Cargando videos…</div>
          <p v-else-if="!videos.length" class="empty">Aún no hay videos.</p>

          <div v-else class="grid">
            <article
              v-for="v in videos"
              :key="v.id"
              class="card video-card"
              @click="openVideo(v)"
            >
              <div class="thumb">
                <img :src="publicUrl(v.cover_path)" :alt="v.title" />
                <span class="duration" v-if="v.duration_seconds">
                  {{ mmss(v.duration_seconds) }}
                </span>
              </div>
              <h3 class="title">{{ v.title }}</h3>

              <div v-if="isAdmin" class="small-actions" @click.stop>
                <button class="abm-btn abm-btn--edit" @click="startEditVideo(v)">
                  🖊 Editar
                </button>
                <button
                  class="abm-btn abm-btn--delete"
                  @click="askDelete('video', v.id, v.title)"
                >
                  🗑 Borrar
                </button>
              </div>
            </article>
          </div>
        </div>

        <!-- ABM VIDEO DERECHA -->
        <section class="abm card abm-box">
          <h3 class="abm-title">Nuevo video</h3>

          <div class="abm-grid abm-2col">
            <div class="field">
              <label>Título</label>
              <input v-model="videoCreateForm.title" type="text" />
            </div>

            <div class="field">
              <label>Portada (cover_path)</label>
              <input v-model="videoCreateForm.cover_path" type="text" />
            </div>

            <div class="field">
              <label>Archivo de video (file_path)</label>
              <input v-model="videoCreateForm.file_path" type="text" />
            </div>

            <div class="field">
              <label>Duración (segundos)</label>
              <input
                v-model.number="videoCreateForm.duration_seconds"
                type="number"
                min="0"
              />
            </div>

            <div class="field field--full">
              <label>Descripción</label>
              <textarea rows="2" v-model="videoCreateForm.description" />
            </div>
          </div>

          <div class="abm-actions">
            <button type="button" class="pill pill--primary" @click="createVideo">
              Crear video
            </button>
            <button
              type="button"
              class="pill pill--ghost"
              @click="resetVideoCreateForm"
            >
              Limpiar
            </button>
          </div>
        </section>
      </div>

      <!-- VISTA SOLO LISTA PARA NO ADMIN -->
      <div v-else class="content-main">
        <div v-if="loading.videos" class="loading">Cargando videos…</div>
        <p v-else-if="!videos.length" class="empty">Aún no hay videos.</p>

        <div v-else class="grid">
          <article
            v-for="v in videos"
            :key="v.id"
            class="card video-card"
            @click="openVideo(v)"
          >
            <div class="thumb">
              <img :src="publicUrl(v.cover_path)" :alt="v.title" />
              <span class="duration" v-if="v.duration_seconds">
                {{ mmss(v.duration_seconds) }}
              </span>
            </div>
            <h3 class="title">{{ v.title }}</h3>
          </article>
        </div>
      </div>
    </section>

    <!-- BIBLIOTECA -->
    <section v-else-if="tab === 'biblioteca'" class="section">
      <div v-if="isAdmin" class="content-row">
        <!-- LISTA LIBROS + ARTÍCULOS IZQUIERDA -->
        <div class="content-main">
          <div v-if="loading.books" class="loading">Cargando biblioteca…</div>
          <p v-else-if="!books.length" class="empty">
            Aún no hay libros recomendados.
          </p>

          <div v-else class="grid">
            <article
              v-for="b in books"
              :key="b.id"
              class="card book-card"
              @click="openBook(b)"
            >
              <div class="book-thumb">
                <img :src="publicUrl(b.cover_path)" :alt="b.title" />
              </div>
              <h3 class="title">{{ b.title }}</h3>

              <div v-if="isAdmin" class="small-actions" @click.stop>
                <button class="abm-btn abm-btn--edit" @click="startEditBook(b)">
                  🖊 Editar
                </button>
                <button
                  class="abm-btn abm-btn--delete"
                  @click="askDelete('book', b.id, b.title)"
                >
                  🗑 Borrar
                </button>
              </div>
            </article>
          </div>

          <h3 class="subhead" v-if="articles.length">Artículos destacados</h3>
          <div class="articles" v-if="articles.length">
            <article v-for="a in articles" :key="a.id" class="article-card">
              <img class="art-cover" :src="publicUrl(a.cover_path)" :alt="a.title" />
              <div class="art-body">
                <h4 class="art-title">{{ a.title }}</h4>
                <p class="art-summary">{{ a.summary }}</p>
                <small v-if="a.read_minutes">Lectura {{ a.read_minutes }}m</small>
              </div>
            </article>
          </div>
        </div>

        <!-- ABM LIBROS DERECHA -->
        <section class="abm card abm-box">
          <h3 class="abm-title">Nuevo libro</h3>

          <div class="abm-2col">
            <div class="field">
              <label>Título</label>
              <input v-model="bookCreateForm.title" type="text" />
            </div>

            <div class="field">
              <label>Portada (cover_path)</label>
              <input v-model="bookCreateForm.cover_path" type="text" />
            </div>

            <div class="field">
              <label>Archivo PDF (file_path)</label>
              <input
                v-model="bookCreateForm.file_path"
                type="text"
                placeholder="Ruta en Supabase (opcional si subís un PDF)"
              />
            </div>

            <div class="field">
              <label>O subí un PDF</label>
              <div class="upload-row">
                <input
                  ref="bookPdfInput"
                  type="file"
                  accept="application/pdf"
                  class="file-input"
                  @change="onBookPdfSelected"
                />
                <button
                  type="button"
                  class="upload-btn"
                  @click="bookPdfInput?.click()"
                >
                  Seleccionar PDF
                </button>
                <span v-if="bookPdfName" class="file-name">
                  {{ bookPdfName }}
                </span>
              </div>
            </div>
          </div>

          <div class="abm-actions">
            <button type="button" class="pill pill--primary" @click="createBook">
              Crear libro
            </button>
            <button
              type="button"
              class="pill pill--ghost"
              @click="resetBookCreateForm"
            >
              Limpiar
            </button>
          </div>
        </section>
      </div>

      <!-- SOLO LISTA PARA NO ADMIN -->
      <div v-else class="content-main">
        <div v-if="loading.books" class="loading">Cargando biblioteca…</div>
        <p v-else-if="!books.length" class="empty">
          Aún no hay libros recomendados.
        </p>

        <div v-else class="grid">
          <article
            v-for="b in books"
            :key="b.id"
            class="card book-card"
            @click="openBook(b)"
          >
            <div class="book-thumb">
              <img :src="publicUrl(b.cover_path)" :alt="b.title" />
            </div>
            <h3 class="title">{{ b.title }}</h3>
          </article>
        </div>

        <h3 class="subhead" v-if="articles.length">Artículos destacados</h3>
        <div class="articles" v-if="articles.length">
          <article v-for="a in articles" :key="a.id" class="article-card">
            <img class="art-cover" :src="publicUrl(a.cover_path)" :alt="a.title" />
            <div class="art-body">
              <h4 class="art-title">{{ a.title }}</h4>
              <p class="art-summary">{{ a.summary }}</p>
              <small v-if="a.read_minutes">Lectura {{ a.read_minutes }}m</small>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- GUÍAS -->
    <section v-else-if="tab === 'guias'" class="section">
      <div v-if="isAdmin" class="content-row">
        <!-- LISTA GUÍAS IZQUIERDA -->
        <div class="content-main">
          <div v-if="loading.guides" class="loading">Cargando guías…</div>
          <p v-else-if="!guides.length" class="empty">Aún no hay guías.</p>

          <div v-else class="grid">
            <article
              v-for="g in guides"
              :key="g.id"
              class="card guide-card"
              @click="openGuide(g)"
            >
              <div class="guide-thumb">
                <img :src="publicUrl(g.cover_path)" :alt="g.title" />
              </div>
              <div class="guide-body">
                <h3 class="guide-title">{{ g.title }}</h3>
                <p class="guide-summary">{{ g.description }}</p>

                <div class="guide-actions">
                  <button class="btn" @click.stop="openGuide(g)">Continuar</button>
                  <div class="progress" v-if="progressMap.get(g.id) !== undefined">
                    <div
                      class="bar"
                      :style="{ width: (progressMap.get(g.id) ?? 0) + '%' }"
                    />
                  </div>
                  <small class="pct" v-if="progressMap.get(g.id) !== undefined">
                    {{ progressMap.get(g.id) }}%
                  </small>
                </div>

                <div v-if="isAdmin" class="small-actions" @click.stop>
                  <button class="abm-btn abm-btn--edit" @click="startEditGuide(g)">
                    🖊 Editar
                  </button>
                  <button
                    class="abm-btn abm-btn--delete"
                    @click="askDelete('guide', g.id, g.title)"
                  >
                    🗑 Borrar
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>

        <!-- ABM GUÍAS DERECHA -->
        <section class="abm card abm-box">
          <h3 class="abm-title">Nueva guía</h3>

          <div class="abm-2col">
            <div class="field">
              <label>Título</label>
              <input v-model="guideCreateForm.title" type="text" />
            </div>

            <div class="field">
              <label>Portada (cover_path)</label>
              <input v-model="guideCreateForm.cover_path" type="text" />
            </div>

            <div class="field">
              <label>Archivo PDF (file_path)</label>
              <input
                v-model="guideCreateForm.file_path"
                type="text"
                placeholder="Ruta en Supabase (opcional si subís un PDF)"
              />
            </div>

            <div class="field">
              <label>O subí un PDF</label>
              <div class="upload-row">
                <input
                  ref="guidePdfInput"
                  type="file"
                  accept="application/pdf"
                  class="file-input"
                  @change="onGuidePdfSelected"
                />
                <button
                  type="button"
                  class="upload-btn"
                  @click="guidePdfInput?.click()"
                >
                  Seleccionar PDF
                </button>
                <span v-if="guidePdfName" class="file-name">
                  {{ guidePdfName }}
                </span>
              </div>
            </div>

            <div class="field field--full">
              <label>Descripción</label>
              <textarea rows="2" v-model="guideCreateForm.description" />
            </div>
          </div>

          <div class="abm-actions">
            <button type="button" class="pill pill--primary" @click="createGuide">
              Crear guía
            </button>
            <button
              type="button"
              class="pill pill--ghost"
              @click="resetGuideCreateForm"
            >
              Limpiar
            </button>
          </div>
        </section>
      </div>

      <!-- SOLO LISTA PARA NO ADMIN -->
      <div v-else class="content-main">
        <div v-if="loading.guides" class="loading">Cargando guías…</div>
        <p v-else-if="!guides.length" class="empty">Aún no hay guías.</p>

        <div v-else class="grid">
          <article
            v-for="g in guides"
            :key="g.id"
            class="card guide-card"
            @click="openGuide(g)"
          >
            <div class="guide-thumb">
              <img :src="publicUrl(g.cover_path)" :alt="g.title" />
            </div>
            <div class="guide-body">
              <h3 class="guide-title">{{ g.title }}</h3>
              <p class="guide-summary">{{ g.description }}</p>

              <div class="guide-actions">
                <button class="btn" @click.stop="openGuide(g)">Continuar</button>
                <div class="progress" v-if="progressMap.get(g.id) !== undefined">
                  <div
                    class="bar"
                    :style="{ width: (progressMap.get(g.id) ?? 0) + '%' }"
                  />
                </div>
                <small class="pct" v-if="progressMap.get(g.id) !== undefined">
                  {{ progressMap.get(g.id) }}%
                </small>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- OVERLAYS Y MODALES -->
    <div v-if="currentVideo" class="overlay">
      <div class="modal-card">
        <button type="button" class="close" @click="closeVideo">×</button>
        <div class="player">
          <video v-if="videoSrc" :src="videoSrc" controls playsinline />
        </div>
        <h3 class="modal-title">{{ currentVideo?.title }}</h3>
        <p class="modal-desc" v-if="currentVideo?.description">
          {{ currentVideo?.description }}
        </p>
      </div>
    </div>

    <div v-if="currentPdf" class="overlay" @click.self="closePdf">
      <div class="modal-card">
        <button type="button" class="close" @click="closePdf">×</button>
        <h3 class="modal-title">{{ currentPdf?.title }}</h3>
        <p class="modal-desc" v-if="currentPdf?.description">
          {{ currentPdf?.description }}
        </p>
        <div class="pdf">
          <iframe v-if="pdfSrc" :src="pdfSrc" title="Documento" />
        </div>
      </div>
    </div>

    <div v-if="editModal" class="overlay" @click.self="closeEditModal">
      <div class="edit-card">
        <header class="edit-header">
          <h3 class="edit-title">
            <span v-if="editModal.type === 'video'">Editar video</span>
            <span v-else-if="editModal.type === 'book'">Editar libro</span>
            <span v-else>Editar guía</span>
          </h3>
          <button class="edit-close" type="button" @click="closeEditModal">
            ×
          </button>
        </header>

        <section class="edit-body">
          <div class="abm-grid">
            <div class="field">
              <label>Título</label>
              <input v-model="editModal.title" type="text" />
            </div>

            <div class="field">
              <label>Portada (cover_path)</label>
              <input v-model="editModal.cover_path" type="text" />
            </div>

            <div class="field">
              <label>
                Archivo
                <span v-if="editModal.type === 'video'">de video</span>
                <span v-else>PDF</span>
                (file_path)
              </label>
              <input v-model="editModal.file_path" type="text" />
            </div>

            <div v-if="editModal.type === 'video'" class="field">
              <label>Duración (segundos)</label>
              <input
                v-model.number="editModal.duration_seconds"
                type="number"
                min="0"
              />
            </div>

            <div v-if="editModal.type !== 'book'" class="field field--full">
              <label>Descripción</label>
              <textarea rows="3" v-model="editModal.description" />
            </div>
          </div>
        </section>

        <footer class="edit-footer">
          <button class="pill pill--ghost" type="button" @click="closeEditModal">
            Cancelar
          </button>
          <button class="pill pill--primary" type="button" @click="saveEdit">
            Guardar cambios
          </button>
        </footer>
      </div>
    </div>

    <div v-if="confirmDelete" class="overlay" @click.self="cancelDelete">
      <div class="confirm-card">
        <h3>Eliminar {{ deleteLabel }}</h3>
        <p>
          ¿Seguro que querés borrar
          <strong>«{{ confirmDelete.title }}»</strong>?
        </p>
        <div class="confirm-actions">
          <button
            class="pill pill--primary"
            type="button"
            @click="cancelDelete"
          >
            Cancelar
          </button>
          <button
            class="pill pill--danger"
            type="button"
            @click="performDelete"
          >
            🗑 Borrar
          </button>
        </div>
      </div>
    </div>

    <div v-if="toast" class="toast" :class="toast.kind">
      {{ toast.message }}
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'

const TABS = [
  { key: 'videos', label: 'Videos' },
  { key: 'biblioteca', label: 'Bibliotecas' },
  { key: 'guias', label: 'Guías' },
] as const

type TabKey = (typeof TABS)[number]['key']
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

const isAdmin = computed(
  () => (auth.user as any)?.email === 'admin@nura.app',
)

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

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type,
    })

  if (error) {
    console.error('Error al subir PDF:', error)
    showToast('Error al subir el PDF.', 'error')
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
    showToast('Error al cargar videos.', 'error')
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
    showToast('Error al cargar la biblioteca.', 'error')
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
    showToast('Error al cargar las guías.', 'error')
  }
  guides.value = (g as GuideRow[]) || []

  if (auth.user) {
    const { data: p, error: errP } = await supabase
      .from('guide_progress')
      .select('guide_id, percent')
      .eq('user_id', auth.user.id)

    if (errP) console.error(errP)
    progressMap.value = new Map(
      ((p as any[] | null) ?? []).map((r) => [
        r.guide_id as IdType,
        r.percent,
      ]),
    )
  }
  loading.value.guides = false
}

/* ABM NUEVOS (create) */
const videoCreateForm = ref({
  title: '',
  description: '',
  cover_path: '',
  file_path: '',
  duration_seconds: null as number | null,
})

function resetVideoCreateForm() {
  videoCreateForm.value = {
    title: '',
    description: '',
    cover_path: '',
    file_path: '',
    duration_seconds: null,
  }
}

async function createVideo() {
  if (!videoCreateForm.value.title || !videoCreateForm.value.file_path) {
    showToast('Título y archivo de video son obligatorios.', 'error')
    return
  }

  const payload = {
    title: videoCreateForm.value.title,
    description: videoCreateForm.value.description || null,
    cover_path: videoCreateForm.value.cover_path || null,
    file_path: videoCreateForm.value.file_path,
    duration_seconds: videoCreateForm.value.duration_seconds,
  }

  const { error } = await supabase.from('videos').insert([payload])
  if (error) {
    console.error(error)
    showToast('Hubo un problema al crear el video.', 'error')
    return
  }

  showToast('Video creado correctamente.')
  await loadVideos()
  resetVideoCreateForm()
}

const bookCreateForm = ref({
  title: '',
  cover_path: '',
  file_path: '',
})

function resetBookCreateForm() {
  bookCreateForm.value = { title: '', cover_path: '', file_path: '' }
  bookPdfFile.value = null
  bookPdfName.value = ''
}

async function createBook() {
  if (
    !bookCreateForm.value.title ||
    (!bookCreateForm.value.file_path && !bookPdfFile.value)
  ) {
    showToast(
      'Título y archivo del libro (ruta o PDF) son obligatorios.',
      'error',
    )
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
    file_path: bookCreateForm.value.file_path,
  }

  const { error } = await supabase.from('books').insert([payload])
  if (error) {
    console.error(error)
    showToast('Hubo un problema al crear el libro.', 'error')
    return
  }

  showToast('Libro creado correctamente.')
  await loadBooksAndArticles()
  resetBookCreateForm()
}

const guideCreateForm = ref({
  title: '',
  description: '',
  cover_path: '',
  file_path: '',
})

function resetGuideCreateForm() {
  guideCreateForm.value = {
    title: '',
    description: '',
    cover_path: '',
    file_path: '',
  }
  guidePdfFile.value = null
  guidePdfName.value = ''
}

async function createGuide() {
  if (
    !guideCreateForm.value.title ||
    (!guideCreateForm.value.file_path && !guidePdfFile.value)
  ) {
    showToast(
      'Título y archivo de la guía (ruta o PDF) son obligatorios.',
      'error',
    )
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
    file_path: guideCreateForm.value.file_path,
  }

  const { error } = await supabase.from('guides').insert([payload])
  if (error) {
    console.error(error)
    showToast('Hubo un problema al crear la guía.', 'error')
    return
  }

  showToast('Guía creada correctamente.')
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
    duration_seconds: v.duration_seconds ?? null,
  }
}

function startEditBook(b: BookRow) {
  editModal.value = {
    type: 'book',
    id: b.id,
    title: b.title,
    cover_path: b.cover_path ?? '',
    file_path: b.file_path,
  }
}

function startEditGuide(g: GuideRow) {
  editModal.value = {
    type: 'guide',
    id: g.id,
    title: g.title,
    description: g.description ?? '',
    cover_path: g.cover_path ?? '',
    file_path: g.file_path,
  }
}

function closeEditModal() {
  editModal.value = null
}

async function saveEdit() {
  if (!editModal.value) return

  const m = editModal.value

  if (!m.title || !m.file_path) {
    showToast('Título y archivo son obligatorios.', 'error')
    return
  }

  try {
    if (m.type === 'video') {
      const payload = {
        title: m.title,
        description: m.description || null,
        cover_path: m.cover_path || null,
        file_path: m.file_path,
        duration_seconds: m.duration_seconds ?? null,
      }
      const { error } = await supabase
        .from('videos')
        .update(payload)
        .eq('id', m.id)
      if (error) throw error
      showToast('Video editado correctamente.')
      await loadVideos()
    } else if (m.type === 'book') {
      const payload = {
        title: m.title,
        cover_path: m.cover_path || null,
        file_path: m.file_path,
      }
      const { error } = await supabase
        .from('books')
        .update(payload)
        .eq('id', m.id)
      if (error) throw error
      showToast('Libro editado correctamente.')
      await loadBooksAndArticles()
    } else if (m.type === 'guide') {
      const payload = {
        title: m.title,
        description: m.description || null,
        cover_path: m.cover_path || null,
        file_path: m.file_path,
      }
      const { error } = await supabase
        .from('guides')
        .update(payload)
        .eq('id', m.id)
      if (error) throw error
      showToast('Guía editada correctamente.')
      await loadGuides()
    }
  } catch (err) {
    console.error(err)
    showToast('Error al guardar los cambios.', 'error')
    return
  }

  closeEditModal()
}

/* Confirm delete */
const confirmDelete = ref<{
  type: 'video' | 'book' | 'guide'
  id: IdType
  title: string
} | null>(null)

const deleteLabel = computed(() => {
  if (!confirmDelete.value) return ''
  if (confirmDelete.value.type === 'video') return 'video'
  if (confirmDelete.value.type === 'book') return 'libro'
  return 'guía'
})

function askDelete(
  type: 'video' | 'book' | 'guide',
  id: IdType,
  title: string,
) {
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

  showToast('Contenido borrado correctamente.')
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
const currentPdf = ref<{ title: string; description?: string | null } | null>(
  null,
)
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

<style scoped>
.contenido {
  background: #fff;
  padding: 24px 18px 48px;
  max-width: 1100px;
  margin: 0 auto;
  font-family: 'Inter', sans-serif;
}

/* Head + Tabs */
.page-head {
  display: grid;
  gap: 15px;
  margin-bottom: 12px;
}
h2 {
  margin: 0;
  padding: 10px;
}

.tabs {
  display: flex;
  justify-content: space-around;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.tab {
  padding: 10px 18px;
  border-radius: 999px;
  background: #85b6e0;
  border: none;
  color: #fff;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}
.tab:hover {
  background: #50bdbd;
  color: #fff;
  transform: translateY(-1px);
}
.tab.active {
  background: #50bdbd;
  color: #fff;
  box-shadow: 0 0 0 2px rgba(80, 189, 189, 0.15) inset;
}

/* LAYOUT ABM + LISTA */
.section {
  display: grid;
  gap: 14px;
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
  flex: 0 0 260px;
  max-width: 280px;
}

/* En pantallas chicas: ABM arriba y centrado */
@media (max-width: 900px) {
  .content-row {
    flex-direction: column-reverse; 
  }
  .abm-box {
    flex: 1 1 auto;
    width: 90%;
    margin: 0 auto 12px auto;
  }
}

/* ABM panel */
.abm {
  margin-bottom: 18px;
}
.abm-title {
  margin: 0 0 10px;
  font-size: 1.05rem;
}
.abm-grid {
  display: grid;
  gap: 12px;
}

/* ABM una sola columna, compacto */
.abm-2col {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

/* Inputs y labels ABM */
.abm-2col .field {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.abm-2col .field--full {
  grid-column: 1 / -1;
}

.abm-2col .field label {
  font-size: 0.85rem;
  color: #50bdbd;
  letter-spacing: 0.03em;
  font-weight: 600;
}

.abm-2col input,
.abm-2col textarea {
  border-radius: 12px;
  border: 1.6px solid #50bdbd;
  background: #e6fbfb;
  padding: 8px 12px;
  font-size: 0.9rem;
  outline: none;
}

.abm-2col input:focus,
.abm-2col textarea:focus {
  background: #ffffff;
  border-color: #37a8a8;
  box-shadow: 0 0 0 2px rgba(80, 189, 189, 0.2);
}

.field--full {
  grid-column: 1 / -1;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field label {
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  color: #6b7280;
}
.field input,
.field textarea {
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 7px 10px;
  font-size: 0.86rem;
  background: #f9fafb;
}
.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: #50bdbd;
  background: #ffffff;
}

.abm-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Upload PDF */
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
  padding: 7px 14px;
  border-radius: 999px;
  border: none;
  background: #50bdbd;
  color: #fff;
  cursor: pointer;
  font-size: 0.85rem;
}
.upload-btn:hover {
  background: #37a8a8;
}
.file-name {
  font-size: 0.8rem;
  color: #374151;
}

/* Grid */
.grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

/* Card */
.card {
  background: #d9f5f5;
  width: 90%;
  border-radius: 18px;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.08);
  padding: 12px;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}
.card:hover {
  background: #d9f5f5;
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(80, 189, 189, 0.35);
}

/* Edit / delete buttons estilo pill */
.small-actions {
  display: flex;
  justify-content: flex-start;
  gap: 12px;
  margin-top: 10px;
}

.abm-btn {
  border-radius: 999px;
  padding: 6px 18px;
  border: 2px solid #50bdbd;
  background: #ffffff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: 0.15s ease;
}
.abm-btn--edit {
  color: #50bdbd;
}
.abm-btn--edit:hover {
  background: rgba(80, 189, 189, 0.06);
}
.abm-btn--delete {
  color: #e53935;
  border-color: #e53935;
}
.abm-btn--delete:hover {
  background: rgba(229, 57, 53, 0.06);
}

/* Videos */
.video-card .thumb {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  background: #f6fbff;
  aspect-ratio: 16 / 9;
}
.video-card .thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.duration {
  position: absolute;
  right: 8px;
  bottom: 8px;
  font-size: 0.8rem;
  padding: 4px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
}
.title {
  margin: 10px 6px 6px;
  font-size: 1rem;
}

/* Biblioteca */
.book-card .book-thumb {
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
  aspect-ratio: 7 / 10;
  display: grid;
  place-items: center;
}
.book-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Guías */
.guide-card {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 12px;
}
.guide-thumb {
  border-radius: 14px;
  overflow: hidden;
  aspect-ratio: 7 / 10;
  background: #fff;
}
.guide-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.guide-title {
  margin: 0 6px 4px;
}
.guide-summary {
  margin: 0 6px 8px;
  opacity: 0.9;
}

.guide-actions {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 0 6px 6px;
}
.btn {
  align-self: flex-start;
  padding: 7px 18px;
  border-radius: 999px;
  border: none;
  background: #50bdbd;
  color: #ffffff;
  font-size: 0.9rem;
  width: 100%;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(80, 189, 189, 0.4);
  transition: background 0.15s ease, transform 0.08s ease, box-shadow 0.18s ease;
}
.btn:hover {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(80, 189, 189, 0.5);
}
.progress {
  height: 10px;
  background: #e8eef3;
  border-radius: 999px;
  overflow: hidden;
}
.progress .bar {
  height: 100%;
  background: #85b6e0;
}
.pct {
  opacity: 0.8;
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
  background: #eaf6ff;
  border: 1px solid #e0edf5;
}
.art-cover {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: 10px;
}
.art-title {
  margin: 0 0 4px;
}
.art-summary {
  margin: 0 0 4px;
  opacity: 0.85;
}

.loading,
.empty {
  opacity: 0.75;
}

/* Overlay genérico con blur (video, pdf, editar, borrar) */
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

/* Modal principal (video/pdf) */
.modal-card {
  position: relative;
  background: #ffffff;
  border-radius: 18px;
  overflow: hidden;
  width: min(900px, 96vw);
}
.close {
  z-index: 20;
  position: absolute;
  right: 14px;
  top: 12px;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background: #e53935;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  line-height: 1;
}
.modal-title {
  margin: 0;
  padding: 10px 48px 10px 18px;
  background: #50bdbd;
  height: 30px;
  color: #ffffff;
  font-size: 1.2rem;
}
.modal-desc {
  margin: 0;
  padding: 10px 18px 14px;
  background: #50bdbd;
  color: #ffffff;
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

/* Card del modal de edición */
.edit-card {
  background: #ffffff;
  border-radius: 24px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 18px 40px rgba(30, 41, 59, 0.22);
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}

.edit-header {
  padding: 14px 20px;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
}

.edit-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #50bdbd;
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-close {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #f0f4f8;
  border: none;
  font-size: 1.1rem;
  font-weight: 500;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000000;
  cursor: pointer;
  transition: all 0.15s ease;
}

.edit-close:hover {
  background: #e2e8f0;
  transform: scale(1.05);
}

.edit-body {
  padding: 20px 22px 10px;
}

.edit-body .field label {
  font-size: 0.8rem;
  font-weight: 750;
  color: #50bdbd;
  letter-spacing: 0.05em;
}

.edit-body input,
.edit-body textarea {
  border-radius: 14px;
  border: 1.5px solid #50bdbd;
  background: #d9f5f5;
  padding: 10px 14px;
  font-size: 0.95rem;
  font-family: 'Inter', sans-serif;
  color: #111827;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
}

.edit-body input:focus,
.edit-body textarea:focus {
  border-color: #3ea9a9;
  background: #e6fbfb;
  box-shadow: 0 0 0 2px rgba(80, 189, 189, 0.2);
}

.edit-footer {
  padding: 16px 22px 18px;
  border-top: 1px solid #eef2f7;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* Confirm delete */
.confirm-card {
  background: #ffffff;
  border-radius: 18px;
  padding: 20px 22px 18px;
  max-width: 380px;
  width: 100%;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.2);
}
.confirm-card h3 {
  margin: 0 0 8px;
}
.confirm-card p {
  margin: 0 0 16px;
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Pills */
.pill {
  border-radius: 999px;
  padding: 7px 16px;
  font-size: 0.8rem;
  border: none;
  background: #50bdbd;
  color: #ffffff;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.35);
}
.pill--primary {
  padding: 9px 22px;
  font-size: 0.9rem;
}

.pill--ghost {
  background: #ef4444;
  color: #ffffff;
  border: none;
  box-shadow: 0 8px 18px rgba(239, 68, 68, 0.4);
}

.pill--ghost:hover {
  background: #dc2626;
  transform: translateY(-1px);
}

.pill--danger {
  background: #e53935;
  box-shadow: 0 8px 18px rgba(229, 57, 53, 0.4);
}
.pill:hover {
  transform: translateY(-1px);
}

/* Toast */
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
</style>
