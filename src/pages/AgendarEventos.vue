<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

type Evento = {
  id: string
  titulo: string
  profesional: string
  rol: string
  fecha: string
  hora: string
  modalidad: string
  descripcion: string
  imagen: string
  disponible: boolean
  meetUrl?: string
}

const eventos = ref<Evento[]>([
  {
    id: 'ev-hoy',
    titulo: 'Evento: Respiración consciente',
    profesional: 'Lic. Martina López',
    rol: 'Psicóloga',
    fecha: 'Hoy',
    hora: '13:00',
    modalidad: 'Virtual',
    descripcion:
      'Sesión en vivo para practicar respiración consciente y cerrar el día con calma.',
    imagen: '/covers/respiracion-4-7-8.jpg',
    disponible: true,
    meetUrl: 'https://meet.google.com/fgz-jnmc-mkm',
  },
  {
    id: 'ev1',
    titulo: 'Evento: Alimentación consciente',
    profesional: 'Dra. Flor Acosta',
    rol: 'Nutricionista',
    fecha: 'Jueves 24 de abril 2026',
    hora: '18:00',
    modalidad: 'Virtual',
    descripcion:
      'En este encuentro aprenderemos a reconocer señales de hambre real, ansiedad y hábitos más conscientes.',
    imagen: '/covers/manejo-estres.png',
    disponible: false,
  },
  {
    id: 'ev2',
    titulo: 'Evento: Ansiedad y respiración',
    profesional: 'Lic. Martín Fernández',
    rol: 'Psicólogo',
    fecha: 'Sábado 27 de julio 2026',
    hora: '10:30',
    modalidad: 'Virtual',
    descripcion:
      'Trabajaremos técnicas de respiración para regular el sistema nervioso y reducir la ansiedad cotidiana.',
    imagen: '/covers/respiracion-4-7-8.jpg',
    disponible: false,
  },
  {
    id: 'ev3',
    titulo: 'Autoestima y bienestar emocional',
    profesional: 'Lic. Natalia Navarro',
    rol: 'Psicóloga',
    fecha: 'Martes 30 de septiembre 2026',
    hora: '17:00',
    modalidad: 'Virtual',
    descripcion:
      'Espacio para reflexionar sobre la relación con una misma y construir una autoestima más compasiva.',
    imagen: '/covers/afrontar-TCA.jpg',
    disponible: false,
  },
])

function goBackToAgendar() {
  router.push('/app/agendar')
}
function goSesiones() {
  router.push('/app/agendar/sesiones')
}

/* Modal “info evento” */
const showModal = ref(false)
const modalTitle = ref('')
const modalText = ref('')

function openModal(title: string, text: string) {
  modalTitle.value = title
  modalText.value = text
  showModal.value = true
}

function unirmeEvento(e: Evento) {
  if (!e.disponible || !e.meetUrl) {
    openModal(
      'Todavía no disponible',
      'Este evento se va a habilitar el día y horario indicados. Muy pronto vas a poder unirte desde acá.'
    )
    return
  }

  window.open(e.meetUrl, '_blank')
}
</script>

<template>
  <h1 class="visually-hidden">Agendar eventos</h1>
  <main class="agendar-sub">
    <header class="sub-header">
      <button class="back-link" type="button" @click="goBackToAgendar">
        <span class="arrow">←</span>
      </button>
      <h1>Eventos</h1>
    </header>

    <!-- Tabs -->
    <div class="tabs-row">
      <button class="tab-pill tab-pill--active" type="button">
        Eventos
      </button>
      <button class="tab-pill" type="button" @click="goSesiones">
        Sesiones
      </button>
    </div>

    <!-- Lista de eventos -->
    <section class="lista">
      <article v-for="e in eventos" :key="e.id" class="card">
        <div class="card-img">
          <img :src="e.imagen" :alt="e.titulo" />
        </div>

        <div class="card-body">
          <h2 class="title">{{ e.titulo }}</h2>
          <p class="meta">
            Con: {{ e.profesional }} — {{ e.rol }}<br />
            {{ e.fecha }} · {{ e.hora }} hs · {{ e.modalidad }}
          </p>
          <p class="desc">
            {{ e.descripcion }}
          </p>

          <button
            class="perfil-btn"
            :class="{ 'perfil-btn--disabled': !e.disponible }"
            type="button"
            @click="unirmeEvento(e)"
          >
            {{ e.disponible ? 'Unirme ahora' : 'Próximamente' }}
          </button>
        </div>
      </article>
    </section>

    <!-- Modal info -->
    <div v-if="showModal" class="modal" @click.self="showModal = false">
      <div class="modal-box">
        <h3 class="modal-title">{{ modalTitle }}</h3>
        <p class="modal-text">
          {{ modalText }}
        </p>
        <button
          class="perfil-btn perfil-btn--small"
          type="button"
          @click="showModal = false"
        >
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

/* Tabs  */
.tabs-row {
  max-width: 1100px;
  margin: 4px auto 18px;
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
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}
@media (min-width: 900px) {
  .lista {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.card {
  display: flex;
  gap: 12px;
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid #e5edf6;
  padding: 12px 14px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
}

.card-img img {
  width: 110px;
  height: 110px;
  object-fit: cover;
  border-radius: 14px;
}

/* Texto */
.card-body {
  display: grid;
  gap: 4px;
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
  margin: 2px 0 8px;
  font-size: 0.9rem;
  color: #374151;
}

/* Botones */
.perfil-btn {
  align-self: flex-start;
  padding: 7px 18px;
  border-radius: 999px;
  border: none;
  background: #50bdbd;
  color: #ffffff;
  font-size: 0.9rem;
  min-width: 140px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(80, 189, 189, 0.4);
  transition: background 0.15s ease, transform 0.08s ease, box-shadow 0.18s ease;
}
.perfil-btn--disabled {
  background: #cbd5e1;
  box-shadow: none;
  cursor: default;
}
.perfil-btn:hover:not(.perfil-btn--disabled) {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(80, 189, 189, 0.35);
}
.perfil-btn--small {
  width: auto;
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
</style>
