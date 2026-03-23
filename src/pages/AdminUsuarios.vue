<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'vue-router'

type AdminUser = {
  id: string
  name: string | null
  email: string | null
  blocked: boolean | null
  is_admin: boolean | null
  created_at: string | null
}

const auth = useAuthStore()
const router = useRouter()

const users = ref<AdminUser[]>([])
const loading = ref(true)

const search = ref('')
const currentTab = ref<'todos' | 'bloqueados'>('todos')
const selectedIds = ref<string[]>([])

const showDeleteModal = ref(false)
const deleting = ref(false)
const selectedUser = ref<AdminUser | null>(null)

const showBlockModal = ref(false)
const blockActionLoading = ref(false)
const selectedBlockUser = ref<AdminUser | null>(null)
const nextBlockedValue = ref(false)

const showBulkBlockModal = ref(false)
const bulkBlockLoading = ref(false)
const bulkNextBlockedValue = ref(false)

const showBulkDeleteModal = ref(false)
const bulkDeleteLoading = ref(false)

const toastVisible = ref(false)
const toastText = ref('')
const toastType = ref<'success' | 'error'>('success')
let toastTimer: number | null = null

function showToast(message: string, type: 'success' | 'error' = 'success') {
  toastText.value = message
  toastType.value = type
  toastVisible.value = true

  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastVisible.value = false
  }, 2400)
}

function goToProfile(userId: string) {
  router.push(`/app/perfil-publico/${userId}`)
}

async function checkAdmin() {
  const uid = auth.user?.id
  if (!uid) {
    router.replace('/login')
    return false
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', uid)
    .single()

  if (error || !data?.is_admin) {
    router.replace('/app/home')
    return false
  }

  return true
}

async function loadUsers() {
  loading.value = true

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, blocked, is_admin, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    users.value = []
    showToast('No se pudieron cargar los usuarios.', 'error')
  } else {
    users.value = (data || []) as AdminUser[]
  }

  syncSelection()
  loading.value = false
}

const visibleUsers = computed(() => {
  if (currentTab.value === 'bloqueados') {
    return users.value.filter((u) => u.blocked === true)
  }
  return users.value
})

const filteredUsers = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return visibleUsers.value

  return visibleUsers.value.filter((u) => {
    const name = (u.name || '').toLowerCase()
    const email = (u.email || '').toLowerCase()
    return name.includes(term) || email.includes(term)
  })
})

function syncSelection() {
  const validIds = new Set(filteredUsers.value.map((u) => u.id))
  selectedIds.value = selectedIds.value.filter((id) => validIds.has(id))
}

const selectedCount = computed(() => selectedIds.value.length)

const allSelectableIds = computed(() =>
  filteredUsers.value.filter((u) => !u.is_admin).map((u) => u.id)
)

const allSelected = computed(() => {
  if (!allSelectableIds.value.length) return false
  return allSelectableIds.value.every((id) => selectedIds.value.includes(id))
})

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value = []
    return
  }
  selectedIds.value = [...allSelectableIds.value]
}

function toggleSelectUser(id: string) {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((x) => x !== id)
  } else {
    selectedIds.value = [...selectedIds.value, id]
  }
}

function clearSelection() {
  selectedIds.value = []
}

function setTab(tab: 'todos' | 'bloqueados') {
  currentTab.value = tab
  clearSelection()
}

function askToggleBlocked(user: AdminUser) {
  selectedBlockUser.value = user
  nextBlockedValue.value = !user.blocked
  showBlockModal.value = true
}

function closeBlockModal() {
  if (!blockActionLoading.value) {
    showBlockModal.value = false
    selectedBlockUser.value = null
  }
}

async function confirmToggleBlocked() {
  if (!selectedBlockUser.value) return

  blockActionLoading.value = true

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ blocked: nextBlockedValue.value })
      .eq('id', selectedBlockUser.value.id)

    if (error) {
      console.error(error)
      showToast('No se pudo actualizar el usuario.', 'error')
      return
    }

    showBlockModal.value = false
    selectedBlockUser.value = null
    showToast(
      nextBlockedValue.value
        ? 'La cuenta fue bloqueada correctamente.'
        : 'La cuenta volvió a estar activa.'
    )
    await loadUsers()
  } finally {
    blockActionLoading.value = false
  }
}

function askBulkBlocked(nextValue: boolean) {
  if (!selectedCount.value) return
  bulkNextBlockedValue.value = nextValue
  showBulkBlockModal.value = true
}

function closeBulkBlockModal() {
  if (!bulkBlockLoading.value) {
    showBulkBlockModal.value = false
  }
}

async function confirmBulkBlocked() {
  if (!selectedIds.value.length) return

  bulkBlockLoading.value = true

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ blocked: bulkNextBlockedValue.value })
      .in('id', selectedIds.value)

    if (error) {
      console.error(error)
      showToast('No se pudo actualizar la selección.', 'error')
      return
    }

    showBulkBlockModal.value = false
    clearSelection()
    showToast(
      bulkNextBlockedValue.value
        ? 'Usuarios bloqueados correctamente.'
        : 'Usuarios desbloqueados correctamente.'
    )
    await loadUsers()
  } finally {
    bulkBlockLoading.value = false
  }
}

function askDelete(user: AdminUser) {
  selectedUser.value = user
  showDeleteModal.value = true
}

function closeDeleteModal() {
  if (!deleting.value) {
    showDeleteModal.value = false
    selectedUser.value = null
  }
}

async function confirmDelete() {
  if (!selectedUser.value) return

  deleting.value = true

  try {
    const { data, error } = await supabase.functions.invoke('admin-delete-user', {
      body: { targetUserId: selectedUser.value.id },
    })

    if (error || !data?.ok) {
      console.error(error || data)
      showToast('No se pudo eliminar el usuario.', 'error')
      return
    }

    showDeleteModal.value = false
    selectedUser.value = null
    showToast('Usuario eliminado definitivamente.')
    await loadUsers()
  } finally {
    deleting.value = false
  }
}

function askBulkDelete() {
  if (!selectedCount.value) return
  showBulkDeleteModal.value = true
}

function closeBulkDeleteModal() {
  if (!bulkDeleteLoading.value) {
    showBulkDeleteModal.value = false
  }
}

async function confirmBulkDelete() {
  if (!selectedIds.value.length) return

  bulkDeleteLoading.value = true

  try {
    for (const id of selectedIds.value) {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { targetUserId: id },
      })

      if (error || !data?.ok) {
        console.error(error || data)
        showToast('No se pudo eliminar toda la selección.', 'error')
        return
      }
    }

    showBulkDeleteModal.value = false
    clearSelection()
    showToast('Usuarios eliminados definitivamente.')
    await loadUsers()
  } finally {
    bulkDeleteLoading.value = false
  }
}

onMounted(async () => {
  const ok = await checkAdmin()
  if (ok) await loadUsers()
})

onBeforeUnmount(() => {
  if (toastTimer) window.clearTimeout(toastTimer)
})
</script>

<template>
  <main class="admin-page">
    <section class="admin-card">
      <header class="page-head">
        <h1 class="page-title">Panel Admin · Usuarios</h1>
        <p class="subtitle">Buscá, bloqueá o eliminá usuarios definitivamente.</p>
      </header>

      <div class="toolbar">
        <div class="search">
          <span class="search-icon">🔍</span>
          <input v-model="search" type="search" placeholder="Buscar por nombre o email" />
        </div>

        <div class="tabs">
          <button class="tab-btn" :class="{ active: currentTab === 'todos' }" type="button" @click="setTab('todos')">
            Todos
          </button>
          <button class="tab-btn" :class="{ active: currentTab === 'bloqueados' }" type="button" @click="setTab('bloqueados')">
            Bloqueados
          </button>
        </div>
      </div>

      <div v-if="filteredUsers.length" class="bulk-bar">
        <label class="check-inline">
          <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" />
          <span>Seleccionar visibles</span>
        </label>

        <div v-if="selectedCount" class="bulk-actions">
          <span class="selected-count">{{ selectedCount }} seleccionados</span>

          <button class="pill pill-dark" type="button" @click="askBulkBlocked(true)">
            Bloquear
          </button>

          <button
            v-if="currentTab === 'bloqueados'"
            class="pill pill-soft"
            type="button"
            @click="askBulkBlocked(false)"
          >
            Desbloquear
          </button>

          <button class="pill pill-danger" type="button" @click="askBulkDelete">
            Eliminar
          </button>

          <button class="pill pill-light" type="button" @click="clearSelection">
            Limpiar
          </button>
        </div>
      </div>

      <p v-if="loading" class="state">Cargando usuarios...</p>
      <p v-else-if="!filteredUsers.length" class="state">No encontramos usuarios para esta vista.</p>

      <div v-else class="users-list">
        <article v-for="u in filteredUsers" :key="u.id" class="user-row">
          <div class="row-left">
            <label v-if="!u.is_admin" class="check-wrap">
              <input
                type="checkbox"
                :checked="selectedIds.includes(u.id)"
                @change="toggleSelectUser(u.id)"
              />
            </label>

            <div class="user-info">
              <h2>{{ u.name || 'Sin nombre' }}</h2>
              <p>{{ u.email || 'Sin email' }}</p>

              <div class="user-badges">
                <span v-if="u.is_admin" class="mini-badge mini-badge-admin">Admin</span>
                <span v-else class="mini-badge mini-badge-user">Usuario</span>
                <span v-if="u.blocked" class="mini-badge mini-badge-blocked">Bloqueado</span>
              </div>
            </div>
          </div>

          <div class="actions" v-if="!u.is_admin">
            <button class="pill pill-soft" type="button" @click="goToProfile(u.id)">
              Ver perfil
            </button>

            <button class="pill pill-dark" type="button" @click="askToggleBlocked(u)">
              {{ u.blocked ? 'Desbloquear' : 'Bloquear' }}
            </button>

            <button class="pill pill-danger" type="button" @click="askDelete(u)">
              Eliminar
            </button>
          </div>
        </article>
      </div>
    </section>

    <div v-if="showBlockModal" class="modal-overlay" @click.self="closeBlockModal">
      <div class="modal-card">
        <h2 class="modal-title">
          {{ nextBlockedValue ? '¿Bloquear usuario?' : '¿Desbloquear usuario?' }}
        </h2>
        <p class="modal-text">
          {{
            nextBlockedValue
              ? `La cuenta de ${selectedBlockUser?.name || selectedBlockUser?.email || 'este usuario'} quedará bloqueada.`
              : `La cuenta de ${selectedBlockUser?.name || selectedBlockUser?.email || 'este usuario'} volverá a estar activa.`
          }}
        </p>
        <div class="modal-actions">
          <button class="modal-btn soft" type="button" :disabled="blockActionLoading" @click="closeBlockModal">
            Cancelar
          </button>
          <button class="modal-btn" type="button" :disabled="blockActionLoading" @click="confirmToggleBlocked">
            {{ blockActionLoading ? 'Guardando…' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteModal" class="modal-overlay" @click.self="closeDeleteModal">
      <div class="modal-card">
        <h2 class="modal-title">¿Eliminar usuario definitivamente?</h2>
        <p class="modal-text">
          Se borrará la cuenta de
          <strong>{{ selectedUser?.name || selectedUser?.email || 'este usuario' }}</strong>,
          sus posteos y sus comentarios. Esta acción no se puede deshacer.
        </p>
        <div class="modal-actions">
          <button class="modal-btn soft" type="button" :disabled="deleting" @click="closeDeleteModal">
            Cancelar
          </button>
          <button class="modal-btn danger" type="button" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? 'Eliminando…' : 'Eliminar definitivamente' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showBulkBlockModal" class="modal-overlay" @click.self="closeBulkBlockModal">
      <div class="modal-card">
        <h2 class="modal-title">
          {{ bulkNextBlockedValue ? '¿Bloquear usuarios?' : '¿Desbloquear usuarios?' }}
        </h2>
        <p class="modal-text">
          Vas a actualizar {{ selectedCount }} usuario{{ selectedCount === 1 ? '' : 's' }}.
        </p>
        <div class="modal-actions">
          <button class="modal-btn soft" type="button" :disabled="bulkBlockLoading" @click="closeBulkBlockModal">
            Cancelar
          </button>
          <button class="modal-btn" type="button" :disabled="bulkBlockLoading" @click="confirmBulkBlocked">
            {{ bulkBlockLoading ? 'Guardando…' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showBulkDeleteModal" class="modal-overlay" @click.self="closeBulkDeleteModal">
      <div class="modal-card">
        <h2 class="modal-title">¿Eliminar selección definitivamente?</h2>
        <p class="modal-text">
          Vas a eliminar {{ selectedCount }} usuario{{ selectedCount === 1 ? '' : 's' }} de forma permanente.
          Esta acción no se puede deshacer.
        </p>
        <div class="modal-actions">
          <button class="modal-btn soft" type="button" :disabled="bulkDeleteLoading" @click="closeBulkDeleteModal">
            Cancelar
          </button>
          <button class="modal-btn danger" type="button" :disabled="bulkDeleteLoading" @click="confirmBulkDelete">
            {{ bulkDeleteLoading ? 'Eliminando…' : 'Eliminar definitivamente' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="toastVisible"
      class="toast"
      :class="toastType === 'success' ? 'toast-success' : 'toast-error'"
      role="status"
      aria-live="polite"
    >
      {{ toastText }}
    </div>
  </main>
</template>

<style scoped>
.admin-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px 18px 48px;
  background: #fff;
}
.admin-card {
  max-width: 980px;
  margin: 0 auto;
}
.page-head {
  display: grid;
  gap: 8px;
  margin-bottom: 18px;
}
.page-title {
  margin: 0;
  color: #50bdbd;
  font-size: 1.6rem;
  font-weight: 800;
}
.subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 0.95rem;
  line-height: 1.4;
}
.toolbar {
  display: grid;
  gap: 12px;
  margin-bottom: 14px;
}
.search {
  position: relative;
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.6;
}
.search input {
  width: 100%;
  padding: 12px 14px 12px 38px;
  border-radius: 999px;
  border: 1px solid #dbe7ef;
  background: #f8fcff;
  font-size: 0.95rem;
  box-sizing: border-box;
  outline: none;
}
.search input:focus {
  border-color: #50bdbd;
  box-shadow: 0 0 0 3px rgba(80, 189, 189, 0.16);
}
.tabs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.tab-btn {
  padding: 9px 14px;
  min-height: 40px;
  border-radius: 999px;
  border: 1px solid #dbe7ef;
  background: #eef7ff;
  color: #334155;
  cursor: pointer;
  font-weight: 800;
}
.tab-btn.active {
  background: #50bdbd;
  color: #fff;
  border-color: #50bdbd;
}
.bulk-bar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin: 10px 0 16px;
  padding: 12px 14px;
  border-radius: 16px;
  background: #f8fcff;
  border: 1px solid #e4eef5;
}
.check-inline,
.check-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.bulk-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.selected-count {
  color: #475569;
  font-size: 0.9rem;
  font-weight: 700;
}
.state {
  color: #475569;
  font-size: 0.95rem;
}
.users-list {
  display: grid;
  gap: 12px;
}
.user-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid #e8eef3;
  background: #fff;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.04);
}
.row-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.user-info h2 {
  margin: 0 0 6px;
  color: #0f6f74;
  font-size: 1.05rem;
  font-weight: 800;
}
.user-info p {
  margin: 0 0 6px;
  color: #111827;
}
.user-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.mini-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 800;
}
.mini-badge-admin {
  background: #efe7ff;
  color: #5b3a8c;
}
.mini-badge-user {
  background: #eef6ff;
  color: #375a7f;
}
.mini-badge-blocked {
  background: #fee2e2;
  color: #b91c1c;
}
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.pill {
  padding: 9px 14px;
  min-height: 40px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 700;
}
.pill-soft {
  background: #50bdbd;
  color: #fff;
}
.pill-dark {
  background: #43164d;
  color: #fff;
}
.pill-danger {
  background: #ef4444;
  color: #fff;
}
.pill-light {
  background: #eef6ff;
  color: #334155;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
  padding: 16px;
}
.modal-card {
  background: #fff;
  border-radius: 18px;
  max-width: 520px;
  width: 100%;
  padding: 16px 16px 12px;
  box-shadow: 0 18px 40px rgba(30, 41, 59, 0.22);
  border: 1px solid #e8eef3;
}
.modal-title {
  margin: 0 0 10px;
  font-size: 1.15rem;
  font-weight: 900;
  color: #0f172a;
}
.modal-text {
  margin: 0 0 12px;
  color: #475569;
  line-height: 1.45;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
.modal-btn {
  border-radius: 999px;
  border: none;
  padding: 9px 14px;
  min-height: 42px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  background: #50bdbd;
  color: #fff;
}
.modal-btn.soft {
  background: #fff;
  color: #50bdbd;
  border: 1px solid #b6ebe5;
}
.modal-btn.danger {
  background: #ef4444;
}
.toast {
  position: fixed;
  left: 50%;
  bottom: 96px;
  transform: translateX(-50%);
  z-index: 2300;
  min-width: 220px;
  max-width: calc(100vw - 32px);
  padding: 12px 16px;
  border-radius: 14px;
  color: #fff;
  font-weight: 800;
  font-size: 0.92rem;
  text-align: center;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.22);
}
.toast-success {
  background: #50bdbd;
}
.toast-error {
  background: #ef4444;
}
@media (max-width: 760px) {
  .admin-page {
    padding: 16px 12px 96px;
  }
  .user-row {
    flex-direction: column;
    align-items: stretch;
  }
  .row-left {
    align-items: flex-start;
  }
  .actions,
  .bulk-actions,
  .tabs,
  .modal-actions {
    width: 100%;
  }
  .actions .pill,
  .bulk-actions .pill,
  .modal-actions .modal-btn {
    flex: 1;
  }
  .bulk-bar {
    align-items: stretch;
  }
}
</style>