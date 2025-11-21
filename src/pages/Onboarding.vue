<template>
  <main class="onboarding">
    <section class="ob">
      <h2>¡Bienvenida/o a Nura!</h2>

      <p class="intro">
        Soy Nuri y estoy acá para acompañarte un día a la vez, a tu ritmo.
      </p>

      <!-- Imagen -->
      <img src="/icons/NuriBienvenida.png" alt="Nuri" class="nuri" />

      <p class="text">
        Registrá cómo te sentís y accedé a recursos confiables.
      </p>

      <button class="btn" @click="goNext">Continuar</button>
    </section>
  </main>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
function goNext() {
  router.push('/onboarding2')
}
</script>

<style scoped>
.onboarding {
  min-height: 100dvh;
  background: url('/bgs/onboarding.png') center/cover no-repeat;
  display: flex;
  justify-content: center;
  padding: 24px;
  animation: fadeIn 0.6s ease-in forwards;
}

.ob {
  max-width: 500px;
  padding: 32px 28px;
  text-align: center;
}

h2 {
  color: #50bdbd;
  font-size: 1.6rem;
  margin-bottom: 12px;
}

.intro {
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 22px;
  color: #333;
}

.text {
  margin: 12px 0 20px;
  font-size: 0.95rem;
  color: #333;
}

.nuri {
  width: 240px;
  height: auto;
  margin: 0 auto 40px;
  display: block;
}

.btn {
  background: #85b6e0;
  color: #fff;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  font-size: 1rem;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.25s ease;
}
.btn:hover {
  background: #50bdbd;
  transform: translateY(-2px);
}

/* Animación entrada */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
