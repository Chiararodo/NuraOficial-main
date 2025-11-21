<template>
  <main class="contenido">
    <header class="page-head">
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
      <!-- ABM VIDEOS (solo admin) -->
      <section v-if="isAdmin" class="abm card">
        <h3 class="abm-title">
          {{ editingVideoId != null ? 'Editar video' : 'Nuevo video' }}
        </h3>

        <div class="abm-grid">
          <div class="field">
            <label>Título</label>
            <input v-model="videoForm.title" type="text" />
          </div>

          <div class="field">
            <label>Portada (cover_path)</label>
            <input v-model="videoForm.cover_path" type="text" />
          </div>

          <div class="field">
            <label>Archivo de video (file_path)</label>
            <input v-model="videoForm.file_path" type="text" />
          </div>

          <div class="field">
            <label>Duración (segundos)</label>
            <input
              v-model.number="videoForm.duration_seconds"
              type="number"
              min="0"
            />
          </div>

          <div class="field field--full">
            <label>Descripción</label>
            <textarea rows="2" v-model="videoForm.description"></textarea>
          </div>
        </div>

        <div class="abm-actions">
          <button type="button" class="pill pill--primary" @click="saveVideo">
            {{ editingVideoId != null ? 'Guardar cambios' : 'Crear video' }}
          </button>
          <button
            v-if="editingVideoId != null"
            type="button"
            class="pill pill--ghost"
            @click="resetVideoForm"
          >
            Cancelar
          </button>
        </div>
      </section>

      <div v-if="loading.videos" class="loading">Cargando videos…</div>
      <p v-else-if="!videos.length" class="empty">Aún no hay videos.</p>

      <div class="grid">
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

          <!-- acciones admin -->
          <div v-if="isAdmin" class="small-actions" @click.stop>
            <button class="btn-edit" @click="startEditVideo(v)">
              🖊 Editar
            </button>
            <button class="btn-delete" @click="askDelete('video', v.id)">
              🗑 Borrar
            </button>
          </div>
        </article>
      </div>
    </section>

    <!-- BIBLIOTECA -->
    <section v-else-if="tab === 'biblioteca'" class="section">
      <!-- ABM LIBROS (solo admin) -->
      <section v-if="isAdmin" class="abm card">
        <h3 class="abm-title">
          {{ editingBookId != null ? 'Editar libro' : 'Nuevo libro' }}
        </h3>

        <div class="abm-grid">
          <div class="field">
            <label>Título</label>
            <input v-model="bookForm.title" type="text" />
          </div>

          <div class="field">
            <label>Portada (cover_path)</label>
            <input v-model="bookForm.cover_path" type="text" />
          </div>

          <div class="field">
            <label>Archivo PDF (file_path)</label>
            <input
              v-model="bookForm.file_path"
              type="text"
              placeholder="Ruta en Supabase (opcional si subís un PDF)"
            />
          </div>

          <div class="field field--full">
            <label>O subí un archivo PDF:</label>
            <div class="upload-row">
              <input
                ref="bookPdfInput"
                type="file"
                accept="application/pdf"
                class="file-input"
                @change="onBookPdfSelected"
              />
              <button type="button" class="upload-btn" @click="bookPdfInput?.click()">
                Seleccionar PDF
              </button>
              <span v-if="bookPdfName" class="file-name">
                {{ bookPdfName }}
              </span>
            </div>
          </div>
        </div>

        <div class="abm-actions">
          <button type="button" class="pill pill--primary" @click="saveBook">
            {{ editingBookId != null ? 'Guardar cambios' : 'Crear libro' }}
          </button>
          <button
            v-if="editingBookId != null"
            type="button"
            class="pill pill--ghost"
            @click="resetBookForm"
          >
            Cancelar
          </button>
        </div>
      </section>

      <div v-if="loading.books" class="loading">Cargando biblioteca…</div>
      <p v-else-if="!books.length" class="empty">Aún no hay libros recomendados.</p>

      <div class="grid">
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
            <button class="btn-edit" @click="startEditBook(b)">
              🖊 Editar
            </button>
            <button class="btn-delete" @click="askDelete('book', b.id)">
              🗑 Borrar
            </button>
          </div>
        </article>
      </div>

      <!-- Artículos (solo lectura por ahora) -->
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
    </section>

    <!-- GUÍAS -->
    <section v-else-if="tab === 'guias'" class="section">
      <!-- ABM GUÍAS (solo admin) -->
      <section v-if="isAdmin" class="abm card">
        <h3 class="abm-title">
          {{ editingGuideId != null ? 'Editar guía' : 'Nueva guía' }}
        </h3>

        <div class="abm-grid">
          <div class="field">
            <label>Título</label>
            <input v-model="guideForm.title" type="text" />
          </div>

          <div class="field">
            <label>Portada (cover_path)</label>
            <input v-model="guideForm.cover_path" type="text" />
          </div>

          <div class="field">
            <label>Archivo PDF (file_path)</label>
            <input
              v-model="guideForm.file_path"
              type="text"
              placeholder="Ruta en Supabase (opcional si subís un PDF)"
            />
          </div>

          <div class="field field--full">
            <label>O subí un archivo PDF:</label>
            <div class="upload-row">
              <input
                ref="guidePdfInput"
                type="file"
                accept="application/pdf"
                class="file-input"
                @change="onGuidePdfSelected"
              />
              <button type="button" class="upload-btn" @click="guidePdfInput?.click()">
                Seleccionar PDF
              </button>
              <span v-if="guidePdfName" class="file-name">
                {{ guidePdfName }}
              </span>
            </div>
          </div>

          <div class="field field--full">
            <label>Descripción</label>
            <textarea rows="2" v-model="guideForm.description"></textarea>
          </div>
        </div>

        <div class="abm-actions">
          <button type="button" class="pill pill--primary" @click="saveGuide">
            {{ editingGuideId != null ? 'Guardar cambios' : 'Crear guía' }}
          </button>
          <button
            v-if="editingGuideId != null"
            type="button"
            class="pill pill--ghost"
            @click="resetGuideForm"
          >
            Cancelar
          </button>
        </div>
      </section>

      <div v-if="loading.guides" class="loading">Cargando guías…</div>
      <p v-else-if="!guides.length" class="empty">Aún no hay guías.</p>

      <div class="grid">
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
                ></div>
              </div>
              <small class="pct" v-if="progressMap.get(g.id) !== undefined">
                {{ progressMap.get(g.id) }}%
              </small>
            </div>

            <div v-if="isAdmin" class="small-actions" @click.stop>
              <button class="btn-edit" @click="startEditGuide(g)">
                🖊 Editar
              </button>
              <button class="btn-delete" @click="askDelete('guide', g.id)">
                🗑 Borrar
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- OVERLAY VIDEO -->
    <div v-if="currentVideo" class="overlay">
      <div class="modal-card">
        <button type="button" class="close" @click="closeVideo">×</button>
        <div class="player">
          <video v-if="videoSrc" :src="videoSrc" controls playsinline></video>
        </div>
        <h3 class="modal-title">{{ currentVideo?.title }}</h3>
        <p class="modal-desc" v-if="currentVideo?.description">
          {{ currentVideo?.description }}
        </p>
      </div>
    </div>

    <!-- OVERLAY PDF (Libros / Guías) -->
    <div v-if="currentPdf" class="overlay" @click.self="closePdf">
      <div class="modal-card">
        <button type="button" class="close" @click="closePdf">×</button>
        <h3 class="modal-title">{{ currentPdf?.title }}</h3>
        <p class="modal-desc" v-if="currentPdf?.description">
          {{ currentPdf?.description }}
        </p>
        <div class="pdf">
          <iframe v-if="pdfSrc" :src="pdfSrc" title="Documento"></iframe>
        </div>
      </div>
    </div>

    <!-- MODAL CONFIRMACIÓN BORRADO -->
    <div v-if="confirmDelete" class="overlay">
      <div class="confirm-card">
        <h3>Eliminar {{ deleteLabel }}</h3>
        <p>¿Estás segura de que querés borrar este {{ deleteLabel }}?</p>
        <div class="confirm-actions">
          <button class="pill pill--ghost" type="button" @click="confirmDelete = null">
            Cancelar
          </button>
          <button class="pill pill--danger" type="button" @click="performDelete">
            Borrar
          </button>
        </div>
      </div>
    </div>

    <!-- TOAST / MENSAJITO -->
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

// 🔐 admin
const isAdmin = computed(
  () => (auth.user as any)?.email === 'admin@nura.app',
)

const BUCKET = 'nura-content'

function publicUrl(path?: string | null) {
  if (!path) return ''
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/* ---------- TOAST ---------- */
const toast = ref<{ message: string; kind: 'success' | 'error' } | null>(null)

function showToast(message: string, kind: 'success' | 'error' = 'success') {
  toast.value = { message, kind }
  setTimeout(() => {
    // sólo lo cierro si sigue siendo el mismo mensaje
    if (toast.value?.message === message) {
      toast.value = null
    }
  }, 2500)
}

/* ---------- UPLOAD PDF ---------- */
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
    showToast('Error al subir el PDF. Revisá la consola.', 'error')
    return null
  }

  return data?.path ?? null
}

/* ---------- LOADERS ---------- */
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
  if (!error && data) videos.value = data as VideoRow[]
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
      ((p as any[] | null) ?? []).map((r) => [r.guide_id as IdType, r.percent]),
    )
  }
  loading.value.guides = false
}

/* ---------- ABM VIDEOS ---------- */
const editingVideoId = ref<IdType | null>(null)
const videoForm = ref<{
  title: string
  description: string
  cover_path: string
  file_path: string
  duration_seconds: number | null
}>({
  title: '',
  description: '',
  cover_path: '',
  file_path: '',
  duration_seconds: null,
})

function resetVideoForm() {
  editingVideoId.value = null
  videoForm.value = {
    title: '',
    description: '',
    cover_path: '',
    file_path: '',
    duration_seconds: null,
  }
}

function startEditVideo(v: VideoRow) {
  editingVideoId.value = v.id
  videoForm.value = {
    title: v.title,
    description: v.description ?? '',
    cover_path: v.cover_path ?? '',
    file_path: v.file_path,
    duration_seconds: v.duration_seconds ?? null,
  }
}

async function saveVideo() {
  if (!videoForm.value.title || !videoForm.value.file_path) {
    showToast('Título y archivo de video son obligatorios.', 'error')
    return
  }

  const payload = {
    title: videoForm.value.title,
    description: videoForm.value.description || null,
    cover_path: videoForm.value.cover_path || null,
    file_path: videoForm.value.file_path,
    duration_seconds: videoForm.value.duration_seconds,
  }

  if (editingVideoId.value != null) {
    const { error } = await supabase
      .from('videos')
      .update(payload)
      .eq('id', editingVideoId.value)
    if (error) {
      console.error(error)
      showToast('Hubo un problema al actualizar el video.', 'error')
      return
    }
    showToast('Video editado correctamente.')
  } else {
    const { error } = await supabase.from('videos').insert([payload])
    if (error) {
      console.error(error)
      showToast('Hubo un problema al crear el video.', 'error')
      return
    }
    showToast('Video creado correctamente.')
  }

  await loadVideos()
  resetVideoForm()
}

/* ---------- ABM LIBROS ---------- */
const editingBookId = ref<IdType | null>(null)
const bookForm = ref<{
  title: string
  cover_path: string
  file_path: string
}>({
  title: '',
  cover_path: '',
  file_path: '',
})

function resetBookForm() {
  editingBookId.value = null
  bookForm.value = { title: '', cover_path: '', file_path: '' }
  bookPdfFile.value = null
  bookPdfName.value = ''
}

function startEditBook(b: BookRow) {
  editingBookId.value = b.id
  bookForm.value = {
    title: b.title,
    cover_path: b.cover_path ?? '',
    file_path: b.file_path,
  }
  bookPdfFile.value = null
  bookPdfName.value = ''
}

async function saveBook() {
  if (
    !bookForm.value.title ||
    (!bookForm.value.file_path && !bookPdfFile.value)
  ) {
    showToast('Título y archivo del libro (ruta o PDF) son obligatorios.', 'error')
    return
  }

  // si subió PDF, lo subimos y usamos ese path
  if (!bookForm.value.file_path && bookPdfFile.value) {
    const uploadedPath = await uploadPdf(bookPdfFile.value, 'books')
    if (!uploadedPath) return
    bookForm.value.file_path = uploadedPath
  }

  const payload = {
    title: bookForm.value.title,
    cover_path: bookForm.value.cover_path || null,
    file_path: bookForm.value.file_path,
  }

  if (editingBookId.value != null) {
    const { error } = await supabase
      .from('books')
      .update(payload)
      .eq('id', editingBookId.value)
    if (error) {
      console.error(error)
      showToast('Hubo un problema al actualizar el libro.', 'error')
      return
    }
    showToast('Libro editado correctamente.')
  } else {
    const { error } = await supabase.from('books').insert([payload])
    if (error) {
      console.error(error)
      showToast('Hubo un problema al crear el libro.', 'error')
      return
    }
    showToast('Libro creado correctamente.')
  }

  await loadBooksAndArticles()
  resetBookForm()
}

/* ---------- ABM GUÍAS ---------- */
const editingGuideId = ref<IdType | null>(null)
const guideForm = ref<{
  title: string
  description: string
  cover_path: string
  file_path: string
}>({
  title: '',
  description: '',
  cover_path: '',
  file_path: '',
})

function resetGuideForm() {
  editingGuideId.value = null
  guideForm.value = {
    title: '',
    description: '',
    cover_path: '',
    file_path: '',
  }
  guidePdfFile.value = null
  guidePdfName.value = ''
}

function startEditGuide(g: GuideRow) {
  editingGuideId.value = g.id
  guideForm.value = {
    title: g.title,
    description: g.description ?? '',
    cover_path: g.cover_path ?? '',
    file_path: g.file_path,
  }
  guidePdfFile.value = null
  guidePdfName.value = ''
}

async function saveGuide() {
  if (
    !guideForm.value.title ||
    (!guideForm.value.file_path && !guidePdfFile.value)
  ) {
    showToast('Título y archivo de la guía (ruta o PDF) son obligatorios.', 'error')
    return
  }

  if (!guideForm.value.file_path && guidePdfFile.value) {
    const uploadedPath = await uploadPdf(guidePdfFile.value, 'guides')
    if (!uploadedPath) return
    guideForm.value.file_path = uploadedPath
  }

  const payload = {
    title: guideForm.value.title,
    description: guideForm.value.description || null,
    cover_path: guideForm.value.cover_path || null,
    file_path: guideForm.value.file_path,
  }

  if (editingGuideId.value != null) {
    const { error } = await supabase
      .from('guides')
      .update(payload)
      .eq('id', editingGuideId.value)
    if (error) {
      console.error(error)
      showToast('Hubo un problema al actualizar la guía.', 'error')
      return
    }
    showToast('Guía editada correctamente.')
  } else {
    const { error } = await supabase.from('guides').insert([payload])
    if (error) {
      console.error(error)
      showToast('Hubo un problema al crear la guía.', 'error')
      return
    }
    showToast('Guía creada correctamente.')
  }

  await loadGuides()
  resetGuideForm()
}

/* ---------- CONFIRMAR BORRADO ---------- */
const confirmDelete = ref<{ type: 'video' | 'book' | 'guide'; id: IdType } | null>(
  null,
)

const deleteLabel = computed(() => {
  if (!confirmDelete.value) return ''
  if (confirmDelete.value.type === 'video') return 'video'
  if (confirmDelete.value.type === 'book') return 'libro'
  return 'guía'
})

function askDelete(type: 'video' | 'book' | 'guide', id: IdType) {
  confirmDelete.value = { type, id }
}

async function performDelete() {
  if (!confirmDelete.value) return
  const { type, id } = confirmDelete.value

  if (type === 'video') {
    await supabase.from('videos').delete().eq('id', id)
    await loadVideos()
    if (editingVideoId.value === id) resetVideoForm()
    showToast('Video borrado correctamente.')
  } else if (type === 'book') {
    await supabase.from('books').delete().eq('id', id)
    await loadBooksAndArticles()
    if (editingBookId.value === id) resetBookForm()
    showToast('Libro borrado correctamente.')
  } else if (type === 'guide') {
    await supabase.from('guides').delete().eq('id', id)
    await loadGuides()
    if (editingGuideId.value === id) resetGuideForm()
    showToast('Guía borrada correctamente.')
  }

  confirmDelete.value = null
}

/* ---------- VIDEO OVERLAY ---------- */
const currentVideo = ref<VideoRow | null>(null)
const videoSrc = ref('')

async function openVideo(v: VideoRow) {
  currentVideo.value = v
  videoSrc.value = publicUrl(v.file_path)
}

function closeVideo() {
  currentVideo.value = null
  videoSrc.value = ''
}

/* ---------- PDF OVERLAY (Libros / Guías) ---------- */
const currentPdf = ref<{ title: string; description?: string | null } | null>(null)
const pdfSrc = ref('')

async function openBook(b: BookRow) {
  currentPdf.value = { title: b.title }
  pdfSrc.value = publicUrl(b.file_path)
}

async function openGuide(g: GuideRow) {
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

/* ---- Ejemplo de datos para crear un video nuevo ----
  Título: "Introducción a Nura"
  Descripción: "Video de bienvenida a la plataforma Nura."
  cover_path: "videos/covers/intro-nura.jpg"
  file_path:  "videos/files/intro-nura.mp4"
  duración:  180 (3 minutos)
*/
</script>

<style scoped>
.contenido {
  background: #fff;
  padding: 24px 18px 48px;
  max-width: 1100px;
  margin: 0 auto;
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
  gap: 10px;
}
.field--full {
  grid-column: 1 / -1;
}
.abm-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.field input,
.field textarea {
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  padding: 6px 10px;
  font-size: 0.85rem;
  background: #f9fafb;
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

input[type='file'] {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
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
  background: #e4f3f3;
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
  background: #f1fbfb;
  transform: translateY(-3px);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.12);
}

/* ================= EDITAR / BORRAR EN CARDS ================= */
.small-actions {
  display: flex;
  justify-content: flex-start;
  gap: 8px;
  margin-top: 10px;
}

.btn-edit,
.btn-delete {
  background: transparent;
  border: 2px solid #50bdbd;
  border-radius: 20px;
  padding: 5px 14px;
  font-size: 14px;
  cursor: pointer;
  transition: 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-edit {
  color: #000;
}

.btn-edit:hover {
  background: #85b5e046;
  border-color: #85b6e0;
  transform: translateY(-2px);
}

.btn-delete {
  color: #f10909;
}

.btn-delete:hover {
  background: #ff1c1c20;
  border-color: #c20808;
  transform: translateY(-2px);
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
  padding: 8px 12px;
  border-radius: 999px;
  background: #50bdbd;
  color: #fff;
  border: none;
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

.section {
  display: grid;
  gap: 14px;
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

/* Overlay genérico para video y PDF */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
}

/* Contenido del modal */
.modal-card {
  position: relative;
  background: #ffffff;
  border-radius: 18px;
  overflow: hidden;
  width: min(900px, 96vw);
}

/* Botón de cierre */
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

/* Barra de título del modal */
.modal-title {
  margin: 0;
  padding: 10px 48px 10px 18px;
  background: #50bdbd;
  height: 30px;
  color: #ffffff;
  font-size: 1.2rem;
}

/* Texto debajo del título */
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

/* Confirm delete modal */
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

/* Pills / botones genéricos */
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
  padding: 10px 22px;
  font-size: 0.9rem;
}
.pill--ghost {
  background: #ffffff;
  color: #4b5563;
  border: 1px solid #e5e7eb;
  box-shadow: none;
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
  background: #22c55e;
}
.toast.error {
  background: #ef4444;
}
</style>
