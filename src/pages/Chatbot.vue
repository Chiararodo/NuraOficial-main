<script setup lang="ts">
import { ref, nextTick, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'

import UsageBanner from '@/components/UsageBanner.vue'
import { useFeatureGate } from '@/composables/useFeatureGate'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'

type Sender = 'user' | 'bot'

interface ChatMessage {
  id: number | string
  from: Sender
  text: string
  time: string
}

type DbChatMsg = {
  id: number
  user_id: string
  role: Sender
  message_type: 'text'
  content: string | null
  created_at: string
}

const router = useRouter()
const auth = useAuthStore()

const title = 'NuraBot'
const gate = useFeatureGate('chatbot')


const NURI_AVATAR =  '/icons/nuri-bien.png'

/* ====== Límite / Premium ====== */
const isPremium = computed(() => !!gate.premium.value)

const remainingToday = computed(() => {
  if (isPremium.value) return Infinity
  return gate.freeStats.value.remaining
})

const canUseToday = computed(() => {
  if (isPremium.value) return true
  return gate.canUse.value
})

/* CTA */
const showPremiumCta = computed(() => {
  if (gate.loading.value) return false
  if (isPremium.value) return false
  return true
})

const ctaTitle = computed(() => 'Solo Premium')
const ctaText = computed(() => 'Para usar NuraBot sin límites necesitás el plan Premium.')

const ctaRight = computed(() => {
  if (gate.loading.value) return ''
  if (isPremium.value) return 'Ilimitado'
  return `Te quedan ${remainingToday.value} mensajes hoy`
})

function goPremium() {
  router.push('/app/premium')
}

/* ====== Chat state ====== */
const messages = ref<ChatMessage[]>([])
const userInput = ref('')
const loading = ref(false)
const errorMsg = ref('')

const chatContainer = ref<HTMLElement | null>(null)

const showLimitModal = ref(false)
const showClearModal = ref(false)
const clearing = ref(false)

const welcomeText =
  'Hola, soy NuraBot. Estoy acá para acompañarte. ¿En qué te gustaría que te ayude hoy?'

const fmtTime = (d = new Date()) =>
  d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

const scrollToBottom = async () => {
  await nextTick()
  if (!chatContainer.value) return
  chatContainer.value.scrollTo({
    top: chatContainer.value.scrollHeight,
    behavior: 'smooth',
  })
}

function mapRowToMsg(row: DbChatMsg): ChatMessage {
  return {
    id: row.id,
    from: row.role,
    text: row.content ?? '',
    time: fmtTime(new Date(row.created_at)),
  }
}

/* ====== “IA local”  ====== */
function generateLocalReply(rawText: string): string {
  const text = rawText.toLowerCase()

  if (
    text.includes('no quiero vivir') ||
    text.includes('quitarme la vida') ||
    text.includes('suicid') ||
    text.includes('hacerme daño') ||
    text.includes('lastimarme') ||
    text.includes('hacerme mal')
  ) {
    return (
      'Gracias por compartirlo. Lo que sentís es importante y no tenés que atravesarlo sola. ' +
      'En este momento, lo más seguro es hablar con alguien de confianza o con un servicio de ayuda inmediata en tu país. ' +
      'Si podés, comunicate con los servicios de emergencia o con una línea de acompañamiento en crisis.'
    )
  }

  if (
    text.includes('no quiero comer') ||
    text.includes('vomitar') ||
    text.includes('vomito') ||
    text.includes('laxante') ||
    text.includes('laxantes') ||
    text.includes('ayuno') ||
    text.includes('ayunar')
  ) {
    return (
      'Entiendo que puede haber mucho malestar alrededor de la comida o del cuerpo. ' +
      'No puedo indicar ni recomendar conductas que pongan en riesgo tu salud. ' +
      'Lo más recomendable es hablarlo con un equipo de salud con experiencia en TCA. ' +
      'Si querés, contame qué sentís antes y después de esos momentos y vemos un próximo paso.'
    )
  }

  if (
    text.includes('ansiedad') ||
    text.includes('ansiosa') ||
    text.includes('ataque de pánico') ||
    text.includes('ataque de panico') ||
    text.includes('nerviosa') ||
    text.includes('angustia') ||
    text.includes('crisis')
  ) {
    return (
      'Parece que estás atravesando un momento de ansiedad. Podés probar una pausa breve: pies en el piso, inhalá 4, sostené 4 y exhalá 6–8. ' +
      'No reemplaza un tratamiento, pero puede ayudarte a atravesar el momento. Si aparece seguido, hablarlo con un profesional puede ayudar.'
    )
  }

  if (
    text.includes('atracón') ||
    text.includes('atracon') ||
    text.includes('culpa') ||
    text.includes('vergüenza') ||
    text.includes('verguenza')
  ) {
    return (
      'Es comprensible que aparezcan culpa o vergüenza, pero lo que comés no define tu valor. ' +
      'Puede ayudar identificar qué pasaba antes: emociones, situaciones o pensamientos. ' +
      'Hablarlo con un equipo especializado o alguien de confianza puede ser un paso valioso.'
    )
  }

  if (text.includes('hola') || text.includes('buenas') || text.includes('hey')) {
    return 'Hola. Contame qué te preocupa hoy y te devuelvo un mensaje cuidadoso y sin juicios.'
  }

  return 'Gracias por contarlo. Si querés, contame un poco más qué es lo que más te preocupa ahora y pensamos un próximo paso.'
}

/* ====== DB helpers (solo texto) ====== */
async function saveText(role: Sender, content: string) {
  const uid = auth.user?.id
  if (!uid) return null

  const { data, error } = await supabase
    .from('chatbot_messages')
    .insert({
      user_id: uid,
      role,
      message_type: 'text',
      content,
      audio_url: null, 
    } as any)
    .select('id,user_id,role,message_type,content,created_at')
    .single()

  if (error) throw error
  return data as DbChatMsg
}

async function ensureWelcome() {
  if (!auth.user?.id) return
  if (messages.value.length > 0) return

  // Crea welcome en DB y lo muestra
  const created = await saveText('bot', welcomeText).catch(() => null)
  messages.value = [
    {
      id: created?.id ?? `welcome-${Date.now()}`,
      from: 'bot',
      text: welcomeText,
      time: created?.created_at ? fmtTime(new Date(created.created_at)) : fmtTime(),
    },
  ]
}

async function loadHistory() {
  const uid = auth.user?.id
  if (!uid) return

  const { data, error } = await supabase
    .from('chatbot_messages')
    .select('id,user_id,role,message_type,content,created_at')
    .eq('user_id', uid)
    .eq('message_type', 'text')
    .order('created_at', { ascending: true })
    .limit(300)

  if (error) throw error

  messages.value = (data as DbChatMsg[]).map(mapRowToMsg)
  if (messages.value.length === 0) await ensureWelcome()
  await scrollToBottom()
}

async function sendMessage() {
  const text = userInput.value.trim()
  if (!text || loading.value) return

  if (!auth.user) {
    errorMsg.value = 'Necesitás iniciar sesión para usar el chatbot.'
    return
  }

  errorMsg.value = ''
  gate.refresh()

  if (!canUseToday.value) {
    showLimitModal.value = true
    return
  }

  // consume SOLO al enviar un mensaje del usuario (no en respuestas)
  if (!isPremium.value) gate.consume(1)

  // UI optimista
  const localUserId = `u-${Date.now()}`
  messages.value.push({ id: localUserId, from: 'user', text, time: fmtTime() })
  userInput.value = ''
  await scrollToBottom()

  try {
    loading.value = true

    // guarda user
    const savedUser = await saveText('user', text)
    if (savedUser) {
      const idx = messages.value.findIndex((m) => m.id === localUserId)
      if (idx !== -1) messages.value[idx] = mapRowToMsg(savedUser)
    }

    // typing fake
    const typingId = `t-${Date.now()}`
    messages.value.push({ id: typingId, from: 'bot', text: 'Escribiendo…', time: '' })
    await scrollToBottom()

    await new Promise((r) => setTimeout(r, 550))

    const reply = generateLocalReply(text)

    // reemplaza typing
    messages.value = messages.value.filter((m) => m.id !== typingId)

    const localBotId = `b-${Date.now()}`
    messages.value.push({ id: localBotId, from: 'bot', text: reply, time: fmtTime() })
    await scrollToBottom()

    // guarda bot
    const savedBot = await saveText('bot', reply)
    if (savedBot) {
      const idx = messages.value.findIndex((m) => m.id === localBotId)
      if (idx !== -1) messages.value[idx] = mapRowToMsg(savedBot)
    }

    if (!isPremium.value) {
      gate.refresh()
      if (!canUseToday.value) showLimitModal.value = true
    }
  } catch (err: any) {
    console.error(err)
    errorMsg.value = err?.message || 'Hubo un error inesperado. Probá de nuevo más tarde.'
  } finally {
    loading.value = false
  }
}

async function clearHistory() {
  if (!auth.user?.id) return
  try {
    clearing.value = true
    const { error } = await supabase.from('chatbot_messages').delete().eq('user_id', auth.user.id)
    if (error) throw error

    messages.value = []
    await ensureWelcome()
    showClearModal.value = false
    await scrollToBottom()
  } catch (e: any) {
    console.error(e)
    errorMsg.value = e?.message || 'No se pudo borrar el historial.'
  } finally {
    clearing.value = false
  }
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

/* ===== Realtime   ===== */
let tick: number | null = null
let realtimeChannel: any = null

async function setupRealtime() {
  const uid = auth.user?.id
  if (!uid) return

  realtimeChannel = supabase
    .channel(`chatbot_messages_${uid}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chatbot_messages', filter: `user_id=eq.${uid}` },
      (payload: any) => {
        const row = payload?.new as DbChatMsg | undefined
        if (!row) return
        if (row.message_type !== 'text') return
        if (messages.value.some((m) => m.id === row.id)) return
        messages.value.push(mapRowToMsg(row))
        scrollToBottom()
      }
    )
    .subscribe()
}

function teardownRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
}

onMounted(async () => {
  gate.refresh()
  tick = window.setInterval(() => gate.refresh(), 30_000)

  try {
    await loadHistory()
    await setupRealtime()
  } catch (e) {
    console.error(e)
    await ensureWelcome()
  }
})

onBeforeUnmount(() => {
  if (tick) window.clearInterval(tick)
  teardownRealtime()
})

watch(
  () => auth.user?.id,
  async (uid, prev) => {
    if (!uid || uid === prev) return
    teardownRealtime()
    messages.value = []
    await loadHistory()
    await setupRealtime()
  }
)

watch(
  () => canUseToday.value,
  (canUse) => {
    if (gate.loading.value) return
    if (!isPremium.value && canUse === false) showLimitModal.value = true
  }
)

</script>

<template>
  <main class="contenido">
    <header class="page-head">
      <h2 class="page-title">{{ title }}</h2>
      <p class="chat-subtitle">
        Disponible 24/7 para acompañarte. Recordá que NuraBot no reemplaza la ayuda de un profesional de la salud.
      </p>

      <!-- CTA  -->
      <div v-if="showPremiumCta" class="premium-cta">
        <div class="premium-cta__left">
          <div class="premium-cta__top">
            <span class="premium-cta__badge">Gratis</span>
            <span class="premium-cta__right">{{ ctaRight }}</span>
          </div>
          <p class="premium-cta__title">{{ ctaTitle }}</p>
          <p class="premium-cta__text">{{ ctaText }}</p>
        </div>

        <button type="button" class="premium-cta__btn" @click="goPremium">
          Pasar a Premium
        </button>
      </div>

    

        <button type="button" class="ghost-btn" @click="showClearModal = true" :disabled="clearing">
          Borrar historial
        </button>
     
    </header>

    <div ref="chatContainer" class="chat-box">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message-row"
        :class="msg.from === 'user' ? 'message-row--user' : 'message-row--bot'"
      >
        <!-- Avatar solo para BOT -->
        <img
          v-if="msg.from === 'bot'"
          class="bot-avatar"
          :src="NURI_AVATAR"
          alt="Nuri"
        />

        <div class="bubble" :class="msg.from === 'user' ? 'bubble--user' : 'bubble--bot'">
          <p class="bubble-text">{{ msg.text }}</p>
          <span class="bubble-meta">
            {{ msg.time }} · {{ msg.from === 'user' ? 'Vos' : 'NuraBot' }}
          </span>
        </div>
      </div>
    </div>

    <p v-if="errorMsg" class="chat-error">{{ errorMsg }}</p>

    <!-- Input + botón SIN superposición -->
    <form class="input-area" @submit.prevent="sendMessage">
      <textarea
        v-model="userInput"
        rows="1"
        class="input-field"
        placeholder="Escribí un mensaje..."
        @keydown="onKeyDown"
      />

      <button type="submit" class="send-btn" :disabled="loading || !userInput.trim() || !canUseToday">
        {{ loading ? 'Enviando…' : 'Enviar' }}
      </button>
    </form>

    <p class="disclaimer">
      NuraBot no reemplaza un tratamiento ni la atención de profesionales de salud.
      Si estás en una situación de emergencia, buscá ayuda inmediata en los servicios de urgencias de tu país.
    </p>

    <!-- Modal límite -->
    <div v-if="showLimitModal" class="modal-overlay" @click.self="showLimitModal = false">
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="Límite diario alcanzado">
        <h3 class="modal-title">Límite del plan gratis alcanzado</h3>
        <p class="modal-text">Hoy alcanzaste el límite diario del plan gratuito.</p>

        <div class="modal-highlight">
          <p class="modal-highlight__title">Con Premium</p>
          <ul class="modal-highlight__list">
            <li>Mensajes ilimitados</li>
            <li>Acceso completo sin límite diario</li>
          </ul>
        </div>

        <div class="modal-actions">
          <button class="modal-btn soft" type="button" @click="showLimitModal = false">Entendido</button>
          <button class="modal-btn" type="button" @click="goPremium">Suscribirme</button>
        </div>
      </div>
    </div>

    <!-- Modal borrar historial -->
    <div v-if="showClearModal" class="modal-overlay" @click.self="showClearModal = false">
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="Borrar historial">
        <h3 class="modal-title">Borrar historial</h3>
        <p class="modal-text">Esto eliminará tu historial del chatbot para este usuario.</p>

        <div class="modal-actions">
          <button class="modal-btn soft" type="button" @click="showClearModal = false" :disabled="clearing">
            Cancelar
          </button>
          <button class="modal-btn danger" type="button" @click="clearHistory" :disabled="clearing">
            {{ clearing ? 'Borrando…' : 'Borrar' }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.contenido {
  background: #fff;
  padding: 20px 14px 44px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-head {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
}

.page-title {
  margin: 0;
  font-size: 1.9rem;
  font-weight: 800;
  color: #50bdbd;
  padding: 4px 0;
}

.chat-subtitle {
  font-size: 0.92rem;
  color: #667085;
  margin: 0;
}

/* ============================
   PREMIUM CTA 
============================ */
.premium-cta {
  margin: 0;
  background: #f6fffe;
  border: 1px solid #b6ebe5;
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow: 0 10px 18px rgba(80, 189, 189, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.premium-cta__left {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.premium-cta__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.premium-cta__right {
  font-size: 0.78rem;
  color: #475569;
  font-weight: 800;
  white-space: nowrap;
}

.premium-cta__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(80, 189, 189, 0.15);
  color: #137b7b;
  font-weight: 900;
  font-size: 0.72rem;
}

.premium-cta__title {
  margin: 0;
  font-weight: 900;
  color: #0f172a;
  font-size: 0.9rem;
  line-height: 1.15;
}

.premium-cta__text {
  margin: 0;
  color: #475569;
  font-size: 0.82rem;
  line-height: 1.25;
}

.premium-cta__btn {
  border: none;
  border-radius: 999px;
  padding: 7px 10px;
  font-weight: 900;
  font-size: 0.82rem;
  cursor: pointer;
  background: #50bdbd;
  color: #fff;
  white-space: nowrap;
  transition: background 0.15s ease, transform 0.15s ease;
}

.premium-cta__btn:hover {
  background: #3daaaa;
  transform: translateY(-1px);
}

/* ===== toolbar ===== */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.ghost-btn {
  border: 1px solid #b6ebe5;
  background: #ffffff;
  color: #137b7b;
  font-weight: 900;
  border-radius: 999px;
  padding: 8px 12px;
  cursor: pointer;
  white-space: nowrap;
  width: 15%;
}

.ghost-btn:hover {
  background: #f3fffe;
}

.ghost-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ===== banner compacto  ===== */
.usage-wrapper {
  display: flex;
  justify-content: flex-start;
}

:deep(.usage-banner) {
  width: auto !important;
  max-width: 420px;
  padding: 6px 12px !important;
  border-radius: 999px !important;
  font-size: 0.85rem !important;
}

/* ===== chat ===== */
.chat-box {
  background: #ffffff;
  border-radius: 14px;
  padding: 1.1rem 1.2rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
  max-height: 520px;
  min-height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.message-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.message-row--bot {
  justify-content: flex-start;
}

.message-row--user {
  justify-content: flex-end;
}

.bot-avatar {
  width: 54px;
  height: 54px;
  border-radius: 999px;
  object-fit: cover;
  border: 3px solid rgba(80, 189, 189, 0.25);
  box-shadow: 0 6px 14px rgba(0,0,0,0.08);
}

.bubble {
  max-width: 82%;
  border-radius: 16px;
  padding: 0.72rem 0.95rem;
  font-size: 0.94rem;
  line-height: 1.4;
}

.bubble--bot {
  background: #50bdbd;
  color: #ffffff;
  border-bottom-left-radius: 6px;
}

.bubble--user {
  background: rgba(80, 189, 189, 0.22);
  color: #0b0f19;
  border-bottom-right-radius: 6px;
}

.bubble-text {
  margin: 0;
}

.bubble-meta {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.7rem;
  opacity: 0.85;
  text-align: right;
}

/* ===== input + botón (sin superposición) ===== */
.input-area {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.input-field {
  flex: 1;
  width: 95%;
  border-radius: 999px;
  border: 1px solid #d3d7dd;
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  color: #0b0f19;
  resize: none;
  outline: none;
  background: rgba(80, 189, 189, 0.22);
  min-height: 22px;
}

.input-field:focus {
  border-color: #50bdbd;
  box-shadow: 0 0 0 2px rgba(55, 179, 179, 0.15);
}

.send-btn {
  flex: 0 0 auto;
  border: none;
  border-radius: 999px;
  padding: 0.62rem 1.2rem;
  font-size: 0.9rem;
  font-weight: 900;
  cursor: pointer;
  background: #50bdbd;
  color: #ffffff;
  transition: background 0.15s ease, transform 0.15s ease;
  min-height: 42px;
}

.send-btn:hover {
  background: #3daaaa;
  transform: translateY(-1px);
}

.send-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

/* ===== textos ===== */
.chat-error {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #d03030;
}

.disclaimer {
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: #667085;
}

/* ===== modales ===== */
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
  background: #ffffff;
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
  font-weight: 950;
  color: #0f172a;
}

.modal-text {
  margin: 0 0 10px;
  color: #475569;
}

.modal-highlight {
  border: 1px solid #b6ebe5;
  background: #f3fffe;
  border-radius: 14px;
  padding: 10px 12px;
  margin: 10px 0 12px;
}

.modal-highlight__title {
  margin: 0 0 6px;
  font-weight: 900;
  color: #0f172a;
}

.modal-highlight__list {
  margin: 0;
  padding-left: 1.1rem;
  color: #334155;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.modal-btn {
  border-radius: 999px;
  border: none;
  padding: 9px 14px;
  font-weight: 900;
  cursor: pointer;
  background: #50bdbd;
  color: #fff;
}

.modal-btn:hover {
  background: #3daaaa;
}

.modal-btn.soft {
  background: #ffffff;
  color: #50bdbd;
  border: 1px solid #b6ebe5;
}

.modal-btn.soft:hover {
  background: #e0faf7;
}

.modal-btn.danger {
  background: #d03030;
}

.modal-btn.danger:hover {
  background: #b92525;
}

.modal-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* ===== responsive ===== */
@media (max-width: 640px) {
  .premium-cta {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .premium-cta__top {
    justify-content: flex-start;
  }

  .premium-cta__right {
    margin-left: auto;
  }

  .premium-cta__btn {
    width: 100%;
    text-align: center;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .ghost-btn {
    width: 100%;
  }

  .chat-box {
    padding: 1rem;
    max-height: 60vh;
  }

  .bubble {
    max-width: 92%;
  }

  .input-area {
    gap: 8px;
  }

  .send-btn {
    padding: 0.62rem 0.95rem;
  }
}
</style>