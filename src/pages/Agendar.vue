<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

type OpcionId = 'sesiones' | 'turno' | 'eventos' | 'foro'

const opciones = [
  {
    id: 'sesiones' as OpcionId,
    titulo: 'Sesiones Grupales',
    descripcion:
      'Espacios virtuales guiados por profesionales, donde podés compartir experiencias y trabajar temas como ansiedad, relación con la comida y autocuidado.',
    img: '/covers/sesiongrupal.png',
    boton: 'Ver sesiones',
  },
  {
    id: 'turno' as OpcionId,
    titulo: 'Turno con profesional',
    descripcion:
      'Reservá consultas individuales con profesionales del equipo de Nura, eligiendo día, horario y modalidad. Por ahora, los turnos se gestionan desde la cartilla.',
    img: '/covers/turnos.jpg',
    boton: 'Ir a la cartilla',
  },
  {
    id: 'eventos' as OpcionId,
    titulo: 'Eventos Grupales',
    descripcion:
      'Charlas y talleres especiales sobre bienestar emocional y salud integral, con especialistas invitados. Encuentros puntuales para aprender, compartir y conectar.',
    img: '/covers/eventosgrupales.jpg',
    boton: 'Ver eventos',
  },
  {
    id: 'foro' as OpcionId,
    titulo: 'Ir al Foro',
    descripcion:
      'Un espacio para hacer preguntas, compartir experiencias y acompañarte con la comunidad. Ideal para sentirte contenida y no estar sola.',
    img: '/covers/foro.jpg',
    boton: 'Entrar al foro',
  },
]

function handleClick(id: OpcionId) {
  if (id === 'sesiones') router.push('/app/agendar/sesiones')
  else if (id === 'eventos') router.push('/app/agendar/eventos')
  else if (id === 'turno') router.push('/app/cartilla')
  else if (id === 'foro') router.push('/app/foro')
}
</script>

<template>
  <h1 class="visually-hidden">Agendar</h1>

  <main class="page">
    <section class="wrap">
      <header class="head">
        <p class="kicker">Agenda</p>
        <h2 class="title">Agendar</h2>
        <p class="sub">
          Elegí qué querés hacer hoy: sesiones, eventos, turnos o comunidad.
        </p>
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

  .card-img {
    flex: none;
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
