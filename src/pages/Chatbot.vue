<script setup lang="ts">
import { ref, nextTick, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

import UsageBanner from '@/components/UsageBanner.vue'
import { useFeatureGate } from '@/composables/useFeatureGate'

type Sender = 'user' | 'bot'

import nuraAvatar from '@/icons/nurabot.png'

interface ChatMessage {
  id: number
  from: Sender
  text: string
  time: string
}

const router = useRouter()
const title = 'NuraBot'

const gate = useFeatureGate('chatbot')

const isPremium = computed(() => !!gate.premium.value)

const remainingToday = computed(() => {
  if (isPremium.value) return Infinity
  return gate.freeStats.value.remaining
})

const canUseToday = computed(() => {
  if (isPremium.value) return true
  return gate.canUse.value
})

const bannerText = computed(() => {
  if (gate.loading.value) return ''
  if (isPremium.value) return 'Plan Premium: mensajes ilimitados.'
  return `Te quedan ${remainingToday.value} mensajes hoy (plan gratis).`
})

const messages = ref<ChatMessage[]>([
  {
    id: 1,
    from: 'bot',
    text: '¡Hola! Soy NuraBot 💜 Estoy acá para escucharte. ¿En qué te gustaría que te acompañe hoy?',
    time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
  },
])

const userInput = ref('')
const loading = ref(false)
const errorMsg = ref('')
const chatContainer = ref<HTMLElement | null>(null)

// modal aviso inicial
const showDisclaimer = ref(true)

// modal límite diario
const showLimitModal = ref(false)

function goPremium() {
  router.push('/app/premium')
}

const scrollToBottom = async () => {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTo({
      top: chatContainer.value.scrollHeight,
      behavior: 'smooth',
    })
  }
}

const nowTime = () =>
  new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

const generateLocalReply = (rawText: string): string => {
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
      'Gracias por confiarme algo tan delicado 💜. Lo que estás sintiendo es muy importante y no tenés por qué atravesarlo sola. ' +
      'En este momento, lo más seguro es que puedas hablar con alguien de confianza o con un servicio de ayuda inmediata en tu país. ' +
      'Si podés, comunicate con los servicios de emergencia o con una línea de acompañamiento en crisis. Tu vida vale muchísimo y merecés recibir ayuda y cuidado ahora mismo.'
    )
  }

  if (
    text.includes('no quiero comer') ||
    text.includes('no comer') ||
    text.includes('vomitar') ||
    text.includes('vomito') ||
    text.includes('laxante') ||
    text.includes('laxantes') ||
    text.includes('ayuno') ||
    text.includes('ayunar')
  ) {
    return (
      'Entiendo que estos pensamientos y conductas pueden aparecer cuando hay mucho malestar alrededor de la comida o del cuerpo 💜. ' +
      'NuraBot no puede indicar ni recomendar conductas que pongan en riesgo tu salud. Lo más amoroso con vos ahora es que puedas hablar de esto con un equipo de salud (nutri, psicó, médique) con experiencia en TCA. ' +
      'Si querés, contame qué sentís antes y después de esos momentos y pensamos juntas a quién podrías pedirle ayuda.'
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
      'Siento que la ansiedad te esté acompañando así 💜. Probá una pausa cortita: pies en el piso, inhalá 4, sostené 4 y exhalá 6–8, mientras registrás 3 cosas que ves, 2 que escuchás y 1 que tocás. ' +
      'No reemplaza un tratamiento, pero puede ayudarte a atravesar el momento. Si aparece seguido, hablarlo con un profesional puede ser un buen paso.'
    )
  }

  if (
    text.includes('atracón') ||
    text.includes('atracon') ||
    text.includes('comí de más') ||
    text.includes('comi de mas') ||
    text.includes('me pasé comiendo') ||
    text.includes('me pase comiendo') ||
    text.includes('culpa') ||
    text.includes('vergüenza') ||
    text.includes('verguenza')
  ) {
    return (
      'Es muy comprensible que después de comer aparezcan culpa o vergüenza, pero lo que comés no define tu valor 💜. ' +
      'Puede ayudar poner en palabras qué pasaba antes: emociones, situaciones, pensamientos. Muchas veces el atracón es una forma de calmar algo que duele. ' +
      'Hablarlo con un equipo especializado o alguien de confianza puede ser un paso muy valioso.'
    )
  }

  if (
    text.includes('mi cuerpo') ||
    text.includes('mi peso') ||
    text.includes('engord') ||
    text.includes('gorda') ||
    text.includes('flaca') ||
    text.includes('feo') ||
    text.includes('fea') ||
    text.includes('no me gusto') ||
    text.includes('no me gusta mi cuerpo')
  ) {
    return (
      'Lidiar con una relación difícil con el cuerpo puede ser agotador 💜. Tu valor no se reduce a una forma o a un número. ' +
      'Quizás hoy puedas elegir un gesto chiquito de amabilidad: notar algo tuyo valioso que no sea físico, o cuidar lo que consumís en redes. ' +
      'Si esto te pesa mucho, un equipo con enfoque en TCA puede acompañarte.'
    )
  }

  if (
    text.includes('triste') ||
    text.includes('bajón') ||
    text.includes('bajon') ||
    text.includes('sin ganas') ||
    text.includes('vacía') ||
    text.includes('vacia') ||
    text.includes('depre') ||
    text.includes('deprimida')
  ) {
    return (
      'Siento que estés pasando por un momento pesado 💜. Estar triste no significa que estés fallando, significa que algo necesita cuidado. ' +
      'Podés empezar por algo pequeño: escribir lo que sentís, mandar un mensaje a alguien, poner música suave. ' +
      'Si esta sensación dura varios días o te cuesta mucho sostener tus actividades, buscá ayuda profesional para no llevarlo sola.'
    )
  }

  if (
    text.includes('dormir') ||
    text.includes('insomnio') ||
    text.includes('no puedo dormir') ||
    text.includes('me cuesta dormir') ||
    text.includes('cansada') ||
    text.includes('agotada')
  ) {
    return (
      'El descanso influye muchísimo en cómo nos sentimos 💜. Podés probar: bajar luces, alejarte un rato del celular, respiraciones suaves o estiramientos tranquilos. ' +
      'Si te pasa hace tiempo y afecta tu día, sería importante hablarlo con un profesional para opciones seguras para vos.'
    )
  }

  if (text.includes('hola') || text.includes('buenas') || text.includes('ola') || text.includes('hey')) {
    return (
      '¡Hola! Gracias por escribirme 💜. Podés contarme qué te preocupa hoy y voy a devolverte un mensaje cuidadoso y sin juicios. ' +
      'Recordá que no reemplazo a un tratamiento, pero sí puedo acompañarte a ordenar lo que sentís y pensar un próximo paso.'
    )
  }

  return (
    'Gracias por poner en palabras lo que estás viviendo 💜. Lo que sentís es válido. ' +
    'Si querés, contame un poco más qué es lo que más te preocupa ahora, y pensamos juntas un siguiente paso amable.'
  )
}

async function sendMessage() {
  const text = userInput.value.trim()
  if (!text || loading.value) return

  errorMsg.value = ''

  // ✅ refresca por si cambió el día (tu usageLimits resetea por AR)
  gate.refresh()

  if (!canUseToday.value) {
    showLimitModal.value = true
    return
  }

  // ✅ consume “en vivo” al enviar (baja el banner al instante)
  if (!isPremium.value) {
    gate.consume(1)
  }

  messages.value.push({
    id: Date.now(),
    from: 'user',
    text,
    time: nowTime(),
  })

  userInput.value = ''
  await scrollToBottom()

  try {
    loading.value = true

    const typingId = Date.now() + 10
    messages.value.push({
      id: typingId,
      from: 'bot',
      text: 'NuraBot está escribiendo…',
      time: '',
    })

    await scrollToBottom()
    await new Promise((resolve) => setTimeout(resolve, 900))

    const reply = generateLocalReply(text)

    messages.value = messages.value.filter((m) => m.id !== typingId)

    messages.value.push({
      id: Date.now() + 20,
      from: 'bot',
      text: reply,
      time: nowTime(),
    })

    await scrollToBottom()
  } catch (err: any) {
    console.error(err)
    errorMsg.value = err?.message || 'Hubo un error inesperado. Probá de nuevo más tarde.'
  } finally {
    loading.value = false
  }
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

// opcional: refrescar cada 30s por si cambia el día sin recargar
let tick: number | null = null
onMounted(() => {
  gate.refresh()
  tick = window.setInterval(() => gate.refresh(), 30_000)
})
onBeforeUnmount(() => {
  if (tick) window.clearInterval(tick)
})
</script>

<template>
  <h1 class="visually-hidden">Chatbot</h1>

  <main class="contenido">
    <header class="page-head">
      <h2>{{ title }}</h2>
      <p class="chat-subtitle">
        Disponible 24/7 para acompañarte. Recordá que NuraBot no reemplaza la ayuda de un profesional de la salud.
      </p>

      <UsageBanner :show="!gate.loading" :text="bannerText" variant="info" />
    </header>

    <div v-if="showDisclaimer" class="disclaimer-overlay">
      <div class="disclaimer-card">
        <h3 class="disclaimer-title">Antes de empezar</h3>

        <p class="disclaimer-text">
          NuraBot es un acompañante digital pensado para ofrecer contención y apoyo general.
        </p>

        <ul class="disclaimer-list">
          <li>No reemplaza atención, diagnóstico ni tratamiento profesional.</li>
          <li>Los mensajes son orientativos y no deben tomarse como indicaciones médicas.</li>
          <li>Si necesitás ayuda urgente, buscá apoyo profesional o servicios de emergencia.</li>
        </ul>

        <p class="disclaimer-note">
          Al tocar <strong>“Acepto y quiero continuar”</strong> confirmás que leíste y comprendiste este aviso.
        </p>

        <div class="disclaimer-actions">
          <button type="button" class="pill pill--primary" @click="showDisclaimer = false">
            Acepto y quiero continuar
          </button>
        </div>
      </div>
    </div>

    <div ref="chatContainer" class="chat-box">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message-row"
        :class="msg.from === 'user' ? 'message-row--user' : 'message-row--bot'"
      >
        <div class="bubble" :class="msg.from === 'user' ? 'bubble--user' : 'bubble--bot'">
          <p class="bubble-text">{{ msg.text }}</p>
          <span class="bubble-meta">
            {{ msg.time }} · {{ msg.from === 'user' ? 'Vos' : 'NuraBot' }}
          </span>
        </div>
      </div>
    </div>

    <p v-if="errorMsg" class="chat-error">{{ errorMsg }}</p>

    <form class="input-area" @submit.prevent="sendMessage">
      <div class="input-wrapper">
        <textarea
          v-model="userInput"
          rows="1"
          class="input-field"
          placeholder="Escribí un mensaje..."
          @keydown="onKeyDown"
        />
      </div>

      <button type="button" class="mic-btn" aria-label="Grabar mensaje de voz (próximamente)">
        <div class="audio">
          <img src="/icons/audio.png" alt="audio" />
        </div>
      </button>

      <button type="submit" class="send-btn" :disabled="loading || !userInput.trim() || !canUseToday">
        {{ loading ? 'Enviando…' : 'Enviar' }}
      </button>
    </form>

    <div v-if="!isPremium" class="daily-hint">
      <span v-if="canUseToday">Hoy te quedan <strong>{{ remainingToday }}</strong> mensajes.</span>
      <span v-else>Ya no te quedan mensajes hoy.</span>
    </div>

    <p class="disclaimer">
      NuraBot no reemplaza un tratamiento ni la atención de profesionales de salud.
      Si estás en una situación de emergencia, buscá ayuda inmediata en los servicios de urgencias de tu país.
    </p>

    <div v-if="showLimitModal" class="limit-overlay" @click.self="showLimitModal = false">
      <div class="limit-card">
        <h3 class="limit-title">Límite diario alcanzado</h3>
        <p class="limit-text">En el plan gratuito tenés <strong>10 mensajes por día</strong>.</p>
        <p class="limit-text">Podés esperar hasta mañana (hora Argentina) o pasar a <strong>Premium</strong>.</p>

        <div class="limit-actions">
          <button class="limit-btn soft" type="button" @click="showLimitModal = false">Entendido</button>
          <button class="limit-btn" type="button" @click="goPremium">Ver Premium</button>
        </div>
      </div>
    </div>
  </main>
</template>




<style scoped>
.contenido {
  background: #fff;
  padding: 24px 18px 48px;
  max-width: 1100px;
  margin: 0 auto;
}

.page-head {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

h2 {
  margin: 0;
  padding: 10px;
}

.chat-subtitle {
  font-size: 0.9rem;
  color: #666;
  margin: 0 10px 4px;
}

.chat-box {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
  max-height: 480px;
  min-height: 265px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.message-row {
  display: flex;
}
.message-row--bot {
  justify-content: flex-start;
}
.message-row--user {
  justify-content: flex-end;
}

.bubble {
  max-width: 80%;
  border-radius: 16px;
  padding: 0.75rem 1rem;
  font-size: 0.95rem;
  line-height: 1.4;
}

.bubble--bot {
  background: var(--nura);
  color: #ffffff;
  border-bottom-left-radius: 4px;
}

.bubble--user {
  background: #50bdbd8e;
  color: #123;
  border-bottom-right-radius: 4px;
}

.bubble-text {
  margin: 0;
}

.bubble-meta {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.7rem;
  opacity: 0.8;
  text-align: right;
}

.typing {
  font-size: 0.8rem;
  color: #ffffff;
  margin-top: 0.2rem;
}

.input-area {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.6rem;
}

.input-wrapper {
  flex: 1;
}

.input-field {
  width: 95%;
  border-radius: 999px;
  border: 1px solid #d3d7dd;
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  color: #000000;
  resize: none;
  outline: none;
  background: #50bdbd8e;
}

.input-field:focus {
  border-color: var(--nura);
  box-shadow: 0 0 0 2px rgba(55, 179, 179, 0.15);
}

.mic-btn {
  border: none;
  background: #50bdbd;
  border-radius: 50%;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1rem;
  padding: 8px;
}

.mic-btn:hover {
  background: #56bfcf;
  transform: translateY(-1px);
}

.send-btn {
  border: none;
  border-radius: 999px;
  padding: 0.55rem 1.4rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  background: #50bdbd;
  color: #ffffff;
  transition: background 0.15s ease, transform 0.15s ease;
}

.send-btn:hover {
  background: #56bfcf;
  transform: translateY(-1px);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.chat-error {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #d03030;
}

.disclaimer {
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: #777;
}

.audio img {
  width: 40px;
  height: 60px;
  object-fit: contain;
  margin-top: 5px;
  padding-right: 1.5px;
}

/* MODAL AVISO INICIAL */
.disclaimer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
}

.disclaimer-card {
  background: #ffffff;
  border-radius: 24px;
  max-width: 520px;
  width: 100%;
  padding: 22px 22px 18px;
  box-shadow: 0 18px 40px rgba(30, 41, 59, 0.22);
}

.disclaimer-title {
  margin: 0 0 10px;
  font-size: 1.3rem;
  font-weight: 700;
  color: #50bdbd;
}

.disclaimer-text {
  margin: 0 0 8px;
  font-size: 0.95rem;
  color: #374151;
}

.disclaimer-list {
  margin: 0 0 10px 1rem;
  padding: 0;
  font-size: 0.9rem;
  color: #4b5563;
  list-style: disc;
}

.disclaimer-note {
  margin: 0 0 14px;
  font-size: 0.85rem;
  color: #6b7280;
}

.disclaimer-actions {
  display: flex;
  justify-content: flex-end;
}

.pill {
  border-radius: 999px;
  padding: 7px 18px;
  font-size: 0.85rem;
  border: none;
  background: #50bdbd;
  color: #ffffff;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.35);
  transition: transform 0.12s ease, box-shadow 0.12s ease, background-color 0.12s ease;
}

.pill--primary:hover {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(80, 189, 189, 0.4);
}

/* contador mini */
.daily-hint {
  margin-top: 10px;
  font-size: 0.85rem;
  color: #000000;
  padding: 0 4px;
}

/* MODAL LÍMITE DIARIO */
.limit-overlay {
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

.limit-card {
  background: #ffffff;
  border-radius: 18px;
  max-width: 520px;
  width: 100%;
  padding: 18px 18px 14px;
  box-shadow: 0 18px 40px rgba(30, 41, 59, 0.22);
  border: 1px solid #e8eef3;
}

.limit-title {
  margin: 0 0 10px;
  font-size: 1.2rem;
  font-weight: 800;
  color: #0f172a;
}

.limit-text {
  margin: 0 0 8px;
  color: #475569;
}

.limit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.limit-btn {
  border-radius: 999px;
  border: none;
  padding: 9px 14px;
  font-weight: 700;
  cursor: pointer;
  background: #50bdbd;
  color: #fff;
}
.limit-btn:hover {
  background: #3daaaa;
}
.limit-btn.soft {
  background: #ffffff;
  color: #50bdbd;
  border: 1px solid #b6ebe5;
}
.limit-btn.soft:hover {
  background: #e0faf7;
}

@media (max-width: 640px) {
  .chat-box {
    padding: 1rem;
    max-height: 60vh;
  }
  .bubble {
    max-width: 90%;
  }
  .input-area {
    align-items: flex-end;
  }
}
</style>
