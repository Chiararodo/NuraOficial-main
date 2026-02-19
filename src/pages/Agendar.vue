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
    img: '/covers/turnos.jpg',
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
  <h1 class="visually-hidden">{{ t('agendar.a11y.pageTitle') }}</h1>

  <main class="page">
    <section class="wrap">
      <header class="head">
        <p class="kicker">{{ t('agendar.header.kicker') }}</p>
        <h2 class="title">{{ t('agendar.header.title') }}</h2>
        <p class="sub">{{ t('agendar.header.subtitle') }}</p>
      </header>

      <section class="grid">
        <article v-for="item in opciones" :key="item.id" class="card">
          <div class="card-row">
            <div class="card-img">
              <img :src="item.img" :alt="item.titulo" loading="lazy" />
            </div>

            <div class="card-body">
              <h3 class="card-title">{{ item.titulo }}</h3>
              <p class="card-desc">{{ item.descripcion }}</p>

              <button class="btn btn-primary" type="button" @click="handleClick(item.id)">
                {{ item.boton }}
              </button>
            </div>
          </div>
        </article>
      </section>
    </section>
  </main>
</template>

<style scoped>
/* Accesibilidad */
.visually-hidden {
  position: absolute !important;
  height: 1px;
  width: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
}

/* Page */
.page {
  background: #f5fbfd;
  min-height: calc(100dvh - 64px);
  padding: 28px 16px 44px;
}

.wrap {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

/* Head */
.head {
  display: grid;
  gap: 6px;
  padding: 2px 2px 6px;
}

.kicker {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 800;
}

.title {
  margin: 0;
  font-size: 1.7rem;
  font-weight: 850;
  color: #0f172a;
}

.sub {
  margin: 2px 0 0;
  color: #475569;
  font-size: 1rem;
  max-width: 80ch;
}

/* Grid */
.grid {
  display: grid;
  gap: 18px;
}

@media (min-width: 900px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Cards */
.card {
  background: #ffffff;
  border-radius: 18px;
  padding: 16px 16px;
  border: 1px solid #e2edf7;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
  transition: transform 0.12s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.card:hover {
  transform: translateY(-1px);
  border-color: #b6ebe5;
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.1);
}

.card-row {
  display: flex;
  align-items: stretch;
  gap: 14px;
}

/* Imagen */
.card-img {
  flex: 0 0 110px;
}

.card-img img {
  width: 110px;
  height: 120px;
  object-fit: cover;
  border-radius: 14px;
  display: block;
}

/* Texto */
.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.card-title {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 850;
  color: #0f172a;
}

.card-desc {
  margin: 0;
  font-size: 0.95rem;
  color: #475569;
  line-height: 1.4rem;
}

/* Button */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: none;
  padding: 10px 16px;
  font-size: 0.95rem;
  font-weight: 850;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.12s ease, box-shadow 0.18s ease;
  width: fit-content;
  margin-top: 6px;
}

.btn-primary {
  background: #50bdbd;
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(80, 189, 189, 0.28);
}

.btn-primary:hover {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(80, 189, 189, 0.35);
}

@media (max-width: 520px) {
  .card-row {
    flex-direction: column;
  }

  .card-img img {
    width: 100%;
    height: 160px;
  }

  .btn {
    width: 100%;
  }
}
</style>
