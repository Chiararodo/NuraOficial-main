<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'vue-router'
import { useNotificationSettings } from '@/composables/useNotificationSettings'

const auth = useAuthStore()
const router = useRouter()

const prefs = useNotificationSettings()

const meds = ref<any[]>([])
const loading = ref(true)

const name = ref('')
const dose = ref('')
const schedule = ref('')

const wantsReminder = ref(true)
const reminderTimes = ref<string[]>(['08:00'])

const allDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const reminderDays = ref<string[]>([])
const allDaysActive = ref(false)

const editingId = ref<number | null>(null)

const confirmMedToDelete = ref<any | null>(null)

const showSaved = ref(false)
const showDeleted = ref(false)
const validationError = ref('')

function joinPrettyCsv(csv: string) {
  return String(csv || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ')
}

function prettyDaysFromCsv(csv: string | null) {
  if (!csv) return 'Todos los días'
  return joinPrettyCsv(csv)
}

function prettyTimesFromCsv(csv: string | null) {
  if (!csv) return ''
  return joinPrettyCsv(csv)
}

async function loadMeds() {
  if (!auth.user) return

  loading.value = true
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })

  if (error) console.error('Error cargando medicaciones:', error)

  meds.value = data || []
  loading.value = false
}

function addTime() {
  reminderTimes.value.push('08:00')
}

function removeTime(index: number) {
  reminderTimes.value.splice(index, 1)
  if (!reminderTimes.value.length) reminderTimes.value.push('08:00')
}

function toggleDay(day: string) {
  if (reminderDays.value.includes(day)) {
    reminderDays.value = reminderDays.value.filter((d) => d !== day)
    allDaysActive.value = false
  } else {
    reminderDays.value.push(day)
    allDaysActive.value = reminderDays.value.length === allDays.length
  }
}

function toggleAllDays() {
  if (allDaysActive.value) {
    allDaysActive.value = false
    reminderDays.value = []
  } else {
    allDaysActive.value = true
    reminderDays.value = [...allDays]
  }
}

function canSendMedicationNotifs() {
  if (typeof prefs.categoryEnabled === 'function') {
    return prefs.categoryEnabled('bienestar')
  }
  return true
}

async function createNotificationIfAllowed(opts: { title: string; body?: string; type?: string }) {
  if (!auth.user) return
  if (!canSendMedicationNotifs()) return

  const { error } = await supabase.from('notifications').insert({
    user_id: auth.user.id,
    title: opts.title,
    body: opts.body ?? null,
    type: opts.type ?? 'medication'
  })

  if (error) console.error('Error creando notificación de medicación:', error)
}

async function saveMed() {
  validationError.value = ''
  if (!auth.user) return

  if (!name.value.trim() || !dose.value.trim()) {
    validationError.value = 'Completá nombre y dosis.'
    return
  }

  let timesStr: string | null = null
  let daysStr: string | null = null

  if (wantsReminder.value) {
    const cleanTimes = reminderTimes.value
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    if (!cleanTimes.length) {
      validationError.value = 'Elegí al menos un horario para el recordatorio.'
      return
    }

    if (!reminderDays.value.length && !allDaysActive.value) {
      validationError.value = 'Elegí al menos un día para el recordatorio.'
      return
    }

    timesStr = cleanTimes.join(',')
    daysStr = allDaysActive.value ? null : reminderDays.value.join(',')
  }

  const cleanName = name.value.trim()
  const cleanDose = dose.value.trim()
  const cleanSchedule = schedule.value.trim()

  const row: any = {
    user_id: auth.user.id,
    name: cleanName,
    dose: cleanDose,
    schedule: cleanSchedule,
    reminder: wantsReminder.value,
    reminder_times: timesStr,
    reminder_days: daysStr
  }

  const isEditing = editingId.value !== null

  if (isEditing) {
    const { error } = await supabase
      .from('medications')
      .update(row)
      .eq('id', editingId.value as number)
      .eq('user_id', auth.user.id)

    if (error) {
      console.error('Error actualizando medicación:', error)
      validationError.value = 'No se pudo actualizar.'
      return
    }
  } else {
    const { error } = await supabase.from('medications').insert([row])

    if (error) {
      console.error('Error guardando medicación:', error)
      validationError.value = 'No se pudo guardar.'
      return
    }
  }

  if (wantsReminder.value && timesStr) {
    const daysPretty = allDaysActive.value || !daysStr ? 'Todos los días' : joinPrettyCsv(daysStr)
    const timesPretty = joinPrettyCsv(timesStr)

    await createNotificationIfAllowed({
      title: isEditing ? 'Recordatorio de medicación actualizado' : 'Nuevo recordatorio de medicación',
      body: `${isEditing ? 'Actualizaste' : 'Vamos a recordarte'} tomar ${cleanDose} de ${cleanName} a las ${timesPretty} (${daysPretty}).`,
      type: 'medication'
    })
  }

  name.value = ''
  dose.value = ''
  schedule.value = ''
  wantsReminder.value = true
  reminderTimes.value = ['08:00']
  reminderDays.value = []
  allDaysActive.value = false
  editingId.value = null

  showSaved.value = true
  setTimeout(() => (showSaved.value = false), 1500)

  await loadMeds()
}

async function removeMed(id: number) {
  if (!auth.user) return

  const { error } = await supabase
    .from('medications')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.user.id)

  if (error) {
    console.error('Error borrando medicación:', error)
    return
  }

  showDeleted.value = true
  setTimeout(() => (showDeleted.value = false), 1500)

  if (editingId.value === id) {
    name.value = ''
    dose.value = ''
    schedule.value = ''
    wantsReminder.value = true
    reminderTimes.value = ['08:00']
    reminderDays.value = []
    allDaysActive.value = false
    editingId.value = null
  }

  await loadMeds()
}

function askDelete(m: any) {
  confirmMedToDelete.value = m
}

async function confirmDelete() {
  if (!confirmMedToDelete.value) return
  await removeMed(confirmMedToDelete.value.id)
  confirmMedToDelete.value = null
}

function cancelDelete() {
  confirmMedToDelete.value = null
}

function startEdit(m: any) {
  editingId.value = m.id
  name.value = m.name || ''
  dose.value = m.dose || ''
  schedule.value = m.schedule || ''

  wantsReminder.value = !!m.reminder

  if (m.reminder_times) {
    reminderTimes.value = String(m.reminder_times)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
  } else {
    reminderTimes.value = ['08:00']
  }

  if (m.reminder_days) {
    reminderDays.value = String(m.reminder_days)
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)
    allDaysActive.value = reminderDays.value.length === allDays.length
  } else {
    reminderDays.value = []
    allDaysActive.value = true
  }
}

function goBack() {
  router.back()
}

onMounted(async () => {
  prefs.loadFromLocal?.()
  await prefs.loadFromSupabase?.()
  await loadMeds()
})
</script>

<template>
  <h1 class="visually-hidden">Medicamentos</h1>

  <main class="meds-page">
    <header class="page-head">
      <button class="back-link" type="button" @click="goBack">
        <span class="arrow">←</span>
      </button>
      <h1 class="page-title">Mis medicaciones</h1>
    </header>

    <section class="card">
      <p class="intro">
        Acá podés agregar y editar tus medicaciones para tener un registro más claro de tu tratamiento.
      </p>

      <div class="form-card">
        <h2>{{ editingId !== null ? 'Editar medicación' : 'Agregar medicación' }}</h2>

        <div class="field">
          <label class="label" for="med-name">Nombre</label>
          <input
          id="med-name"
          v-model="name"
          type="text"
          class="input"
          placeholder="Ej: Sertralina, Ibuprofeno, Omega 3"
          autocomplete="off"
        />
        </div>

        <div class="field">
          <label class="label" for="med-dose">Dosis</label>
         <input
          id="med-dose"
          v-model="dose"
          type="text"
          class="input"
          placeholder="Ej: 50 mg, 1 cápsula, 10 gotas"
          autocomplete="off"
        />
        </div>

        <div class="field">
          <label class="label" for="med-schedule">Horario orientativo</label>
         <input
          id="med-schedule"
          v-model="schedule"
          type="text"
          class="input"
          placeholder="Ej: mañana y noche, después de almorzar"
          autocomplete="off"
        />
        </div>

        <div class="reminder-row">
          <label class="reminder-label">
            <input v-model="wantsReminder" type="checkbox" class="reminder-check" />
            Quiero que Nura me recuerde tomar esta medicación
          </label>

          <div v-if="wantsReminder" class="reminder-box">
            <p class="reminder-sub">Elegí los horarios</p>
            <p class="hint-text">Podés agregar más de un horario si la tomás varias veces al día.</p>

            <div class="times-row">
              <div v-for="(t, idx) in reminderTimes" :key="idx" class="time-item">
                <label class="visually-hidden" :for="`med-time-${idx}`">Horario {{ idx + 1 }}</label>
                <input
                  :id="`med-time-${idx}`"
                  v-model="reminderTimes[idx]"
                  type="time"
                  class="input time-input"
                  aria-label="Horario de recordatorio"
                />
                <button v-if="reminderTimes.length > 1" type="button" class="remove-time" @click="removeTime(idx)">
                  ×
                </button>
              </div>

              <button type="button" class="add-time" @click="addTime">+ agregar horario</button>
            </div>

            <p class="reminder-sub">¿Qué días?</p>
            <p class="hint-text">Elegí “Todos” o seleccioná días específicos.</p>

            <div class="days-row">
              <button
                type="button"
                class="day-pill todos"
                :class="{ active: allDaysActive }"
                @click="toggleAllDays"
                :aria-pressed="allDaysActive"
              >
                Todos
              </button>

              <button
                v-for="d in allDays"
                :key="d"
                type="button"
                class="day-pill"
                :class="{ active: reminderDays.includes(d) }"
                @click="toggleDay(d)"
                :aria-pressed="reminderDays.includes(d)"
              >
                {{ d.slice(0, 3) }}
              </button>
            </div>
          </div>
        </div>

        <p v-if="validationError" class="validation-error">{{ validationError }}</p>

        <button class="btn-primary" type="button" @click="saveMed">
          {{ editingId !== null ? 'Guardar cambios' : 'Guardar' }}
        </button>
      </div>

      <div class="list">
        <p v-if="loading">Cargando…</p>
        <p v-else-if="meds.length === 0">Todavía no agregaste medicaciones.</p>

        <ul v-else class="meds-ul">
          <li v-for="m in meds" :key="m.id" class="med-item">
            <div class="info">
              <strong>{{ m.name }}</strong>
              <span>{{ m.dose }} <span v-if="m.schedule">— {{ m.schedule }}</span></span>

              <span v-if="m.reminder" class="reminder-chip">
                Recordatorio: {{ prettyTimesFromCsv(m.reminder_times || null) }}
                — {{ prettyDaysFromCsv(m.reminder_days ?? null) }}
              </span>
            </div>

            <div class="appt-actions">
              <button class="link-btn" type="button" @click="startEdit(m)">Editar</button>
              <button class="link-btn danger" type="button" @click="askDelete(m)">Cancelar</button>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <div v-if="confirmMedToDelete" class="modal-backdrop" @click.self="cancelDelete">
      <div class="modal-card">
        <h3 class="modal-title">¿Borrar medicación?</h3>
        <p class="modal-text">
          Vas a borrar <strong>{{ confirmMedToDelete?.name }}</strong>. Podés volver a cargarla cuando quieras.
        </p>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="cancelDelete">Cancelar</button>
          <button type="button" class="btn-danger" @click="confirmDelete">Borrar</button>
        </div>
      </div>
    </div>

    <div v-if="showSaved" class="toast success">Acción realizada correctamente</div>
    <div v-if="showDeleted" class="toast danger">Medicación eliminada</div>
  </main>
</template>

<style scoped>
.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
.meds-page{background:#f4f9fb;padding:24px 18px 48px;}
.page-head{max-width:900px;margin:0 auto 14px;display:flex;align-items:center;gap:10px;}
.page-title{margin:0;font-size:1.5rem;font-weight:700;color:#111827;}
.back-link{border:none;background:transparent;display:inline-flex;align-items:center;gap:6px;cursor:pointer;padding:0;}
.arrow{font-size:1.5rem;color:#46bdbd;}
.card{max-width:900px;margin:0 auto;background:#fff;border-radius:20px;padding:18px 20px 20px;box-shadow:0 12px 30px rgba(15,23,42,.08);border:1px solid #e5e7eb;}
.intro{margin:0 0 14px;font-size:.95rem;color:#4b5563;}
.form-card{padding:14px 0 10px;border-bottom:1px solid #e5e7eb;margin-bottom:14px;}
.form-card h2{margin:0 0 10px;font-size:1.05rem;font-weight:600;color:#111827;}
.field{display:flex;flex-direction:column;gap:4px;margin-bottom:10px;}
.label{font-weight:600;font-size:.9rem;color:#333;}
.hint-text{margin:0;color:#6b7280;font-size:.82rem;line-height:1.25;}
.input{display:block;width:90%;margin-bottom:2px;border-radius:12px;border:1px solid #dfe7ea;padding:9px 11px;font-size:.95rem;background:#f9fafb;}
.input:focus{outline:none;border-color:#50bdbd;background:#fff;}
.input::placeholder {
  color: #9ca3af;
  font-size: 0.9rem;}
.reminder-row{margin-top:6px;margin-bottom:8px;}
.reminder-label{display:flex;align-items:center;gap:6px;font-size:.9rem;color:#374151;margin-bottom:6px;}
.reminder-check{width:16px;height:16px;}
.reminder-box{background:#f0fbfb;border-radius:14px;padding:10px 12px;border:1px solid #cbecee;}
.reminder-sub{margin:0 0 4px;font-size:.85rem;font-weight:600;color:#0f766e;}
.times-row{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0;}
.time-item{display:flex;align-items:center;gap:4px;}
.time-input{width:115px;margin-bottom:0;}
.remove-time{border:none;background:#fee2e2;color:#b91c1c;border-radius:999px;padding:2px 7px;cursor:pointer;font-size:.8rem;}
.add-time{border:none;background:#e0f7f7;color:#047777;border-radius:999px;padding:6px 12px;cursor:pointer;font-size:.8rem;}
.days-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}
.day-pill{border-radius:999px;border:1px solid #c4e4e4;padding:4px 9px;background:#fff;font-size:.8rem;cursor:pointer;color:#036666;transition:all .15s ease;}
.day-pill.active{background:#50bdbd;color:#fff;border-color:#50bdbd;}
.day-pill:hover{background:#3ea9a9;transform:translateY(-1px);box-shadow:0 9px 22px rgba(80,189,189,.4);}
.day-pill.todos{background:#eefafa;border-color:#50bdbd;color:#50bdbd;font-weight:600;}
.validation-error{color:#b00020;font-size:.85rem;margin:6px 0 8px;}
.btn-primary{background:#50bdbd;color:#fff;padding:9px 18px;border-radius:999px;border:none;cursor:pointer;font-size:.95rem;font-weight:600;box-shadow:0 6px 16px rgba(80,189,189,.35);transition:background .15s,transform .08s,box-shadow .15s;}
.btn-primary:hover{background:#3ea9a9;transform:translateY(-1px);box-shadow:0 9px 22px rgba(80,189,189,.4);}
.list{margin-top:6px;}
.meds-ul{list-style:none;padding:0;margin:10px 0 0;display:grid;gap:10px;}
.med-item{display:flex;justify-content:space-between;align-items:center;background:#eef7ff;padding:10px 12px;border-radius:14px;border:1px solid #d6e6f4;}
.info span{display:block;font-size:.85rem;color:#4b5563;}
.reminder-chip{font-size:.82rem;color:#0f766e;}
.appt-actions{display:flex;gap:8px;}
.link-btn{border:2px solid #50bdbd;border-radius:999px;padding:6px 12px;background:transparent;color:#50bdbd;font-weight:650;cursor:pointer;}
.link-btn:hover{background:#85b5e046;border-color:#85b6e0;transform:translateY(-2px);}
.link-btn.danger{color:#ef4444;border-color:#ef4444;background:transparent;}
.link-btn.danger:hover{background:#ff1c1c20;border-color:#c20808;transform:translateY(-2px);}
.modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px;z-index:40;}
.modal-card{background:#fff;border-radius:18px;padding:18px 18px 16px;max-width:380px;width:100%;box-shadow:0 18px 40px rgba(0,0,0,.25);}
.modal-title{margin:0 0 8px;font-size:1.1rem;font-weight:700;color:#111827;}
.modal-text{margin:0 0 14px;font-size:.92rem;color:#4b5563;}
.modal-actions{display:flex;justify-content:flex-end;gap:10px;}
.btn-secondary{border:none;border-radius:999px;padding:7px 14px;background:#50bdbd;color:#fff;font-size:.85rem;font-weight:600;cursor:pointer;}
.btn-secondary:hover{background:#3ea9a9;transform:translateY(-1px);box-shadow:0 6px 16px rgba(80,189,189,.35);}
.btn-danger{border:none;border-radius:999px;padding:7px 14px;background:#ef4444;color:#fff;font-size:.85rem;font-weight:600;cursor:pointer;}
.btn-danger:hover{background:#dc2626;transform:translateY(-1px);}
.toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);padding:12px 20px;border-radius:999px;color:#fff;font-size:.9rem;box-shadow:0 10px 22px rgba(0,0,0,.25);}
.success{background:#46bdbd;}
.danger{background:#b00020;}
</style>