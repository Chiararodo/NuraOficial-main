<template>
  <main class="success-page">
    <div class="card success-card">

      <button class="back-btn" @click="goBack">←</button>

      <img :src="nuriPath" alt="Nuri" class="nuri" />

      <h2 class="title">¡Estado registrado!</h2>
      <p class="subtitle">Hoy te sentiste: <strong>{{ moodLabel }}</strong></p>

      <button class="btn" @click="goHome">Volver al inicio</button>

    </div>
  </main>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const mood = route.query.mood as string
const date = route.query.date as string

const moodLabelMap: any = {
  triste: "Triste",
  normal: "Normal",
  bien: "Bien",
  muybien: "Muy bien"
}

const moodLabel = moodLabelMap[mood] ?? "—"

const moodImgMap: any = {
  triste: "/icons/nuri-triste.png",
  normal: "/icons/nuri-normal.png",
  bien: "/icons/nuri-bien.png",
  muybien: "/icons/nuri-muybien.png",
}

const nuriPath = moodImgMap[mood] ?? "/icons/NuriBienvenida.png"

function goBack() {
  router.back()
}
function goHome() {
  router.push('/app/home')
}
</script>

<style scoped>
.success-page {
  padding: 24px;
  display: grid;
  place-items: center;
  background: #fff;
}
.success-card {
  background: white;
  width: 100%;
  max-width: 420px;
  padding: 24px;
  border-radius: 22px;
  text-align: center;
  position: relative;
  box-shadow: 0 10px 26px rgba(0,0,0,.08);
}
.back-btn {
  position: absolute;
  top: 14px;
  left: 14px;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: none;
  background: #50bdbd;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
}
.nuri {
  width: 160px;
  margin: 10px auto;
}
.title {
  font-size: 1.6rem;
}
.subtitle {
  opacity: .8;
  margin-top: 6px;
}
.btn {
  margin-top: 22px;
  width: 100%;
  background: #50bdbd;
  color: white;
  padding: 12px;
  border-radius: 14px;
  font-weight: 700;
}
</style>
