<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

type OpcionId = 'sesiones' | 'turno' | 'eventos' | 'diario'

const opciones = [
  {
    id: 'sesiones' as OpcionId,
    titulo: 'Sesiones Grupales',
    descripcion: `
Espacios virtuales guiados por profesionales,
donde las usuarias pueden compartir experiencias
y trabajar juntas temas como ansiedad, relación con la comida y autocuidado.
Cada sesión tiene un cupo limitado y se desarrolla en un entorno de confianza.
    `,
    img: '/icons/nuri-bien.png',
    boton: 'Entrar',
  },
  {
    id: 'turno' as OpcionId,
    titulo: 'Turno con profesional',
    descripcion: `
Podés reservar consultas individuales con profesionales del equipo de Nura,
eligiendo día, horario y modalidad. Por ahora, los turnos se gestionan
a través de la cartilla de profesionales.
    `,
    img: '/icons/nuri-normal.png',
    boton: 'Agendar',
  },
  {
    id: 'eventos' as OpcionId,
    titulo: 'Eventos Grupales',
    descripcion: `
Charlas y talleres especiales donde se abordan diferentes temáticas
vinculadas al bienestar emocional y la salud integral, con especialistas invitados.
Los eventos se realizan en fechas puntuales y son una oportunidad
para aprender, compartir y conectar con otras personas.
    `,
    img: '/icons/nuri-muybien.png',
    boton: 'Entrar',
  },
  {
    id: 'diario' as OpcionId,
    titulo: 'Escribir en mi Diario',
    descripcion: `
Registrá cómo te sentís, qué pensaste durante el día y
qué cosas te ayudaron. Tu diario es un espacio privado
para hacer seguimiento de tu bienestar emocional.
    `,
    img: '/icons/nuri-triste.png',
    boton: 'Escribir',
  },
]

/* ===== Modal “no disponible por el momento” ===== */
const showModal = ref(false)
const modalTitle = ref('')
const modalText = ref('')

function abrirModal(tipo: 'sesiones' | 'eventos') {
  modalTitle.value = tipo === 'sesiones'
    ? 'Sesiones grupales'
    : 'Eventos grupales'

  modalText.value =
    'Esta funcionalidad todavía no está habilitada en la versión actual de Nura. ' +
    'Próximamente vas a poder reservar tus ' +
    (tipo === 'sesiones' ? 'sesiones grupales' : 'eventos especiales') +
    ' directamente desde la app. Por ahora, podés coordinar con tu profesional o con el equipo de Nura.'

  showModal.value = true
}

function handleClick(id: OpcionId) {
  if (id === 'sesiones' || id === 'eventos') {
    abrirModal(id)
  } else if (id === 'turno') {
    // Llevar a la cartilla para elegir profesional
    router.push('/app/cartilla')
  } else if (id === 'diario') {
    router.push('/app/diario')
  }
}
</script>

<template>
  <main class="agendar">
    <h1 class="titulo">Agendar</h1>

    <div class="grid">
      <div v-for="item in opciones" :key="item.id" class="card">
        <div class="card-img">
          <img :src="item.img" alt="" />
        </div>

        <h2 class="card-title">{{ item.titulo }}</h2>
        <p class="card-desc">
          {{ item.descripcion }}
        </p>

        <button class="btn" @click="handleClick(item.id)">
          {{ item.boton }}
        </button>
      </div>
    </div>

    <!-- MODAL “Próximamente” -->
    <div v-if="showModal" class="modal">
      <div class="modal-box">
        <h3 class="modal-title">{{ modalTitle }}</h3>
        <p class="modal-text">
          {{ modalText }}
        </p>
        <button class="btn-close" @click="showModal = false">
          Entendido
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.agendar {
  padding: 24px 18px;
  padding-bottom: 60px;
}

.titulo {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--nura-green);
  margin-bottom: 20px;
}

/* Grid de cards */
.grid {
  display: grid;
  gap: 22px;
}

@media (min-width: 900px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.card {
  background: #ffffff;
  border-radius: 18px;
  padding: 18px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e9eef4;
  display: grid;
  gap: 12px;
}

.card-img img {
  width: 80px;
  height: 80px;
  object-fit: contain;
}

.card-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #333333;
}

.card-desc {
  font-size: 0.9rem;
  color: #5c5c5c;
  line-height: 1.35rem;
  white-space: pre-line;
}

.btn {
  margin-top: 6px;
  background: #85b6e0;
  color: white;
  border-radius: 12px;
  padding: 8px 16px;
  text-align: center;
  font-weight: 600;
  display: inline-block;
  width: fit-content;
  box-shadow: 0 6px 14px rgba(133, 182, 224, 0.3);
  transition: 0.2s;
  border: none;
  cursor: pointer;
}

.btn:hover {
  background: var(--nura-green);
}

/* ===== Modal ===== */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal-box {
  background: #ffffff;
  padding: 22px 20px;
  border-radius: 18px;
  max-width: 420px;
  width: 90%;
  text-align: center;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
}

.modal-title {
  margin: 0 0 10px;
  font-size: 1.1rem;
  font-weight: 700;
  color: #222;
}

.modal-text {
  margin: 0;
  font-size: 0.95rem;
  color: #4b5563;
}

.btn-close {
  margin-top: 16px;
  border: none;
  background: #50bdbd;
  color: #fff;
  padding: 0.5rem 1.2rem;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
}
</style>
