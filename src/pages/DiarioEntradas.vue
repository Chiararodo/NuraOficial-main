<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/composables/useSupabase'

const router = useRouter()
const auth = useAuthStore()

type Entry = {
  id: number | string
  on_date: string
  mood: string
  content: string | null
}

const entries = ref<Entry[]>([])
const loading = ref(true)

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatMoodLabel(mood: string) {
  if (mood === 'triste') return 'Triste'
  if (mood === 'normal') return 'Normal'
  if (mood === 'bien') return 'Bien'
  if (mood === 'muybien') return 'Muy bien'
  return mood
}

onMounted(async () => {
  if (!auth.user) {
    loading.value = false
    return
  }

  const { data, error } = await supabase
    .from('diary_entries')
    .select('id,on_date,mood,content')
    .eq('user_id', auth.user.id)
    .order('on_date', { ascending: false })

  if (!error && data) {
    entries.value = data as Entry[]
  }
  loading.value = false
})

function goBackToDiary() {
  router.push('/app/diario')
}
</script>

<template>
  <main class="entries-page">
    <div class="inner">
      <header class="top">
        <button class="back-btn" @click="goBackToDiary">←</button>
        <h1>Mis entradas de diario</h1>
      </header>

      <section v-if="loading" class="card empty">
        <p>Cargando tus registros…</p>
      </section>

      <section v-else-if="!entries.length" class="card empty">
        <h2>Todavía no tenés entradas</h2>
        <p>
          Podés comenzar a registrar cómo te sentís desde hoy.
        </p>
        <button class="btn" @click="goBackToDiary">
          Escribir mi primera entrada
        </button>
      </section>

      <section v-else class="list">
        <article v-for="e in entries" :key="e.id" class="card entry">
          <header class="entry-head">
            <span class="date">{{ formatDate(e.on_date) }}</span>
            <span class="mood-chip">{{ formatMoodLabel(e.mood) }}</span>
          </header>
          <p class="entry-text">
            {{ e.content || 'Sin texto registrado.' }}
          </p>
        </article>
      </section>
    </div>
  </main>
</template>

<style scoped>
.entries-page {
  background: #fff;
  padding: 18px 16px 32px;
}

.inner {
  max-width: 900px;
  margin: 0 auto;
}

.top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.top h1 {
  margin: 0;
  font-size: 1.4rem;
  color: #222;
}

.back-btn {
  border: none;
  background: #50bdbd;
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e5edf4;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
  padding: 16px 18px;
}

.empty {
  text-align: center;
}

.empty h2 {
  margin-top: 0;
}

.btn {
  margin-top: 10px;
  background: #85b6e0;
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 0.5rem 1.2rem;
  font-weight: 600;
  cursor: pointer;
}

/* Lista */
.list {
  display: grid;
  gap: 14px;
}

.entry-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.date {
  font-size: 0.9rem;
  color: #4b5563;
}

.mood-chip {
  font-size: 0.8rem;
  padding: 4px 10px;
  border-radius: 999px;
  background: #e6f0ff;
  color: #1f2937;
  font-weight: 600;
}

.entry-text {
  margin: 0;
  font-size: 0.95rem;
  color: #111827;
  line-height: 1.4rem;
  max-height: 7rem;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}
</style>
