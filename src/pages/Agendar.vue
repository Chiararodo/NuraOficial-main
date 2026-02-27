<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

type OpcionId = 'sesiones' | 'turno' | 'eventos' | 'foro'

const routeById: Record<OpcionId, string> = {
  sesiones: '/app/agendar/sesiones',
  eventos: '/app/agendar/eventos',
  turno: '/app/cartilla',
  foro: '/app/foro'
}

const opciones = computed(() => [
  {
    id: 'sesiones' as OpcionId,
    titulo: t('agendar.options.sessions.title'),
    descripcion: t('agendar.options.sessions.description'),
    img: '/covers/sesiongrupal.png',
    boton: t('agendar.options.sessions.button')
  },
  {
    id: 'turno' as OpcionId,
    titulo: t('agendar.options.appointment.title'),
    descripcion: t('agendar.options.appointment.description'),
    img: '/covers/turnos.jpeg',
    boton: t('agendar.options.appointment.button')
  },
  {
    id: 'eventos' as OpcionId,
    titulo: t('agendar.options.events.title'),
    descripcion: t('agendar.options.events.description'),
    img: '/covers/eventosgrupales.jpg',
    boton: t('agendar.options.events.button')
  },
  {
    id: 'foro' as OpcionId,
    titulo: t('agendar.options.forum.title'),
    descripcion: t('agendar.options.forum.description'),
    img: '/covers/foro.jpg',
    boton: t('agendar.options.forum.button')
  }
])

function handleClick(id: OpcionId) {
  router.push(routeById[id])
}
</script>

<template>
 <main class="contenido">
    <header class="page-head">
      <h1 class="visually-hidden">{{ $t('content.pageSrTitle') }}</h1>

      <h2>Agendar</h2>

       </header>

     <section class="lista">
  <article v-for="item in opciones" :key="item.id" class="card">
    <div class="card-img">
      <img :src="item.img" :alt="item.titulo" loading="lazy" />
    </div>

    <div class="card-body">
      <h3 class="title">{{ item.titulo }}</h3>
      <p class="desc">{{ item.descripcion }}</p>

      <div class="actions">
        <button class="action-btn action-btn--primary" type="button" @click="handleClick(item.id)">
          {{ item.boton }}
        </button>
      </div>
    </div>
  </article>
</section>
 </main>
 
</template>

<style scoped>
.contenido {
  background: #fff;
  padding: 20px 18px 40px;
  max-width: 1400px;
  margin: 0 auto;
  font-family: 'Inter', sans-serif;
}

/* Header  */
.page-head {
  display: grid;
  gap: 15px;
  margin-bottom: 12px;
}
h2 {
  margin: 0;
  padding: 10px;
}

.visually-hidden {
  position: absolute !important;
  height: 1px;
  width: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
}

/* ====== LISTA ====== */
.lista {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
  width: 95%;
  margin: 0 auto;
  padding: 0;
}

@media (max-width: 900px) {
  .lista {
    grid-template-columns: 1fr;
  }
}

/* ====== CARD====== */
.card {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 18px;
  margin: 0;
  min-height: 200px;
  padding: 18px 18px;
  border-radius: 20px;
  border: 1px solid #e2edf7;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
  transition: transform 0.12s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.card:hover {
  transform: translateY(-1px);
  border-color: #b6ebe5;
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.1);
}

/* ====== IMAGEN ====== */
.card-img {
  flex: 0 0 130px;
  width: 130px;
  height: 130px;
  border-radius: 18px;
  overflow: hidden; 
}

.card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ====== BODY ====== */
.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 10px;
}

.title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #111827;
}

.desc {
  margin: 2px 0 0;
  font-size: 1.05rem;
  color: #374151;
}

/* ====== BOTONES====== */
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.action-btn {
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 1.1rem;
  border: none;
  background: var(--nura-green);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.15s ease, opacity 0.15s ease;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.28);
  width: 40%;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(80, 189, 189, 0.24);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: default;
  transform: none;
  box-shadow: none;
}

.action-btn--primary {
  background: #50bdbd;
}

/* ====== MOBILE ====== */
@media (max-width: 700px) {
  .card {
    flex-direction: column;
    align-items: flex-start;
  }

  .card-img {
    flex: none;
    width: 100%;
    height: 170px; 
  }

  .card-img img {
    width: 100%;
    height: 100%;
    object-fit: cover; 
    display: block;
  }
}

@media (max-width: 520px) {
  .action-btn {
    width: 100%;
  }
}
</style>
