<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

type Contact = {
  email?: string
  whatsapp?: string
}

type Profesional = {
  _id?: string
  id?: string | number
  name?: string
  specialty?: string
  type?: string
  modality?: string
  coverage?: string
  city?: string
  province?: string
  insurance?: string | string[]
  bio?: string
  contact?: Contact
  avatar?: string
}

const profesionales = ref<Profesional[]>([])
const loading = ref(true)
const errorMsg = ref('')

const search = ref('')
const filterSpecialty = ref('')
const filterCity = ref('')
const filterModality = ref('')
const filterInsurance = ref('')

// 🔹 estado del modal
const showModal = ref(false)
const modalName = ref<string | null>(null)

// usamos el proxy de Vite → /api → Render
const API_URL = '/api/especialistas'
const IMAGE_BASE_URL = 'https://nura-backend-vvuv.onrender.com'

// helpers
const getAvatarUrl = (p: Profesional): string => {
  const avatar = p.avatar || ''
  if (!avatar) return ''
  if (avatar.startsWith('http')) return avatar
  // ej: "/Fotos/especialistas/men/47.jpg"
  return IMAGE_BASE_URL + (avatar.startsWith('/') ? avatar : `/${avatar}`)
}

const getEmail = (p: Profesional): string => {
  return p.contact?.email || ''
}

// 🔹 abrir / cerrar modal
function openModal(p: Profesional) {
  modalName.value = p.name || null
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  modalName.value = null
}

async function loadProfesionales() {
  loading.value = true
  errorMsg.value = ''

  try {
    const res = await fetch(API_URL)
    if (!res.ok) {
      throw new Error('No se pudo cargar la cartilla (error ' + res.status + ').')
    }

    const data = await res.json()
    // tu API devuelve { ok, data: [...] }
    profesionales.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch (err: any) {
    console.error(err)
    errorMsg.value = err?.message || 'Ocurrió un error al cargar la cartilla.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProfesionales()
})

// normalizar strings / arrays a texto en minúscula
const normalize = (val: unknown): string => {
  if (Array.isArray(val)) {
    return val
      .map((v) => String(v ?? ''))
      .join(' ')
      .toLowerCase()
  }
  return String(val ?? '').toLowerCase()
}

const specialties = computed(() => {
  const set = new Set<string>()
  for (const p of profesionales.value) {
    const s = String(p.specialty || p.type || '').trim()
    if (s) set.add(s)
  }
  return Array.from(set).sort()
})

const cities = computed(() => {
  const set = new Set<string>()
  for (const p of profesionales.value) {
    const c = String(p.city || '').trim()
    if (c) set.add(c)
  }
  return Array.from(set).sort()
})

const modalities = computed(() => {
  const set = new Set<string>()
  for (const p of profesionales.value) {
    const m = String(p.modality || '').trim()
    if (m) set.add(m)
  }
  return Array.from(set).sort()
})

const insurances = computed(() => {
  const set = new Set<string>()

  for (const p of profesionales.value) {
    const raw = p.insurance as any

    if (Array.isArray(raw)) {
      for (const ins of raw) {
        const s = String(ins ?? '').trim()
        if (s) set.add(s)
      }
    } else {
      const s = String(raw ?? '').trim()
      if (s) set.add(s)
    }
  }

  return Array.from(set).sort()
})

const filteredProfesionales = computed(() => {
  const term = search.value.trim().toLowerCase()
  const filterSpecialtyLower = filterSpecialty.value.toLowerCase()
  const filterCityLower = filterCity.value.toLowerCase()
  const filterModalityLower = filterModality.value.toLowerCase()
  const filterInsuranceLower = filterInsurance.value.toLowerCase()

  return profesionales.value.filter((p) => {
    const name = normalize(p.name)
    const specialty = normalize(p.specialty || p.type)
    const city = normalize(p.city)
    const modality = normalize(p.modality)
    const bio = normalize(p.bio)
    const insuranceText = normalize(p.insurance)

    const matchesSearch =
      !term ||
      name.includes(term) ||
      specialty.includes(term) ||
      city.includes(term) ||
      bio.includes(term)

    const matchesSpecialty =
      !filterSpecialtyLower || specialty === filterSpecialtyLower

    const matchesCity =
      !filterCityLower || city === filterCityLower

    const matchesModality =
      !filterModalityLower || modality === filterModalityLower

    const matchesInsurance =
      !filterInsuranceLower ||
      insuranceText.includes(filterInsuranceLower)

    return (
      matchesSearch &&
      matchesSpecialty &&
      matchesCity &&
      matchesModality &&
      matchesInsurance
    )
  })
})

function resetFilters() {
  search.value = ''
  filterSpecialty.value = ''
  filterCity.value = ''
  filterModality.value = ''
  filterInsurance.value = ''
}
</script>

<template>
  <main class="cartilla">
    <header class="head">
      <div>
        <h2>Cartilla de especialistas</h2>
        <p>Buscá y filtrá profesionales según lo que necesitás.</p>
      </div>
    </header>

    <!-- FILTROS -->
    <section class="filters card">
      <div class="filters-row">
        <div class="field field--search">
          <label>Buscar</label>
          <div class="search-input">
            <input
              v-model="search"
              type="search"
              placeholder="Nombre, especialidad o ciudad"
            />
            <button
              v-if="search"
              type="button"
              class="pill pill--ghost"
              @click="search = ''"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div class="field">
          <label>Especialidad</label>
          <select v-model="filterSpecialty">
            <option value="">Todas</option>
            <option v-for="s in specialties" :key="s" :value="s">
              {{ s }}
            </option>
          </select>
        </div>

        <div class="field">
          <label>Ciudad</label>
          <select v-model="filterCity">
            <option value="">Todas</option>
            <option v-for="c in cities" :key="c" :value="c">
              {{ c }}
            </option>
          </select>
        </div>

        <div class="field">
          <label>Modalidad</label>
          <select v-model="filterModality">
            <option value="">Todas</option>
            <option v-for="m in modalities" :key="m" :value="m">
              {{ m }}
            </option>
          </select>
        </div>

        <div class="field">
          <label>Obra social / prepaga</label>
          <select v-model="filterInsurance">
            <option value="">Todas</option>
            <option v-for="i in insurances" :key="i" :value="i">
              {{ i }}
            </option>
          </select>
        </div>
      </div>

      <div class="filters-footer">
        <span v-if="!loading" class="count">
          {{ filteredProfesionales.length }} de {{ profesionales.length }} profesionales
        </span>
        <button type="button" class="pill" @click="resetFilters">
          Limpiar filtros
        </button>
      </div>
    </section>

    <!-- ESTADOS -->
    <p v-if="loading" class="state">Cargando cartilla…</p>
    <p v-else-if="errorMsg" class="state state--error">
      {{ errorMsg }}
    </p>
    <p
      v-else-if="!filteredProfesionales.length"
      class="state"
    >
      No encontramos profesionales con esos filtros. Probá cambiarlos o limpiarlos.
    </p>

    <!-- LISTA -->
    <section v-else class="list">
      <article
        v-for="p in filteredProfesionales"
        :key="p._id || p.id"
        class="card prof-card"
      >
        <div v-if="getAvatarUrl(p)" class="prof-avatar">
          <img :src="getAvatarUrl(p)" :alt="p.name" loading="lazy" />
        </div>

        <div class="prof-main">
          <h3 class="prof-name">{{ p.name }}</h3>
          <p class="prof-specialty">
            {{ p.specialty || p.type }}
          </p>
          <p class="prof-location" v-if="p.city || p.province">
            {{ p.city }}
            <span v-if="p.city && p.province"> · </span>
            {{ p.province }}
          </p>

          <div class="tags">
            <span v-if="p.modality" class="tag tag--primary">
              {{ p.modality }}
            </span>
            <span
              v-if="p.insurance && Array.isArray(p.insurance) && p.insurance.length"
              class="tag"
            >
              {{ p.insurance.join(' · ') }}
            </span>
            <span v-else-if="p.insurance" class="tag">
              {{ p.insurance }}
            </span>
          </div>

          <p v-if="p.bio" class="prof-bio">
            {{ p.bio }}
          </p>
        </div>

        <div class="prof-actions">
          <button
            type="button"
            class="pill pill--primary"
            @click="openModal(p)"
          >
            Agendar turno
          </button>

          <a
            v-if="getEmail(p)"
            class="content-btn"
            :href="`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(getEmail(p))}`"
            target="_blank"
            :title="`Enviar email a ${p.name}`"
          >
            <i class="fa-solid fa-envelope"></i>
          </a>
        </div>
      </article>
    </section>

    <!-- MODAL -->
    <div
      v-if="showModal"
      class="modal-backdrop"
      @click.self="closeModal"
    >
      <div class="modal">
        <h3>Por el momento no se puede agendar</h3>
        <p>
          Estamos trabajando para habilitar esta función. Por favor,
          volvé a intentarlo más tarde.
        </p>
        <p v-if="modalName" class="modal-name">
          Especialista seleccionado:
          <strong>{{ modalName }}</strong>
        </p>

        <div class="modal-actions">
          <button type="button" class="pill pill--ghost" @click="closeModal">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.cartilla {
  background: #fff;
  padding: 24px 18px 48px;
  max-width: 1200px;
  margin: 0 auto;
}

/* ---------- HEADER ---------- */
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 16px;
}

.head h2 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--nura-green);
}

.head p {
  margin: 4px 0 0;
  font-size: 0.9rem;
  color: #4b5563;
}

/* ---------- BOTÓN MAIL (tipo contenido educativo) ---------- */
.content-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 999px;
  background: #81c8d9;
  color: #fff;
  border: none;
  box-shadow: 0 6px 16px rgba(80, 189, 189, 0.3);
  transition: 0.15s ease;
}

.content-btn:hover {
  background: #56bfcf;
  transform: translateY(-1px);
}

.content-btn i {
  margin: 0;
  font-size: 1.1rem;
}

/* ---------- CARD GENÉRICA ---------- */
.card {
  background: #ffffff;
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
  border: 1px solid #e5e7eb;
}

/* ---------- FILTROS ---------- */
.filters {
  margin-bottom: 22px;
}

.filters-row {
  display: grid;
  gap: 12px;
}

@media (min-width: 900px) {
  .filters-row {
    grid-template-columns: 1.1fr repeat(4, minmax(0, 1fr));
    align-items: flex-end;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
}

.field input,
.field select {
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  padding: 8px 12px;
  font-size: 0.85rem;
  outline: none;
  background: #f9fafb;
}

.field input:focus,
.field select:focus {
  border-color: var(--nura-green);
  background: #ffffff;
}

.field--search .search-input {
  display: flex;
  gap: 8px;
  align-items: center;
  border-radius: 999px;
  background: #f9fafb;
  padding: 4px 4px 4px 10px;
  border: 1px solid #e5e7eb;
}

.field--search input {
  border: none;
  background: transparent;
  padding-left: 0;
}

.filters-footer {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: #6b7280;
}

.count {
  white-space: nowrap;
}

/* ---------- PILLS / BOTONES ---------- */
.pill {
  border-radius: 999px;
  padding: 7px 16px;
  font-size: 0.8rem;
  border: none;
  background: var(--nura-green);
  color: #ffffff;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.35);
}

.pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(80, 189, 189, 0.4);
}

.pill--ghost {
  background: #ffffff;
  color: #4b5563;
  border: 1px solid #e5e7eb;
  box-shadow: none;
}

.pill--ghost:hover {
  border-color: var(--nura-green);
  color: var(--nura-green);
}

/* Botón AGENDAR más grande */
.pill--primary {
  padding: 10px 22px;
  font-size: 0.9rem;
}

/* ---------- ESTADOS ---------- */
.state {
  font-size: 0.9rem;
  color: #6b7280;
  padding: 18px 2px;
}

.state--error {
  color: #b91c1c;
}

/* ---------- GRID DE ESPECIALISTAS ---------- */
.list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  align-items: stretch;
}

/* Tablet: 2 columnas */
@media (min-width: 768px) {
  .list {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop: 3 columnas */
@media (min-width: 1100px) {
  .list {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* ---------- CARD INTERNA ---------- */
.prof-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  min-height: 160px;
}

.prof-avatar img {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.prof-main {
  flex: 1;
}

.prof-name {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #111827;
}

.prof-specialty {
  margin: 4px 0;
  font-size: 0.9rem;
  color: #4b5563;
}

.prof-location {
  font-size: 0.8rem;
  color: #6b7280;
  margin-bottom: 4px;
}

/* TAGS */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.tag {
  font-size: 0.72rem;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #4b5563;
}

.tag--primary {
  background: rgba(80, 189, 189, 0.18);
  color: var(--nura-green);
}

/* BIO */
.prof-bio {
  font-size: 0.8rem;
  color: #4b5563;
  margin-top: 6px;
}

/* ---------- ACCIONES ---------- */
.prof-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* ---------- MODAL ---------- */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal {
  background: #ffffff;
  border-radius: 20px;
  padding: 20px 22px 18px;
  max-width: 420px;
  width: calc(100% - 32px);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.35);
  text-align: left;
}

.modal h3 {
  margin: 0 0 8px;
  font-size: 1.1rem;
  font-weight: 600;
  color: #111827;
}

.modal p {
  margin: 4px 0;
  font-size: 0.9rem;
  color: #4b5563;
}

.modal-name {
  margin-top: 8px;
}

.modal-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
