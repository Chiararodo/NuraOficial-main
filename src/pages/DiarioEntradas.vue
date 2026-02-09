<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/composables/useSupabase'

const router = useRouter()
const auth = useAuthStore()

type Entry = {
  id: number | string
  on_date: string
  mood: string
  content: string | null
  archived?: boolean
}

const entries = ref<Entry[]>([])
const loading = ref(true)

/* MODAL BORRAR */
const showDeleteModal = ref(false)
const entryToDelete = ref<Entry | null>(null)
const deletingId = ref<number | string | null>(null)

/* ARCHIVADAS */
const showArchived = ref(false)

/* FECHA LINDO */
function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/* Moods con colores */
function moodLabel(mood: string) {
  return (
    {
      triste: 'Triste',
      normal: 'Normal',
      bien: 'Bien',
      muybien: 'Muy bien',
    }[mood] || mood
  )
}

function moodColor(mood: string) {
  return (
    {
      triste: '#74c0f4',
      normal: '#b197fc',
      bien: '#8ce99a',
      muybien: '#ffa94d',
    }[mood] || '#50bdbd'
  )
}

/* CARGAR ENTRADAS */
onMounted(async () => {
  if (!auth.user) {
    loading.value = false
    return
  }

  const { data } = await supabase
    .from('diary_entries')
    .select('id,on_date,mood,content,archived')
    .eq('user_id', auth.user.id)
    .order('on_date', { ascending: false })

  if (data) entries.value = data
  loading.value = false
})

const visibleEntries = computed(() =>
  entries.value.filter((e) => !e.archived)
)

const archivedEntries = computed(() =>
  entries.value.filter((e) => e.archived)
)

/* ACCIONES BÁSICAS */
function goBack() {
  router.push('/app/diario')
}

function editEntry(entry: Entry) {
  router.push({ path: '/app/diario', query: { date: entry.on_date } })
}

/* ARCHIVAR / DESARCHIVAR */
async function toggleArchive(entry: Entry) {
  if (!auth.user) return

  const newValue = !entry.archived

  const { error } = await supabase
    .from('diary_entries')
    .update({ archived: newValue })
    .eq('id', entry.id)
    .eq('user_id', auth.user.id)

  if (error) {
    console.error(error)
    alert('No pudimos actualizar esta entrada. Probá de nuevo.')
    return
  }

  const idx = entries.value.findIndex((e) => e.id === entry.id)
  if (idx !== -1) {
    entries.value[idx] = { ...entries.value[idx], archived: newValue }
  }
}

/* COMPARTIR POR MAIL */
function shareEntry(entry: Entry) {
  const subject = `Mi entrada de diario en Nura (${formatDate(entry.on_date)})`
  const mood = moodLabel(entry.mood)
  const text = entry.content || 'Sin texto registrado.'

  const body = `Hola,

Quería compartir esta entrada de mi diario en Nura:

Fecha: ${formatDate(entry.on_date)}
Estado de ánimo: ${mood}

${text}

— Enviada desde mi diario en Nura`

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`

  window.open(gmailUrl, '_blank')
}




/* BORRAR */
function openDelete(entry: Entry) {
  entryToDelete.value = entry
  showDeleteModal.value = true
}

function closeDelete() {
  showDeleteModal.value = false
  entryToDelete.value = null
}

async function confirmDelete() {
  if (!auth.user || !entryToDelete.value) return

  deletingId.value = entryToDelete.value.id

  await supabase
    .from('diary_entries')
    .delete()
    .eq('id', entryToDelete.value.id)
    .eq('user_id', auth.user.id)

  entries.value = entries.value.filter((e) => e.id !== entryToDelete.value?.id)

  deletingId.value = null
  closeDelete()
}
</script>

<template>
  <main class="page">
    <header class="top-bar">
      <button class="back-link" type="button" @click="goBack">
        <span class="arrow">←</span>
      </button>

      <div>
        <h2>Mis entradas de diario</h2>
        <p class="subtitle">Revisá, editá o archiva tus registros.</p>
      </div>
    </header>

    <!-- Loading -->
    <section v-if="loading" class="card empty">
      Cargando…
    </section>

    <!-- Sin entradas -->
    <section
      v-else-if="!visibleEntries.length && !archivedEntries.length"
      class="card empty"
    >
      <h3>Todavía no tenés entradas</h3>
      <p>Podés comenzar hoy mismo.</p>
      <button class="btn-main" @click="goBack">Escribir mi primera entrada</button>
    </section>

    <!-- ENTRADAS VISIBLES -->
    <section v-else class="entries">
      <h3 v-if="visibleEntries.length" class="section-title">
        Entradas recientes
      </h3>

      <article v-for="e in visibleEntries" :key="e.id" class="entry-card">
        <header class="entry-header">
          <div class="left">
            <span class="date">{{ formatDate(e.on_date) }}</span>

            <span class="mood-pill" :style="{ background: moodColor(e.mood) }">
              {{ moodLabel(e.mood) }}
            </span>
          </div>

          <div class="actions">
            <button class="link-btn" @click="editEntry(e)">Editar</button>

            <button class="link-btn share" @click="shareEntry(e)">
              Compartir
            </button>

            <button class="link-btn soft" @click="toggleArchive(e)">
              Archivar
            </button>

            <button
              class="link-btn danger"
              :disabled="deletingId === e.id"
              @click="openDelete(e)"
            >
              {{ deletingId === e.id ? '...' : 'Borrar' }}
            </button>
          </div>
        </header>

        <p class="text">
          {{ e.content || 'Sin texto registrado.' }}
        </p>
      </article>

      <!-- ARCHIVADAS -->
      <section v-if="archivedEntries.length" class="archived-block">
        <button class="archived-toggle" @click="showArchived = !showArchived">
          <span>
            {{ showArchived ? 'Ocultar' : 'Ver' }} entradas archivadas
          </span>
          <span class="count">({{ archivedEntries.length }})</span>
        </button>

        <transition name="fade">
          <div v-if="showArchived" class="archived-list">
            <article
              v-for="e in archivedEntries"
              :key="e.id"
              class="entry-card entry-card--archived"
            >
              <header class="entry-header">
                <div class="left">
                  <span class="date">{{ formatDate(e.on_date) }}</span>

                  <span class="mood-pill" :style="{ background: moodColor(e.mood) }">
                    {{ moodLabel(e.mood) }}
                  </span>
                </div>

                <div class="actions">
                  <button class="link-btn share" @click="shareEntry(e)">
                    Compartir
                  </button>

                  <button class="link-btn soft" @click="toggleArchive(e)">
                    Desarchivar
                  </button>

                  <button
                    class="link-btn danger"
                    :disabled="deletingId === e.id"
                    @click="openDelete(e)"
                  >
                    {{ deletingId === e.id ? '...' : 'Borrar' }}
                  </button>
                </div>
              </header>

              <p class="text">
                {{ e.content || 'Sin texto registrado.' }}
              </p>
            </article>
          </div>
        </transition>
      </section>
    </section>

    <!-- MODAL BORRAR -->
    <div
      v-if="showDeleteModal"
      class="modal-backdrop"
      @click.self="closeDelete"
    >
      <div class="modal-card modal-confirm-cancel">
        <header class="modal-header">
          <h3 class="modal-title">Borrar entrada</h3>
          <button class="modal-close" @click="closeDelete">×</button>
        </header>

        <section class="modal-body">
          <p>¿Querés borrar esta entrada de tu diario?</p>
          <p >Esta acción no se puede deshacer.</p>
        </section>

        <footer class="modal-footer">
          <button class="pill pill--ghost" @click="closeDelete">
            Mantener entrada
          </button>
          <button class="pill pill--danger" @click="confirmDelete">
            Borrar entrada
          </button>
        </footer>
      </div>
    </div>
  </main>
</template>

<style scoped>
.page {
  background: #fff;
  padding: 24px 18px 48px;
  max-width: 1100px;
  margin: 0 auto;
}

.top-bar {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 20px;
}

.subtitle {
  margin-top: -4px;
  color: #666;
}

.back-link {
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 0;
}

.arrow {
  font-size: 1.5rem;
  color: #46bdbd;
}

.card.empty {
  background: #e6f8f8;
  border-radius: 18px;
  padding: 16px 20px;
  border: 1px solid #cfeeee;
  text-align: center;
}

.btn-main {
  margin-top: 10px;
  border-radius: 999px;
  padding: 8px 18px;
  border: none;
  background: #50bdbd;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.entries {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.section-title {
  font-size: 1rem;
  margin-bottom: 6px;
}

.entry-card {
  background: #e6f8f8;
  border-radius: 18px;
  padding: 16px 20px;
  border: 1px solid #cfeeee;
}

.entry-card--archived {
  opacity: 0.9;
}

.text {
  white-space: pre-wrap;
  line-height: 1.4rem;
  overflow-wrap: break-word;
  word-break: break-word;
  max-width: 100%;
}

.entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.date {
  font-weight: 700;
}

.mood-pill {
  padding: 4px 12px;
  border-radius: 16px;
  font-weight: 600;
  font-size: 14px;
  color: white;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.link-btn {
  border: 2px solid #50bdbd;
  border-radius: 20px;
  padding: 6px 12px;
  background: transparent;
  color: #50bdbd;
  font-size: 13px;
  font-weight: 550;
  cursor: pointer;
  transition: 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.link-btn:hover {
  background: #85b5e046;
  border-color: #85b6e0;
  transform: translateY(-2px);
}

.link-btn.soft {
  border-color: #9ca3af;
  color: #4b5563;
}

.link-btn.soft:hover {
  background: #35383d17;
  border-color: #a3a9b3ff;
}

.link-btn.share {
  border-color: #6889c4d5;
  color: #688ac4ff;
}

.link-btn.share:hover {
  background: #688ac417;
  border-color: #b7cff7ff;
}

.link-btn.danger {
  color: #f10909;
  border-color: #f10909;
}

.link-btn.danger:hover {
  background: #ff989873;
  border-color: #c20808;
}

.archived-block {
  margin-top: 20px;
}

.archived-toggle {
  width: 100%;
  border-radius: 999px;
  padding: 8px 14px;
  border: none;
  background: #d1e4e4;
  color: #0f172a;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  cursor: pointer;
}

.archived-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.count {
  font-weight: 600;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-card {
  background: #ffffff;
  border-radius: 24px;
  width: 100%;
  max-width: 430px;
  box-shadow: 0 18px 40px rgba(30, 41, 59, 0.22);
  overflow: hidden;
}

.modal-header {
  padding: 10px 18px;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #50bdbd;
  margin: 0;
}

.modal-close {
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
  color: #000000ff;
  cursor: pointer;
  transition: all 0.15s ease;
}

.modal-close:hover {
  background: #e2e8f0;
  transform: scale(1.05);
}

.modal-body {
  padding: 20px 19px 3px;
  font-size: 1.1rem;
  font-weight: 500;
  color: #374151;
  line-height: 1.5;
  text-align: left;
}

.modal-footer {
  padding: 14px 20px 18px;
  border-top: 1px solid #eef2f7;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.pill {
  border-radius: 999px;
  padding: 7px 16px;
  font-size: 0.8rem;
  border: none;
  background: var(--nura-green);
  color: #ffffff;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.15s ease;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.35);
}

.pill--ghost {
  width: 40%;
  background: #50bdbd;
  color: #ffffff;
  padding: 10px 18px;
  border-radius: 999px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  font-size: 0.9rem;
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(80, 189, 189, 0.3);
}

.pill--ghost:hover {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(80, 189, 189, 0.35);
}

.pill--danger {
  padding: 10px 18px;
  border-radius: 999px;
  background: #ef4444;
  color: #ffffff;
  border: none;
  font-size: 0.85rem;
  font-weight: 500;
  box-shadow: 0 8px 18px rgba(239, 68, 68, 0.4);
}

.pill--danger:hover {
  background: #dc2626;
  transform: translateY(-1px);
}

/* ====== RESPONSIVE MOBILE / iOS ====== */
@media (max-width: 768px) {
  .page {
    padding: 16px 12px 72px;
  }

  .top-bar {
    align-items: flex-start;
    gap: 10px;
  }

  .top-bar h2 {
    font-size: 1.2rem;
  }

  .subtitle {
    font-size: 0.85rem;
  }

  .entry-card {
    padding: 12px 14px;
  }

  .entry-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .actions {
    width: 100%;
    justify-content: flex-start;
    gap: 4px;
  }

  .link-btn {
    font-size: 12px;
    padding: 5px 10px;
  }

  .mood-pill {
    font-size: 12px;
    padding: 3px 10px;
  }

  .archived-toggle {
    font-size: 0.85rem;
    padding: 8px 12px;
  }

  .modal-card {
    max-width: 95%;
  }

  .modal-body {
    font-size: 0.95rem;
  }

  .pill--ghost,
  .pill--danger {
    width: auto;
    font-size: 0.85rem;
    padding-inline: 14px;
  }
}

/* Ajustes específicos para Safari iOS (safe area y modales) */
@supports (-webkit-touch-callout: none) {
  .page {
    padding-bottom: calc(60px + env(safe-area-inset-bottom));
  }

  .modal-backdrop {
    align-items: flex-end;
    padding-bottom: calc(20px + env(safe-area-inset-bottom));
  }

  .modal-card {
    border-radius: 24px 24px 0 0;
    max-height: 90vh;
  }
}
</style>

