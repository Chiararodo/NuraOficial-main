<template>
  <section class="splash">
    <img src="/logos/OFICIALwhite.png" alt="Nura logo" class="logo" />
    <div class="loader"></div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/composables/useSupabase'

const router = useRouter()

onMounted(async () => {
  try {
    // 1️⃣ Obtener sesión actual
    const { data } = await supabase.auth.getSession()
    const session = data.session
    const user = session?.user

    // 2️⃣ Esperar breve animación
    await new Promise(resolve => setTimeout(resolve, 1500))

    // 3️⃣ Redirigir según estado
    if (!user) {
      router.replace('/login')
      return
    }

    // 4️⃣ Si está logueado, ver si ya completó onboarding
    const done =
      (user.user_metadata as any)?.onboarding_done === true ||
      false

    router.replace(done ? '/app/home' : '/onboarding')
  } catch (error) {
    console.error('Error en Splash:', error)
    router.replace('/login')
  }
})
</script>

<style scoped>
.splash {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: url('/bgs/splash.png') center center / cover no-repeat;
  animation: fadeIn 0.5s ease-in forwards;
}

.logo {
  width: 110px;
  height: auto;
  margin-bottom: 1.5rem;
  filter: drop-shadow(0 2px 4px #0002);
  animation: float 2.2s ease-in-out infinite;
}

.loader {
  width: 120px;
  height: 8px;
  background: #ffffff55;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}
.loader::after {
  content: "";
  display: block;
  height: 100%;
  width: 40%;
  background: var(--nura-green, #50bdbd);
  animation: slide 1.2s infinite ease-in-out;
}

/* Animaciones */
@keyframes slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
</style>
