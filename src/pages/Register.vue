<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { supabase } from '@/composables/useSupabase'
import Footer from '@/components/Footer.vue'

const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const day = ref<number | null>(null)
const month = ref<number | null>(null)
const year = ref<number | null>(null)
const loading = ref(false)
const currentYear = new Date().getFullYear()

const formError = ref('')
const formInfo = ref('')

function clearMessages() {
  formError.value = ''
  formInfo.value = ''
}

const dob = computed(() => {
  if (!day.value || !month.value || !year.value) return null
  const d = String(day.value).padStart(2, '0')
  const m = String(month.value).padStart(2, '0')
  return `${year.value}-${m}-${d}`
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

function isValidDateParts(dayNum: number, monthNum: number, yearNum: number) {
  const test = new Date(yearNum, monthNum - 1, dayNum)

  return (
    test.getFullYear() === yearNum &&
    test.getMonth() === monthNum - 1 &&
    test.getDate() === dayNum
  )
}

function mapSupabaseError(err: any): string {
  const raw = (err?.message || '').toLowerCase()

  if (raw.includes('user already registered')) {
    return 'Ya existe una cuenta con ese correo. Probá iniciar sesión o usar otro email.'
  }

  if (raw.includes('invalid email')) {
    return 'Ingresá un correo válido.'
  }

  if (raw.includes('password')) {
    return 'La contraseña es demasiado débil. Usá al menos 6 caracteres.'
  }

  return 'No pudimos crear tu cuenta en este momento. Probá nuevamente en unos minutos.'
}

onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  if (data?.session?.user) {
    router.replace('/app/home')
  }
})

async function submit() {
  clearMessages()

  const cleanName = name.value.trim()
  const cleanEmail = email.value.trim()

  if (!cleanName) {
    formError.value = 'Ingresá tu nombre.'
    return
  }

  if (!cleanEmail) {
    formError.value = 'Ingresá tu correo.'
    return
  }

  if (!dob.value || !day.value || !month.value || !year.value) {
    formError.value = 'Completá tu fecha de nacimiento.'
    return
  }

  if (!isValidDateParts(day.value, month.value, year.value)) {
    formError.value = 'La fecha de nacimiento no es válida. Revisá día, mes y año.'
    return
  }

  const age = calcAge(dob.value)

  if (Number.isNaN(age)) {
    formError.value = 'La fecha de nacimiento no es válida. Revisá día, mes y año.'
    return
  }

  if (age < 15) {
    formError.value = 'Por ahora Nura está disponible a partir de los 15 años.'
    return
  }

  if (password.value.trim().length < 6) {
    formError.value = 'La contraseña debe tener al menos 6 caracteres.'
    return
  }

  loading.value = true

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password.value,
      options: {
        data: {
          name: cleanName,
          dob: dob.value
        },
        emailRedirectTo: window.location.origin + '/login'
      }
    })

    if (error) throw error

    if (data.user) {
      try {
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: data.user.id,
            full_name: cleanName,
            name: cleanName
          },
          { onConflict: 'id' }
        )

        if (profileError) {
          console.error('Error guardando perfil en profiles:', profileError)
          formInfo.value =
            'Tu cuenta se creó, pero faltó guardar parte de tu perfil. Podés completarlo después desde Perfil.'
        }
      } catch (profileErr) {
        console.error('Error guardando perfil en profiles:', profileErr)
        formInfo.value =
          'Tu cuenta se creó, pero faltó guardar parte de tu perfil. Podés completarlo después desde Perfil.'
      }
    }

    if (data.session) {
      router.replace('/onboarding')
    } else {
      formInfo.value =
        'Te enviamos un correo para confirmar tu cuenta. Iniciá sesión cuando lo hayas confirmado.'

      setTimeout(() => {
        router.replace('/login')
      }, 1800)
    }
  } catch (e: any) {
    console.error('Error en registro:', e)
    formError.value = mapSupabaseError(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-layout">
    <h1 class="visually-hidden">Crear cuenta en Nura</h1>

    <main class="register-page">
      <img
        src="/logos/OFICIALwhite.png"
        alt="Nura"
        class="brand"
        @error="(e: any) => (e.target.src = '/icons/icon-192.png')"
      />

      <section class="card" aria-labelledby="register-title">
        <h2 id="register-title" class="card-title">Crear cuenta</h2>

        <p class="hint">Ingresá tus datos para registrarte</p>

        <p v-if="formError" class="message message-error" role="alert">
          {{ formError }}
        </p>

        <p v-if="formInfo" class="message message-info" role="status">
          {{ formInfo }}
        </p>

        <form class="form" @submit.prevent="submit" novalidate>
          <div class="field-wrap">
            <label for="register-name">Nombre</label>
            <input
              id="register-name"
              class="field"
              v-model="name"
              type="text"
              placeholder="Tu nombre"
              required
              autocomplete="name"
              @input="clearMessages"
            />
          </div>

          <div class="field-wrap">
            <label for="register-email">Correo</label>
            <input
              id="register-email"
              class="field"
              v-model="email"
              type="email"
              placeholder="Tu correo"
              required
              autocomplete="email"
              @input="clearMessages"
            />
          </div>

          <div class="field-wrap">
            <label for="register-password">Contraseña</label>
            <input
              id="register-password"
              class="field"
              v-model="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              required
              autocomplete="new-password"
              minlength="6"
              @input="clearMessages"
            />
          </div>

          <div class="dob-block">
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
                @input="clearMessages"
              />
              <input
                class="chip"
                v-model.number="month"
                type="number"
                placeholder="Mes"
                min="1"
                max="12"
                required
                @input="clearMessages"
              />
              <input
                class="chip"
                v-model.number="year"
                type="number"
                placeholder="Año"
                min="1900"
                :max="currentYear"
                required
                @input="clearMessages"
              />
            </div>
          </div>

          <button class="cta" type="submit" :disabled="loading">
            {{ loading ? 'Creando…' : 'Crear cuenta' }}
          </button>
        </form>

        <RouterLink to="/login" class="link-btn">
          ¿Ya tenés cuenta? Iniciá sesión
        </RouterLink>
      </section>
    </main>
  </div>
</template>

<style scoped>
.register-layout {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: url('/bgs/splash.png') center / cover no-repeat;
}

.register-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

.brand {
  width: 150px;
  height: auto;
  margin-bottom: 18px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.12));
}

.card {
  width: 100%;
  max-width: 540px;
  background: rgba(255, 255, 255, 0.97);
  border-radius: 42px;
  padding: 28px 24px 32px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
}

.card-title {
  margin: 0 0 8px;
  text-align: center;
  font-size: 1.35rem;
  color: #183153;
}

.hint {
  color: #3d5875;
  font-size: 0.96rem;
  margin: 0 0 14px;
  text-align: center;
}

.hint.small {
  margin: 0 0 8px;
  font-size: 0.9rem;
  color: #3d5875;
}

.message {
  width: 100%;
  max-width: 360px;
  margin: 0 auto 12px;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 0.93rem;
  line-height: 1.35;
  box-sizing: border-box;
}

.message-error {
  background: #fff1f2;
  color: #b42318;
  border: 1px solid #fecdd3;
}

.message-info {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.form {
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
}

.field-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.field-wrap label {
  font-size: 0.93rem;
  font-weight: 600;
  color: #111827;
}

.field {
  width: 100%;
  min-height: 46px;
  padding: 0.7rem 0.9rem;
  border-radius: 12px;
  border: 1px solid #ccd7e2;
  outline: none;
  background: #f9fcff;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.field:focus,
.chip:focus {
  border-color: #50bdbd;
  box-shadow: 0 0 0 3px rgba(80, 189, 189, 0.22);
}

.dob-block {
  margin-bottom: 14px;
}

.dob {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.chip {
  width: 100%;
  min-height: 46px;
  text-align: center;
  padding: 0.55rem 0.4rem;
  border-radius: 10px;
  border: 1px solid #ccd7e2;
  background: #f9fcff;
  font-size: 0.92rem;
  outline: none;
  box-sizing: border-box;
}

.cta {
  width: 100%;
  min-height: 48px;
  margin-top: 8px;
  padding: 0.78rem 1rem;
  border: 1px solid #50bdbd;
  border-radius: 999px;
  background: #50bdbd;
  color: #fff;
  font-weight: 700;
  font-size: 0.98rem;
  box-shadow: 0 8px 20px rgba(80, 189, 189, 0.35);
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.15s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.cta:hover:not(:disabled) {
  background: #3ea9a9;
  border-color: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(80, 189, 189, 0.4);
}

.cta:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.link-btn {
  display: block;
  width: fit-content;
  margin: 16px auto 0;
  color: #2f6ea4;
  text-decoration: underline;
  font-size: 0.93rem;
}

.visually-hidden {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

@media (max-width: 768px) {
  .register-page {
    padding: 20px 14px;
  }

  .brand {
    width: 128px;
    margin-bottom: 14px;
  }

  .card {
    border-radius: 28px;
    padding: 22px 16px 24px;
  }

  .card-title {
    font-size: 1.2rem;
  }
}
</style>