<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()

function goNext() {
  router.push('/onboarding2')
}
</script>

<template>
  <h1 class="visually-hidden">Onboarding</h1>

  <main class="onboarding">
    <section class="ob">
      <h2>¡Bienvenida/o a Nura!</h2>

      <p class="intro">
        Soy <strong>Nuri</strong>, tu compañero de bienestar.  
        Estoy acá para ayudarte a hacer una pausa, escuchar cómo estás
        y acompañarte un día a la vez, sin presión y a tu ritmo.
      </p>

      <!-- Imagen -->
      <img src="/icons/NuriBienvenida.png" alt="Nuri dando la bienvenida" class="nuri" />

      <p class="text">
        En Nura vas a poder registrar tus emociones, acceder a recursos confiables
        y crear hábitos que te hagan sentir mejor.
      </p>

      <button class="btn" @click="goNext">Comenzar</button>
    </section>
  </main>
</template>



<style scoped>
.onboarding {
  min-height: 100dvh;
  background: url('/bgs/onboarding.png') center/cover no-repeat;
  display: flex;
  justify-content: center;
  padding: 28px 20px;
  animation: fadeIn 0.6s ease-in forwards;
}

@media (max-width: 480px) {

  .onboarding {
    padding: 1px 18px 44px;  
    align-items: flex-start;  
    min-height: 100dvh;
  }  }

.ob {
  max-width: 520px;
  padding: 36px 30px;
  text-align: center;
  backdrop-filter: blur(3px);
}

h2 {
  color: #50bdbd;
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 14px;
}

.intro {
  font-size: 1rem;
  line-height: 1.55;
  margin-bottom: 24px;
  color: #2b3a41;
}

.text {
  margin: 14px 0 26px;
  font-size: 1rem;
  color: #2b3a41;
  line-height: 1.5;
}

.nuri {
  width: 260px;
  height: auto;
  margin: 0 auto 34px;
  display: block;
  animation: float 2.4s ease-in-out infinite;
}

.btn {
  width:  74%;
  border: none;
  border-radius: 999px;
  padding: 0.75rem 1rem;
  background: #50bdbd;
  color: #ffffff;
  font-weight: 600;
  font-size: 0.98rem;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(80, 189, 189, 0.35);
  transition: background 0.15s ease, transform 0.08s ease,
    box-shadow 0.15s ease;
}

.btn:hover{
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(80, 189, 189, 0.4);
}



/* Animación entrada */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Efecto flotando */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
</style>
