<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goBack() {
  router.back()
}

function goCheckout() {
  router.push({
    name: 'premium-checkout'
  })
}
</script>

<template>
  <h1 class="visually-hidden">
    Planes de Nura
  </h1>

  <main class="premium-page">
    <section class="container">

      <!-- HEADER -->

      <header class="page-head">
        <button
          class="back-link"
          type="button"
          aria-label="Volver"
          @click="goBack"
        >
          <i
            class="fa-solid fa-arrow-left arrow"
            aria-hidden="true"
          ></i>
        </button>

        <div class="head-left">
          <p class="kicker">
            Planes
          </p>

          <h2 class="page-title">
            Elegí tu plan
          </h2>

          <p class="page-sub">
            Podés empezar con el Plan Gratuito y pasar a Premium cuando quieras.
          </p>
        </div>
      </header>

      <!-- PLANES -->

      <section
        class="plans-grid"
        aria-label="Planes disponibles"
      >

        <!-- PLAN GRATUITO -->

        <article class="plan-card">

          <div class="plan-head">
            <div>
              <h2 class="plan-title">
                Plan Gratuito
              </h2>

              <p class="plan-desc">
                Ideal para empezar a usar Nura y conocer las funciones principales.
              </p>
            </div>

            <p class="plan-price">
              $0
              <span>/mes</span>
            </p>
          </div>

          <ul class="benefits">
            <li>
              <strong>Foro:</strong>
              Podés comentar, pero no crear publicaciones.
            </li>

            <li>
              <strong>Diario:</strong>
              Hasta 10 entradas por mes.
            </li>

            <li>
              <strong>Chatbot:</strong>
              Hasta 10 mensajes por día.
            </li>

            <li>
              <strong>Contenido:</strong>
              Acceso a materiales generales.
            </li>
          </ul>

        </article>

        <!-- PLAN PREMIUM -->

        <article class="plan-card plan-card--premium">

          <div class="plan-head">
            <div>
              <h2 class="plan-title">
                Plan Premium
              </h2>

              <p class="plan-desc">
                Acceso completo e ilimitado a herramientas y experiencias en vivo.
              </p>
            </div>

            <p class="plan-price">
              $10.000
              <span>/mes</span>
            </p>
          </div>

          <ul class="benefits">
            <li>
              <strong>Foro:</strong>
              Crear + comentar sin límites.
            </li>

            <li>
              <strong>Diario:</strong>
              Entradas ilimitadas.
            </li>

            <li>
              <strong>Chatbot:</strong>
              Usos ilimitados.
            </li>

            <li>
              Videollamadas grupales semanales.
            </li>

            <li>
              Talleres exclusivos en vivo.
            </li>

            <li>
              Merch exclusivo.
            </li>
          </ul>

          <div class="plan-actions">
            <button
              class="btn btn-primary"
              type="button"
              @click="goCheckout"
            >
              Elegir Premium
            </button>
          </div>
        </article>

      </section>
    </section>
  </main>
</template>

<style scoped>
.premium-page {
  padding: 20px 18px 48px;
  background: #ffffff;
  min-height: calc(100dvh - 64px);
}

.container {
  max-width: 1180px;
  width: 100%;
  margin: 0 auto;
  display: grid;
  gap: 18px;
}

/* =============================
   HEADER
============================= */

.page-head {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}

.head-left {
  flex: 1;
}

.back-link {
  width: 42px;
  height: 42px;
  flex-shrink: 0;

  border: none;
  border-radius: 999px;

  background: #e8fbf8;
  color: #50bdbd;

  display: flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;

  transition:
    background-color 0.2s,
    transform 0.18s,
    box-shadow 0.2s;
}

.back-link:hover {
  background: #d8f6f1;
  transform: translateY(-1px);

  box-shadow:
    0 8px 16px
    rgba(80, 189, 189, 0.14);
}

.arrow {
  font-size: 1.35rem;
  line-height: 1;
}

.kicker {
  margin: 0 0 6px;

  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  color: #64748b;

  font-weight: 800;
}

.page-title {
  margin: 0;

  font-size: 1.7rem;
  font-weight: 850;
  color: #50bdbd;
}

.page-sub {
  margin: 8px 0 0;

  color: #475569;

  font-size: 1rem;

  max-width: 78ch;
}

/* =============================
   GRID DE PLANES
============================= */

.plans-grid {
  display: grid;
  gap: 16px;
}

@media (min-width: 980px) {
  .plans-grid {
    grid-template-columns: 1fr 1fr;
  }
}

/* =============================
   TARJETAS
============================= */

.plan-card {
  border-radius: 18px;

  padding:
    20px
    20px
    18px;
  border:
    1px solid #e2edf7;
  background: #ffffff;
  box-shadow:
    0 12px 28px
    rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 200px;

  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;
}

.plan-card--premium {
  background:
    linear-gradient(
      135deg,
      #e3f6fb,
      #f0f9ff
    );
}

@media (hover: hover) {
  .plan-card:hover {
    transform:
      translateY(-4px);

    box-shadow:
      0 20px 40px
      rgba(15, 23, 42, 0.12);
  }

  .plan-card--premium:hover {
    border-color: #50bdbd;
  }
}

/* =============================
   CABECERA DE CADA PLAN
============================= */

.plan-head {
  display: flex;

  justify-content:
    space-between;

  align-items:
    flex-start;

  gap: 14px;
}

.plan-head > div {
  flex: 1;
}

.plan-title {
  margin: 0;

  font-weight: 900;

  font-size: 1.15rem;

  color: #0f172a;
}

.plan-desc {
  margin:
    6px
    0
    0;

  color: #334155;

  font-size: 0.97rem;

  line-height: 1.45;
}

.plan-price {
  margin: 0;

  flex-shrink: 0;

  font-weight: 950;

  color: #0f172a;

  font-size: 1.08rem;

  text-align: right;
}

.plan-price span {
  display: block;

  margin-top: 3px;

  font-weight: 650;

  color: #64748b;

  font-size: 0.92rem;
}

/* =============================
   BENEFICIOS
============================= */

.benefits {
  margin:
    8px
    0
    0;

  padding-left: 20px;

  color: #334155;

  font-size: 0.97rem;

  line-height: 1.45;
}

.benefits li {
  margin-bottom: 10px;
}

.benefits li::marker {
  content: '✓ ';

  color: #50bdbd;

  font-weight: 900;
}

/* =============================
   BOTONES
============================= */

.plan-actions {
  display: flex;

  gap: 10px;

  flex-wrap: wrap;

  align-items: center;

  margin-top: auto;

  padding-top: 8px;
}

.btn {
  display: inline-flex;

  align-items: center;
  justify-content: center;

  min-height: 36px;

  padding:
    8px
    15px;

  border-radius: 999px;

  border: none;

  font-size: 0.84rem;

  font-weight: 800;

  line-height: 1;

  cursor: pointer;

  text-decoration: none;

  box-sizing: border-box;

  transition:
    background-color 0.22s ease,
    transform 0.22s ease,
    box-shadow 0.22s ease;
}

.btn-primary {
  background: #50bdbd;

  color: #ffffff;

  box-shadow:
    0 8px 18px
    rgba(80, 189, 189, 0.22);
}

@media (hover: hover) {
  .btn-primary:hover {
    background: #0f766e;

    transform:
      translateY(-2px);

    box-shadow:
      0 12px 24px
      rgba(80, 189, 189, 0.32);
  }
}

.btn:active {
  transform:
    scale(0.98);
}

/* =============================
   BADGE PLAN GRATIS
============================= */

.current-plan-pill {
  display: inline-flex;

  align-items: center;
  justify-content: center;

  min-height: 36px;

  padding:
    8px
    15px;

  border-radius: 999px;

  border:
    1.5px solid #cbd5e1;

  background: #f8fafc;

  color: #64748b;

  font-size: 0.84rem;

  font-weight: 800;
}

/* =============================
   ACCESIBILIDAD
============================= */

.back-link:focus-visible,
.btn:focus-visible {
  outline:
    3px solid
    rgba(80, 189, 189, 0.35);

  outline-offset: 2px;
}

.visually-hidden {
  position: absolute !important;

  width: 1px;
  height: 1px;

  padding: 0;
  margin: -1px;

  overflow: hidden;

  clip:
    rect(0, 0, 0, 0);

  clip-path:
    inset(50%);

  white-space: nowrap;

  border: 0;
}

/* =============================
   RESPONSIVE
============================= */

@media (max-width: 720px) {
  .premium-page {
    padding:
      16px
      12px
      96px;
  }

  .page-head {
    display: grid;

    grid-template-columns:
      42px 1fr;

    gap: 14px;
  }

  .page-title {
    font-size: 1.4rem;
  }

  .page-sub {
    font-size: 0.9rem;

    line-height: 1.4;
  }

  .plan-card {
    min-height: auto;

    padding:
      16px
      14px;
  }

  .plan-title {
    font-size: 1.05rem;
  }

  .plan-desc,
  .benefits {
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .plan-head {
    gap: 10px;
  }

  .plan-price {
    font-size: 0.98rem;
  }

  .plan-price span {
    font-size: 0.8rem;
  }

  .btn,
  .current-plan-pill {
    min-height: 34px;

    padding:
      7px
      13px;

    font-size: 0.78rem;
  }
}

@media (max-width: 360px) {
  .plan-head {
    flex-direction: column;
  }

  .plan-price {
    text-align: left;
  }

  .plan-price span {
    display: inline;

    margin-left: 4px;
  }
}
</style>