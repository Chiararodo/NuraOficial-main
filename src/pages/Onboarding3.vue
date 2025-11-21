<template>
  <main class="onboarding-page">
    <section class="card">
      <img src="/logos/OFICIALwhite.png" alt="Nura" class="brand" />
      <h2>Elegí por donde comenzar</h2>
      <p>Descubrí el área en la que querés enfocarte primero.</p>

      <div class="options">
        <label class="option">
          <input type="checkbox" v-model="seleccion" value="ansiedad" />
          <span>Ansiedad</span>
        </label>
        <label class="option">
          <input type="checkbox" v-model="seleccion" value="comida" />
          <span>Relación con la comida</span>
        </label>
        <label class="option">
          <input type="checkbox" v-model="seleccion" value="habitos" />
          <span>Hábitos saludables</span>
        </label>
      </div>

      <button class="btn" @click="finalizarOnboarding" :disabled="saving">
        {{ saving ? 'Guardando…' : 'Continuar' }}
      </button>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { supabase } from '@/composables/useSupabase'

const seleccion = ref<string[]>([])
const saving = ref(false)

async function finalizarOnboarding() {
  try {
    saving.value = true

    const { data: sess } = await supabase.auth.getSession()
    const uid = sess.session?.user?.id
    if (!uid) {
      alert('Tu sesión expiró. Iniciá sesión nuevamente.')
      return
    }

    // Marcar metadata
    const { error: updErr } = await supabase.auth.updateUser({
      data: { onboarding_done: true, onboarding_topics: seleccion.value }
    })
    if (updErr) throw updErr

    // (Opcional) persistir también en profiles si la usás
    await supabase.from('profiles').upsert(
      { id: uid, onboarding_done: true },
      { onConflict: 'id' }
    )

    await supabase.auth.refreshSession()
    window.location.replace('/app/home')
  } catch (error) {
    console.error(error)
    alert('Ocurrió un error, intentá nuevamente.')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.onboarding-page {
  min-height: 100dvh;
  background: url('/bgs/splash.png') center/cover no-repeat;
  display: flex; justify-content: center; align-items: center; padding: 32px 16px;
}
.card { width: 100%; max-width: 420px; background: #fff; border-radius: 60px;
  padding: 28px 24px 40px; box-shadow: 0 12px 36px rgba(0,0,0,.2); text-align: center; }
.brand { width: 100px; height: auto; margin: 0 auto 12px; }
h2 { color: #50bdbd; font-weight: 700; font-size: 1.4rem; margin-bottom: 8px; }
p { font-size: .95rem; color: #333; margin-bottom: 18px; }
.options { display: flex; flex-direction: column; gap: 12px; margin: 12px 0 24px; }
.option { background: #85b6e0; color: #fff; border-radius: 16px; padding: 10px 14px;
  display: flex; align-items: center; justify-content: space-between; font-weight: 500; }
.option input { accent-color: #fff; width: 18px; height: 18px; }
.btn { background: #85b6e0; color: #fff; font-weight: 600; border: 0; border-radius: 16px;
  padding: .8rem 1.2rem; width: 70%; margin: 0 auto; display: block; box-shadow: 0 6px 18px rgba(0,0,0,.2);
  transition: .25s ease; }
.btn:hover { background: #50bdbd; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
</style>
