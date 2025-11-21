<script setup lang="ts">
import { ref, nextTick } from 'vue';

const title = 'NuraBot';

type Sender = 'user' | 'bot';

import nuraAvatar from "@/assets/nurabot.png";




interface ChatMessage {
  id: number;
  from: Sender;
  text: string;
  time: string;
}

const messages = ref<ChatMessage[]>([
  {
    id: 1,
    from: 'bot',
    text: '¡Hola! Soy NuraBot 💜 Estoy acá para escucharte. ¿En qué te gustaría que te acompañe hoy?',
    time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
  },
]);

const userInput = ref('');
const loading = ref(false);
const errorMsg = ref('');
const chatContainer = ref<HTMLElement | null>(null);

// Scroll automático
const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTo({
      top: chatContainer.value.scrollHeight,
      behavior: 'smooth',
    });
  }
};

/**
 * Genera una respuesta local de NuraBot sin usar APIs externas.
 * Usa palabras clave para devolver mensajes cuidados y empáticos.
 */
 const generateLocalReply = (rawText: string): string => {
  const text = rawText.toLowerCase();

  // 🚨 Mensajes de mucho riesgo / autolesión
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
      'Si podés, comunicate con los servicios de emergencia o con una línea de acompañamiento en crisis. Tu vida vale muchísimo y merecés recibir ayuda y cuidado ahora mismo. 🌙'
    );
  }

  // Restricción fuerte / purga / conductas compensatorias
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
      'NuraBot no puede indicar ni recomendar conductas que pongan en riesgo tu salud. Lo más amoroso con vos ahora es que puedas hablar de esto con un equipo de salud (nutri, psicó, médique) que tenga experiencia en TCA. ' +
      'Si querés, podés contarme un poco qué sentís antes y después de estos momentos, así lo nombramos juntas y pensás a quién podrías pedirle ayuda en tu entorno. 🌱'
    );
  }

  // Ansiedad / nervios / angustia
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
      'Siento que la ansiedad te esté acompañando así, puede sentirse muy abrumadora 💜. ' +
      'Podés probar una pausa cortita: apoyá los pies en el piso, inhalá en 4 segundos, sostené 4 y exhalá en 6–8 mientras registrás 3 cosas que ves, 2 que escuchás y 1 que podés tocar. ' +
      'Este tipo de recursos no reemplaza un tratamiento, pero puede ayudarte a atravesar el momento. Si la ansiedad aparece seguido, hablarlo con un profesional de salud mental puede ser un buen próximo paso para vos. 🌱'
    );
  }

  // Culpa, atracón, “comí de más”
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
      'Es muy comprensible que después de comer aparezcan culpa o vergüenza, pero lo que comés no define tu valor como persona 💜. ' +
      'Puede ayudar mucho poner en palabras qué estabas viviendo antes de ese momento: emociones, situaciones, pensamientos. Muchas veces el atracón es una forma de intentar calmar algo que duele. ' +
      'Hablar de esto con un equipo especializado en TCA o con alguien de confianza puede ser un paso muy valioso para empezar a estar más en paz con la comida y con vos misma. 🌙'
    );
  }

  // Imagen corporal / peso / cuerpo
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
      'Lidiar con una relación difícil con el cuerpo puede ser muy agotador 💜. Es entendible que te sientas así en una cultura tan exigente con la imagen. ' +
      'Tu valor no se reduce a una forma, a un talle o a un número. Podés empezar con gestos muy pequeños de amabilidad hacia vos misma: notar algo que valorás de vos que no tenga que ver con lo físico, o elegir contenidos en redes que no te lastimen. ' +
      'Trabajar esto con profesionales que se enfoquen en salud en todas las tallas o TCA puede acompañarte a construir una relación más suave con tu cuerpo. 🌱'
    );
  }

  // Tristeza, bajón, desmotivación
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
      'Siento que estés pasando por un momento tan pesado 💜. Estar triste o sin energía no significa que estés fallando, es una señal de que algo necesita atención y cuidado. ' +
      'Podés empezar por algo pequeño que te conecte un poquito con calma o apoyo: mandar un mensaje a alguien de confianza, poner música suave, escribir lo que sentís. ' +
      'Si esta sensación se sostiene varios días o te cuesta mucho hacer tus actividades, te sugiero buscar ayuda profesional para no llevar esto sola. 🌙'
    );
  }

  // Sueño / cansancio
  if (
    text.includes('dormir') ||
    text.includes('insomnio') ||
    text.includes('no puedo dormir') ||
    text.includes('me cuesta dormir') ||
    text.includes('cansada') ||
    text.includes('agotada')
  ) {
    return (
      'El descanso impacta un montón en cómo nos sentimos con la comida, el cuerpo y las emociones 💜. ' +
      'Podés probar pequeñas rutinas antes de dormir: bajar la luz, alejarte un ratito del celular, hacer un par de respiraciones suaves o estiramientos tranquilos. ' +
      'Si te cuesta dormir desde hace tiempo o notás que afecta mucho tu día a día, sería importante charlarlo con un profesional de salud para encontrar opciones seguras para vos. 🌱'
    );
  }

  // Saludos / consultas generales
  if (
    text.includes('hola') ||
    text.includes('buenas') ||
    text.includes('ola') ||
    text.includes('hey')
  ) {
    return (
      '¡Hola! Gracias por escribirme 💜. Soy NuraBot, un acompañante digital pensado para estar cerca cuando lo necesites. ' +
      'Podés contarme qué te preocupa hoy en relación a la comida, el cuerpo o cómo te venís sintiendo, y voy a intentar devolverte un mensaje cuidadoso y sin juicios. ' +
      'Recordá que no reemplazo a un tratamiento profesional, pero sí puedo ayudarte a dar un primer paso para pedir ayuda o mirar la situación con un poco más de calma. 🌙'
    );
  }

  // Respuesta genérica empática
  return (
    'Gracias por animarte a poner en palabras lo que estás viviendo 💜. Lo que sentís es válido y no habla mal de vos, habla de que estás atravesando algo que te está costando. ' +
    'Desde acá puedo ofrecerte contención y algunas ideas generales de autocuidado, pero no reemplazo el acompañamiento de un equipo de salud. ' +
    'Si querés, podés contarme un poco más qué es lo que más te preocupa ahora, y pensamos juntas cuál podría ser un siguiente paso amable con vos misma. 🌱'
  );
};


const sendMessage = async () => {
  const text = userInput.value.trim();
  if (!text || loading.value) return;

  errorMsg.value = '';

  // Agregar mensaje del usuario
  messages.value.push({
    id: Date.now(),
    from: 'user',
    text,
    time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
  });

  userInput.value = '';
  await scrollToBottom();

  try {
    loading.value = true;

    // Mostrar "NuraBot está escribiendo..."
    messages.value.push({
      id: Date.now() + 100,
      from: 'bot',
      text: 'NuraBot está escribiendo…',
      time: '',
    });

    await scrollToBottom();

    // Espera real (1.6 segundos)
    await new Promise(resolve => setTimeout(resolve, 1600));

    // Generar respuesta verdadera
    const reply = generateLocalReply(text);

    // Eliminar el mensaje "escribiendo…"
    messages.value = messages.value.filter(m => !m.text.includes('está escribiendo'));

    // Agregar la respuesta real
    messages.value.push({
      id: Date.now() + 200,
      from: 'bot',
      text: reply,
      time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    });

    await scrollToBottom();
  } catch (err: any) {
    console.error(err);
    errorMsg.value =
      err?.message || 'Hubo un error inesperado. Podés intentar de nuevo más tarde.';
  } finally {
    loading.value = false;
  }
};


// Enviar con Enter
const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};
</script>

<template>
  <section class="chat-page">
    <header class="chat-header">
      <h1 class="chat-title">{{ title }}</h1>
      <p class="chat-subtitle">
        Disponible 24/7 para acompañarte. Recordá que no reemplaza la ayuda de un profesional.
      </p>
    </header>

    <div ref="chatContainer" class="chat-box">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message-row"
        :class="msg.from === 'user' ? 'message-row--user' : 'message-row--bot'"
      >
        <div
          class="bubble"
          :class="msg.from === 'user' ? 'bubble--user' : 'bubble--bot'"
        >
          <p class="bubble-text">
            {{ msg.text }}
          </p>
          <span class="bubble-meta">
            {{ msg.time }} · {{ msg.from === 'user' ? 'Vos' : 'NuraBot' }}
          </span>
        </div>
      </div>

      <p v-if="loading" class="typing">
        NuraBot está pensando...
      </p>
    </div>

    <p v-if="errorMsg" class="chat-error">
      {{ errorMsg }}
    </p>

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
        🎤
      </button>

      <button
        type="submit"
        class="send-btn"
        :disabled="loading || !userInput.trim()"
      >
        {{ loading ? 'Enviando…' : 'Enviar' }}
      </button>
    </form>

    <p class="disclaimer">
      NuraBot no reemplaza un tratamiento ni la atención de profesionales de salud. Si estás en una
      situación de emergencia, buscá ayuda inmediata en los servicios de urgencias de tu país.
    </p>
  </section>
</template>

<style scoped>
/* dejo tu mismo CSS de antes (burbuja, input, etc.) */
.chat-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem 1rem 2rem;
}

.chat-header {
  margin-bottom: 1rem;
}

.chat-title {
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--nura-dark);
}

.chat-subtitle {
  font-size: 0.9rem;
  color: #666;
  margin-top: 0.25rem;
}

.chat-box {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
  max-height: 480px;
  min-height: 260px;
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
  background: #dff4f4;
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
  color: #777;
  margin-top: 0.2rem;
}

.input-area {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 1rem;
}

.input-wrapper {
  flex: 1;
}

.input-field {
  width: 100%;
  border-radius: 999px;
  border: 1px solid #d3d7dd;
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  resize: none;
  outline: none;
  background: #f4f6f8;
}

.input-field:focus {
  border-color: var(--nura);
  box-shadow: 0 0 0 2px rgba(55, 179, 179, 0.15);
}

.mic-btn {
  border: none;
  background: #e4e8f1;
  border-radius: 50%;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1rem;
}

.mic-btn:hover {
  background: #d6dced;
}

.send-btn {
  border: none;
  border-radius: 999px;
  padding: 0.55rem 1.4rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  background: #6f8cff;
  color: #ffffff;
  transition: background 0.15s ease;
}

.send-btn:hover:enabled {
  background: #5c79f1;
}

.send-btn:disabled {
  opacity: 0.6;
  cursor: default;
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
