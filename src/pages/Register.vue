<template>
  <section class="register-page">
    <!-- Logo -->
    <img
      src="/logos/OFICIALwhite.png"
      alt="Nura"
      class="brand"
      onerror="this.src='/icons/icon-192.png'"
    />

    <!-- Formulario -->
    <form class="form" @submit.prevent="submit">
      <p class="hint">Ingresá tus datos:</p>

      <input
        class="field"
        v-model="name"
        type="text"
        placeholder="Nombre"
        required
        autocomplete="name"
      />

      <input
        class="field"
        v-model="email"
        type="email"
        placeholder="Correo"
        required
        autocomplete="email"
      />

      <input
        class="field"
        v-model="password"
        type="password"
        placeholder="Contraseña (mínimo 6 caracteres)"
        required
        autocomplete="new-password"
        minlength="6"
      />

      <p class="hint small">¿Cuál es tu fecha de nacimiento?</p>

      <div class="dob">
        <input
          class="chip"
          v-model.number="day"
          type="number"
          placeholder="Día"
          min="1"
          max="31"
          required
        />
        <input
          class="chip"
          v-model.number="month"
          type="number"
          placeholder="Mes"
          min="1"
          max="12"
          required
        />
        <input
          class="chip"
          v-model.number="year"
          type="number"
          placeholder="Año"
          min="1900"
          :max="currentYear"
          required
        />
      </div>

      <button class="cta" type="submit" :disabled="loading">
        {{ loading ? 'Creando…' : 'Crear Cuenta' }}
      </button>
    </form>
  </section>

  <RouterLink to="/login" class="link-btn" role="button">
    ¿Ya tenés cuenta? Iniciá sesión
  </RouterLink>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { supabase } from '@/composables/useSupabase'

const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const day = ref<number | null>(null)
const month = ref<number | null>(null)
const year = ref<number | null>(null)
const loading = ref(false)
const currentYear = new Date().getFullYear()

const dob = computed(() => {
  if (!day.value || !month.value || !year.value) return null
  const d = String(day.value).padStart(2, '0')
  const m = String(month.value).padStart(2, '0')
  return `${year.value}-${m}-${d}` // YYYY-MM-DD
})

function calcAge(dateStr: string): number {
  const birth = new Date(dateStr)
  if (Number.isNaN(birth.getTime())) return NaN

  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function mapSupabaseError(err: any): string {
  const raw = (err?.message || '').toLowerCase()

  if (raw.includes('user already registered') || raw.includes('email')) {
    return 'Ya existe una cuenta con ese correo. Probá iniciar sesión o usar otro email.'
  }
  if (raw.includes('password')) {
    return 'La contraseña es demasiado débil. Usá al menos 6 caracteres.'
  }
  return 'No pudimos crear tu cuenta en este momento. Probá nuevamente en unos minutos.'
}

async function submit() {
  if (!name.value.trim()) {
    alert('Ingresá tu nombre.')
    return
  }

  if (!dob.value) {
    alert('Completá tu fecha de nacimiento.')
    return
  }

  const age = calcAge(dob.value)
  if (Number.isNaN(age)) {
    alert('La fecha de nacimiento no es válida. Revisá día, mes y año.')
    return
  }
  if (age < 15) {
    alert('Por ahora Nura está disponible a partir de los 15 años.')
    return
  }

  if (password.value.length < 6) {
    alert('La contraseña debe tener al menos 6 caracteres.')
    return
  }

  loading.value = true

  try {
    // 1) Crear el usuario en Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: email.value.trim(),
      password: password.value,
      options: {
        data: {
          name: name.value.trim(),
          dob: dob.value
        },
        emailRedirectTo: window.location.origin + '/login'
      }
    })

    if (error) {
      throw error
    }

    // 2) Guardar/actualizar perfil en tabla profiles (solo columnas que existen)
    if (data.user) {
      try {
        await supabase.from('profiles').upsert(
          {
            id: data.user.id,
            full_name: name.value.trim()
          },
          { onConflict: 'id' }
        )
      } catch (profileErr) {
        console.error('Error guardando perfil en profiles:', profileErr)
        // No cortamos el flujo, solo avisamos genérico
        alert(
          'Tu cuenta se creó, pero no pudimos guardar tu perfil completo. Podés actualizarlo después en la sección Perfil.'
        )
      }
    }

    // 3) Redirecciones según haya sesión o confirmación por email
    if (data.session) {
      router.replace('/onboarding')
    } else {
      alert(
        'Te enviamos un correo para confirmar tu cuenta. Iniciá sesión cuando lo hayas confirmado.'
      )
      router.replace('/login')
    }
  } catch (e: any) {
    console.error('Error en registro:', e)
    alert(mapSupabaseError(e))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Fondo del Splash */
.register-page {
  min-height: 100dvh;
  background: url('/bgs/splash.png') center/cover no-repeat;
  display: grid;
  justify-items: center;
  align-content: start;
  padding: 48px 16px 32px;
}

/* Logo */
.brand {
  width: 150px;
  height: auto;
  margin-bottom: 18px;
  filter: drop-shadow(0 2px 4px #0002);
}

/* Formulario “flotando” sobre el fondo */
.form {
  width: 100%;
  max-width: 360px;
  display: grid;
  justify-items: center;
}

/* Textos guía */
.hint {
  color: #ffffffcc;
  font-size: 0.96rem;
  margin: 6px 0 8px;
  text-align: center;
}
.hint.small {
  margin-top: 12px;
  font-size: 0.9rem;
}

/* Campos principales */
.field {
  width: 88%;
  padding: 0.7rem 0.9rem;
  margin: 0.35rem 0;
  border-radius: 12px;
  border: none;
  outline: none;
  background: #ffffffeb;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  font-size: 0.95rem;
}
.field:focus {
  box-shadow: 0 0 0 3px rgba(133, 182, 224, 0.35);
}

/* Fecha de nacimiento (chips) */
.dob {
  width: 88%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 8px 0 12px;
}
.chip {
  text-align: center;
  padding: 0.55rem 0.4rem;
  border-radius: 10px;
  border: none;
  background: #ffffffeb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-size: 0.92rem;
}

/* CTA */
.cta {
  width: 70%;
  margin-top: 8px;
  padding: 0.7rem 1rem;
  border: none;
  border-radius: 16px;
  background: var(--nura-blue, #85b6e0);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.22);
  cursor: pointer;
  transition: 0.2s ease;
}
.cta:hover {
  background: var(--nura-green, #50bdbd);
}

/* Link a login */
.link-btn {
  margin-top: 10px;
  background: transparent;
  border: none;
  color: #ffffffdd;
  text-decoration: underline;
  cursor: pointer;
  font-size: 0.92rem;
}
</style>
