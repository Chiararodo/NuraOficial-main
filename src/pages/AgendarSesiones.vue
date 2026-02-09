<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const auth = useAuthStore()

type SesionDb = {
  id: string
  title: string
  professional: string
  role: string
  date: string
  hour: string
  modality: string
  capacity: number
  registered: number | null
  description: string | null
  image_path: string | null
}

type Sesion = {
  id: string
  titulo: string
  profesional: string
  rol: string
  fecha: string
  hora: string
  modalidad: string
  capacidad: number
  registrados: number
  descripcion: string
  imagen: string
}

const sesiones = ref<Sesion[]>([])
const loading = ref(true)

/* ===== Notificaciones ===== */
async function createNotification(
  title: string,
  body: string,
  type: string | null = null
) {
  if (!auth.user) return

  const { error } = await supabase.from('notifications').insert({
    user_id: auth.user.id,
    title,
    body,
    type
  })

  if (error) {
    console.error('Error creando notificación:', error)
  }
}

/* ================== HELPERS ================== */

function formatFecha(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

/* ================== CARGAR SESIONES ================== */

async function loadSesiones() {
  loading.value = true

  const { data, error } = await supabase
    .from('sessions')
    .select(
      'id, title, professional, role, date, hour, modality, capacity, registered, description, image_path'
    )
    .order('date', { ascending: true })
    .order('hour', { ascending: true })

  if (error) {
    console.error('Error cargando sesiones:', error)
    sesiones.value = []
    loading.value = false
    return
  }

  const rows = (data || []) as SesionDb[]

  sesiones.value = rows.map((r) => ({
    id: r.id,
    titulo: r.title,
    profesional: r.professional,
    rol: r.role,
    fecha: formatFecha(r.date),
    hora: r.hour,
    modalidad: r.modality,
    capacidad: r.capacity,
    registrados: r.registered ?? 0,
    descripcion: r.description ?? '',
    imagen: r.image_path || '/covers/placeholder-session.jpg'
  }))

  loading.value = false
}

onMounted(() => {
  loadSesiones()
})

/* ================== NAV ================== */

function goBackToAgendar() {
  router.push('/app/agendar')
}
function goEventos() {
  router.push('/app/agendar/eventos')
}

/* ================== MODAL ================== */

const showModal = ref(false)
const modalTitle = ref('')
const modalText = ref('')

function openModal(title: string, text: string) {
  modalTitle.value = title
  modalText.value = text
  showModal.value = true
}

/* ================== CUPOS ================== */

function estaLlena(s: Sesion) {
  return s.registrados >= s.capacidad
}

function cuposTexto(s: Sesion) {
  if (estaLlena(s)) {
    return 'Cupos completos'
  }
  return `Cupos: ${s.registrados}/${s.capacidad} personas`
}

/* ========== REGISTRARSE EN UNA SESIÓN ========== */

async function registrarEnSesion(s: Sesion) {
  if (!auth.user) {
    openModal(
      'Iniciá sesión',
      'Necesitás iniciar sesión para reservar un lugar en la sesión grupal.'
    )
    return
  }

  // 1) ¿Ya está registrada esta usuaria en esta sesión?
  const { data: existingReg, error: regError } = await supabase
    .from('session_registrations')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('session_id', s.id)
    .maybeSingle()

  if (!regError && existingReg) {
    openModal(
      'Ya estás registrada',
      'Ya tenés un lugar reservado en esta sesión grupal.'
    )
    return
  }

  // 2) Traer capacidad real desde la base
  const { data: sessionRow, error: sessionError } = await supabase
    .from('sessions')
    .select('capacity, registered')
    .eq('id', s.id)
    .maybeSingle()

  if (sessionError || !sessionRow) {
    console.error('Error consultando cupos:', sessionError)
    openModal(
      'Error',
      'No pudimos verificar los cupos en este momento. Probá de nuevo más tarde.'
    )
    return
  }

  const capacidadActual = sessionRow.capacity
  const registradosActuales = sessionRow.registered ?? 0

  // 3) Si ya se llenó, actualizar el front y avisar
  if (registradosActuales >= capacidadActual) {
    s.registrados = registradosActuales
    openModal(
      'Sesión completa',
      'Esta sesión ya alcanzó el máximo de personas. Podés sumarte a otra fecha.'
    )
    return
  }

  // 4) Guardar inscripción en session_registrations
  const { error: insertError } = await supabase
    .from('session_registrations')
    .insert({
      user_id: auth.user.id,
      session_id: s.id
    })

  if (insertError) {
    if ((insertError as any).code === '23505') {
      openModal(
        'Ya estás registrada',
        'Ya tenés un lugar reservado en esta sesión grupal.'
      )
    } else {
      console.error('Error registrando en sesión:', insertError)
      openModal(
        'Error',
        'No pudimos registrar tu lugar en esta sesión. Probá de nuevo.'
      )
    }
    return
  }

  // 5) Actualizar contador de registrados en sessions
  const nuevoValor = registradosActuales + 1

  const { error: updError } = await supabase
    .from('sessions')
    .update({ registered: nuevoValor })
    .eq('id', s.id)

  if (updError) {
    console.error('Error actualizando cupos:', updError)
    await loadSesiones()
    openModal(
      'Registrada',
      'Tu inscripción se guardó, pero hubo un problema actualizando los cupos en pantalla.'
    )
    return
  }

  s.registrados = nuevoValor

  // 6) Notificación real
  await createNotification(
    'Te registraste en una sesión grupal',
    `Ya estás registrada en "${s.titulo}" el ${s.fecha} a las ${s.hora} (${s.modalidad}).`,
    'session'
  )

  openModal(
    'Te registraste en la sesión',
    'Tu lugar quedó reservado en esta sesión grupal. Te vamos a recordar el día del encuentro.'
  )
}
</script>


<template>
  <h1 class="visually-hidden">Agendar sesiones grupales</h1>
  <main class="agendar-sub">
    <div class="inner">
      <!-- Header -->
      <header class="sub-header">
        <button class="back-link" type="button" @click="goBackToAgendar">
          <span class="arrow">←</span>
        </button>
        <h1>Sesiones</h1>
      </header>

      <!-- Tabs -->
      <div class="tabs-row">
        <button class="tab-pill" type="button" @click="goEventos">
          Eventos
        </button>
        <button class="tab-pill tab-pill--active" type="button">
          Sesiones
        </button>
      </div>

      <p v-if="loading" class="state">Cargando sesiones…</p>

      <!-- Lista de sesiones -->
      <section v-else class="lista">
        <article v-for="s in sesiones" :key="s.id" class="ses-card">
          <div class="ses-img">
            <img :src="s.imagen" :alt="s.titulo" />
          </div>

          <div class="ses-body">
            <h2 class="title">{{ s.titulo }}</h2>
            <p class="meta">
              Con: {{ s.profesional }} — {{ s.rol }}<br />
              {{ s.fecha }} · {{ s.hora }} hs · {{ s.modalidad }}
            </p>

            <!-- Fila de cupos clickeable -->
            <button
              class="cupos-btn"
              type="button"
              :class="{ full: estaLlena(s) }"
              @click="registrarEnSesion(s)"
            >
              {{ cuposTexto(s) }}
            </button>

            <p class="desc">
              {{ s.descripcion }}
            </p>
          </div>
        </article>
      </section>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal" @click.self="showModal = false">
      <div class="modal-box">
        <h3 class="modal-title">{{ modalTitle }}</h3>
        <p class="modal-text">
          {{ modalText }}
        </p>
        <button class="btn-close" type="button" @click="showModal = false">
          Entendido
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.agendar-sub {
  background: #ffffff;
  padding: 20px 18px 40px;
}

.inner {
  max-width: 1100px;
  margin: 0 auto;
}

/* Header */
.sub-header {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 1100px;
  margin: 0 auto 14px;
}
.sub-header h1 {
  margin: 0;
  font-size: 1.4rem;
  color: #46bdbd;
  font-weight: 700;
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

/* Tabs */
.tabs-row {
  margin: 4px 0 18px;
  display: flex;
  justify-content: flex-start;
  gap: 24px;
}
@media (min-width: 800px) {
  .tabs-row {
    justify-content: center;
    gap: 80px;
  }
}
.tab-pill {
  padding: 7px 26px;
  border-radius: 999px;
  border: none;
  background: #85b6e0;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.18s ease, background 0.18s ease;
}
.tab-pill--active {
  background: #50bdbd;
}
.tab-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.1);
}

/* Lista / cards */
.lista {
  display: grid;
  gap: 16px;
}
@media (min-width: 900px) {
  .lista {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.ses-card {
  display: flex;
  gap: 12px;
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid #e5edf6;
  padding: 12px 14px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
}

.ses-img {
  flex: 0 0 110px;
}
.ses-img img {
  width: 110px;
  height: 110px;
  object-fit: cover;
  border-radius: 14px;
}

.ses-body {
  display: grid;
  gap: 6px;
}

.title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
}
.meta {
  margin: 0;
  font-size: 0.82rem;
  color: #6b7280;
}
.desc {
  margin: 0;
  font-size: 0.9rem;
  color: #374151;
}

/* Cupos clickeable */
.cupos-btn {
  margin-top: 4px;
  padding: 6px 14px;
  border-radius: 999px;
  border: none;
  background: #e0f7f7;
  color: #047777;
  font-size: 0.82rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  width: fit-content;
  box-shadow: 0 4px 10px rgba(80, 189, 189, 0.25);
  transition: background 0.15s ease, transform 0.08s ease, box-shadow 0.15s ease;
}
.cupos-btn:hover {
  background: #c6f0f0;
  transform: translateY(-1px);
}
.cupos-btn.full {
  background: #e5e7eb;
  color: #6b7280;
  box-shadow: none;
  cursor: default;
}

/* Estado */
.state {
  font-size: 0.9rem;
  color: #4b5563;
  margin-bottom: 12px;
}

/* Modal */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 40;
}
.modal-box {
  background: #ffffff;
  border-radius: 18px;
  padding: 18px 18px 16px;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
  text-align: center;
}
.modal-title {
  margin: 0 0 8px;
  font-size: 1.1rem;
  font-weight: 700;
  color: #111827;
}
.modal-text {
  margin: 0 0 12px;
  font-size: 0.92rem;
  color: #4b5563;
}
.btn-close {
  margin-top: 4px;
  border: none;
  border-radius: 999px;
  padding: 8px 18px;
  background: #50bdbd;
  color: #ffffff;
  font-weight: 600;
  cursor: pointer;
}
</style>
