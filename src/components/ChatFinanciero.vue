<template>
    <div class="fixed bottom-6 right-6 w-[400px] max-w-[calc(100vw-2rem)] h-[650px] max-h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-50 transition-all duration-300">
      
      <header class="bg-indigo-600 text-white p-4 flex flex-col gap-3 z-10">
        <div class="flex justify-between items-start">
          <div>
            <h2 class="text-base font-bold flex items-center gap-2">
              ✨ IA Financiera
            </h2>
            <p class="text-[11px] text-indigo-200 mt-0.5">Analizando: <strong>{{ empresa }}</strong></p>
            
            <div class="flex items-center gap-1.5 mt-2">
              <span class="text-[10px] text-indigo-100 uppercase tracking-wider font-semibold">Periodo:</span>
              <select v-model.number="filtroMes" class="bg-indigo-800 text-white text-xs rounded px-1.5 py-0.5 border-none outline-none cursor-pointer">
                <option v-for="m in 12" :key="m" :value="m">{{ mesNombre(m) }}</option>
              </select>
              <select v-model.number="filtroAnio" class="bg-indigo-800 text-white text-xs rounded px-1.5 py-0.5 border-none outline-none cursor-pointer">
                <option v-for="a in aniosDisponibles" :key="a" :value="a">{{ a }}</option>
              </select>
            </div>
          </div>
          
          <button @click="$emit('close')" class="p-1 hover:bg-indigo-500 rounded transition-colors text-white">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
  
        <div class="flex p-1 bg-indigo-700/50 rounded-lg mt-1">
          <button 
            @click="cambiarRol('analista')"
            class="flex-1 py-1 text-xs font-semibold rounded-md transition-all flex justify-center items-center gap-1.5"
            :class="rolActivo === 'analista' ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-100 hover:text-white'"
          >
            <span>📊</span> Analista
          </button>
          <button 
            @click="cambiarRol('auditor')"
            class="flex-1 py-1 text-xs font-semibold rounded-md transition-all flex justify-center items-center gap-1.5"
            :class="rolActivo === 'auditor' ? 'bg-white text-emerald-700 shadow-sm' : 'text-indigo-100 hover:text-white'"
          >
            <span>⚖️</span> Auditor
          </button>
        </div>
      </header>
  
      <div class="flex-1 p-4 overflow-y-auto bg-slate-50/80 flex flex-col gap-4" ref="chatContainer">
        <div class="flex flex-col max-w-[85%] self-start">
          <div class="bg-white border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-2xl rounded-tl-sm shadow-sm text-[13px] leading-relaxed">
            <span v-if="rolActivo === 'analista'">
              ¡Hola! Soy tu <strong>Analista Financiero</strong>. Estoy revisando el balance acumulado a <strong>{{ mesNombre(filtroMes) }} de {{ filtroAnio }}</strong>. ¿En qué te ayudo hoy?
            </span>
            <span v-else>
              Hola. Soy tu <strong>Auditor Contable</strong>. Estoy auditando el periodo <strong>{{ mesNombre(filtroMes) }} de {{ filtroAnio }}</strong>. Pregúntame sobre cuentas, saldos o normativas.
            </span>
          </div>
        </div>
  
        <div 
          v-for="(msg, index) in mensajes" 
          :key="index"
          class="flex flex-col max-w-[85%]"
          :class="msg.role === 'user' ? 'self-end' : 'self-start'"
        >
          <span class="text-[10px] text-slate-400 font-medium mb-1 px-1" :class="msg.role === 'user' ? 'text-right' : 'text-left'">
            {{ msg.role === 'user' ? 'Tú' : (rolActivo === 'analista' ? 'Analista IA' : 'Auditor IA') }}
          </span>
          <div 
            class="px-3.5 py-2.5 shadow-sm text-[13px] leading-relaxed overflow-x-auto"
            :class="[
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm markdown-body'
            ]"
            v-html="formatRespuesta(msg.content)"
          ></div>
        </div>
  
        <div v-if="cargando" class="flex flex-col max-w-[85%] self-start mt-1">
          <div class="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
            <div class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
            <div class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            <div class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
          </div>
        </div>
      </div>
  
      <div class="bg-white border-t border-slate-200 p-3">
        <form @submit.prevent="enviarMensaje" class="flex items-end gap-2 relative">
          <textarea 
            v-model="inputTexto"
            @keydown.enter.exact.prevent="enviarMensaje"
            rows="1"
            class="w-full bg-slate-100 border-transparent focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 rounded-xl pl-3 pr-10 py-2.5 text-[13px] resize-none outline-none transition-all"
            placeholder="Escribe tu consulta..."
          ></textarea>
          
          <button 
            type="submit" 
            :disabled="!inputTexto.trim() || cargando"
            class="absolute right-1.5 bottom-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg transition-colors flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
              <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
            </svg>
          </button>
        </form>
      </div>
  
    </div>
  </template>
  
  <script setup>
import { ref, nextTick } from 'vue';

const props = defineProps({
  empresa: { type: String, required: true }
});

const emit = defineEmits(['close']);

const rolActivo = ref('analista');
const mensajes = ref([]);
const inputTexto = ref('');
const cargando = ref(false);
const chatContainer = ref(null);

const aniosDisponibles = [2023, 2024, 2025, 2026];
const filtroAnio = ref(new Date().getFullYear());
const filtroMes = ref(12);

const mesNombre = (m) => ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][m - 1];

const chatApiBase = (import.meta.env.VITE_CHAT_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const cambiarRol = (nuevoRol) => {
  if (rolActivo.value !== nuevoRol) {
    rolActivo.value = nuevoRol;
    mensajes.value = []; 
  }
};

const scrollAlFinal = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

const formatRespuesta = (texto) => {
  if (!texto) return '';
  return texto
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
};

// --- FUNCIÓN ACTUALIZADA PARA STREAMING ---
const enviarMensaje = async () => {
  const texto = inputTexto.value.trim();
  if (!texto || cargando.value) return;

  // 1. Mostrar mensaje del usuario
  mensajes.value.push({ role: 'user', content: texto });
  inputTexto.value = '';
  cargando.value = true;
  scrollAlFinal();

  try {
    const response = await fetch(`${chatApiBase}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensaje: texto,
        rol: rolActivo.value,
        empresa: props.empresa,
        anio: filtroAnio.value,
        mes: filtroMes.value
      })
    });

    if (!response.ok) throw new Error(`Error: ${response.status}`);

    // 2. Preparamos la burbuja de la IA (vacía al inicio)
    cargando.value = false; // Quitamos la animación de "escribiendo..."
    mensajes.value.push({ role: 'assistant', content: '' });
    const indexIA = mensajes.value.length - 1; // Guardamos la posición de esta burbuja

    // 3. Leemos el texto en tiempo real (El efecto máquina de escribir)
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break; // Si terminó de hablar, salimos del ciclo
      
      // Decodificamos el pedacito de texto y lo sumamos a la burbuja
      const chunk = decoder.decode(value, { stream: true });
      mensajes.value[indexIA].content += chunk;
      
      // Hacemos scroll hacia abajo automáticamente mientras escribe
      scrollAlFinal();
    }

  } catch (error) {
    console.error("Error de conexión:", error);
    cargando.value = false;
    mensajes.value.push({ 
      role: 'assistant', 
      content: "⚠️ Hubo un problema conectando con el servidor." 
    });
  } finally {
    scrollAlFinal();
  }
};
</script>
  
  <style>
  .markdown-body ul { list-style-type: disc; margin-left: 1rem; margin-bottom: 0.5rem;}
  .markdown-body ol { list-style-type: decimal; margin-left: 1rem; margin-bottom: 0.5rem;}
  </style>