<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/composables/useSupabase'

const router = useRouter()

const checked = ref(false)
const loading = ref(false)
const errorMsg = ref('')

async function acceptTerms() {
  errorMsg.value = ''
  if (!checked.value) return

  loading.value = true

  try {
    // 1) Obtener usuario logueado
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError

    const user = authData.user
    if (!user) throw new Error('No se encontró un usuario activo.')

    // 2) Actualizar metadata en Supabase Auth
    const { error: updAuthError } = await supabase.auth.updateUser({
      data: {
        ...(user.user_metadata || {}),
        terms_accepted: true
      }
    })
    if (updAuthError) throw updAuthError

    // 3) Actualizar la fila de profiles
    const { error: updProfileError } = await supabase
      .from('profiles')
      .update({ terms_accepted: true })
      .eq('id', user.id)

    if (updProfileError) throw updProfileError

    // 4) Ir al Home (nombre de ruta) → y forzar reload como backup
   await router.replace({ name: 'home' })
setTimeout(() => {
  if (router.currentRoute.value.name !== 'home') {
    window.location.replace('/app/home')
  }
}, 150)
  } catch (e: any) {
    console.error('Error al aceptar términos:', e)
    errorMsg.value =
      e?.message ||
      'No pudimos guardar tu aceptación de términos. Probá nuevamente en unos minutos.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="terminos-page">
    <section class="card">
      <h1>Términos y Condiciones</h1>

      <div class="text">
        <p>
          Te damos la bienvenida a Nura. Antes de usar la app, es importante que leas
          y aceptes estos términos y la política de privacidad. Nura no reemplaza
          la atención médica ni psicológica profesional.
        </p>
        <p>
          Al continuar, confirmás que sos mayor de 15 años y que aceptás que tus
          datos se usarán según se describe en nuestra política de privacidad,
          solo para mejorar tu experiencia dentro de Nura.
        </p>
        <p>
          Si no estás de acuerdo con alguno de los puntos, por favor no continúes
          con el uso de la aplicación.
        </p>
      </div>

      <label class="check-row">
        <input type="checkbox" v-model="checked" />
        <span>Leí y acepto los Términos y la Política de privacidad.</span>
      </label>

      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

      <button
        class="primary-btn"
        :disabled="!checked || loading"
        @click="acceptTerms"
      >
        {{ loading ? 'Guardando…' : 'Aceptar y continuar' }}
      </button>
    </section>
  </main>
</template>

<style scoped>
.terminos-page {
   min-height: 100dvh;
  background: url('/bgs/splash.png') center/cover no-repeat;
  display: flex;
  justify-content: center;
  align-items: start;
  padding: 48px 16px 32px;
}

.card {
  width: 100%;
  max-width: 540px;
  background: #ffffff;
  border-radius: 60px;
  padding: 18px 20px 34px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.2);
}

h1 {
  color: #50bdbd;
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 14px;
 text-align: center;
}

.text {
  max-height: 50vh;
  overflow-y: auto;
  padding:4px 16px 12px;
  margin-bottom: 16px;
  font-size: 0.95rem;
  color: #374151;
  line-height: 1.5;
}

.check-row {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  font-size: 0.9rem;
  color: #111827;
  margin-bottom: 10px;
  padding:4px 16px 12px;
}

.check-row input[type='checkbox'] {
  margin-top: 2px;
}

.error {
  font-size: 0.85rem;
  color: #b91c1c;
  margin-bottom: 8px;
}

.primary-btn {
  background: #50bdbd;
  color: #fff;
  font-weight: 700;
  border: 0;
  border-radius: 999px;
  padding: 0.8rem 1.4rem;
  width: 74%;
  margin: 0 auto;
  display: block;
  box-shadow: 0 10px 24px rgba(80, 189, 189, 0.4);
  transition: 0.22s ease;
  font-size: 0.98rem;
}

.primary-btn:hover:not(:disabled) {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(80, 189, 189, 0.4);
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

/* =========================
   Premium Mobile Layout (Términos)
   ========================= */
@media (max-width: 480px) {
  .terminos-page {
    padding: 46px 18px 44px;  /* menos padding arriba */
    align-items: flex-start;  /* en vez de center */
    min-height: 100dvh;
  }

  .card {
    margin-top: 8px;          /* la sube un toque más */
  }


  h1 {
    font-size: 1.35rem;
    margin-bottom: 12px;
  }

  .text {
    /* menos alto para que no “coma” toda la card */
    max-height: 34vh;
    padding: 6px 10px 10px;
    margin-bottom: 14px;
    font-size: 0.88rem;
    line-height: 1.4;
    border-radius: 14px;
    background: #f6fbfc; /* suave, como el resto */
  }

  .check-row {
    padding: 0 6px 8px;
    gap: 8px;
    font-size: 0.85rem;
    line-height: 1.2rem;
    margin-bottom: 12px;
  }

  .error {
    font-size: 0.82rem;
    margin-bottom: 10px;
  }

  .primary-btn {
    width: 100%;
    padding: 0.65rem 1rem;
    font-size: 0.92rem;
    box-shadow: 0 8px 18px rgba(80, 189, 189, 0.35);
  }
}

/* Extra compacto para pantallas muy chicas */
@media (max-width: 360px) {
  .terminos-page {
    padding: 52px 14px 52px;
  }

  .card {
    max-width: 300px;
    padding: 20px 16px 20px;
    border-radius: 22px;
  }

  h1 {
    font-size: 1.28rem;
  }

  .text {
    max-height: 32vh;
    font-size: 0.86rem;
  }
}
</style>
