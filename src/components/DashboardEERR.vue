<template>
  <div class="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-800">
    <header class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">
          {{ tituloPrincipal }}
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          <template v-if="variant === 'flujo_caja'">
            Misma lógica y datos que el EERR (<code class="text-xs bg-slate-100 px-1 rounded">datos_vue.json</code>,
            <code class="text-xs bg-slate-100 px-1 rounded">mapeo_cuentas.json</code>) —
            {{ etiquetaEmpresas }}
          </template>
          <template v-else>
            Montos desde <code class="text-xs bg-slate-100 px-1 rounded">datos_vue.json</code>,
            categorías desde <code class="text-xs bg-slate-100 px-1 rounded">mapeo_cuentas.json</code>
            — {{ etiquetaEmpresas }}
          </template>
        </p>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex flex-wrap items-end gap-3">
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold uppercase text-slate-500">Empresas:</span>
          <div class="flex flex-wrap items-center gap-1.5 py-1">
            <button
              v-for="e in empresasConDatos"
              :key="e"
              type="button"
              :aria-pressed="empresasSel.includes(e)"
              :title="empresasSel.includes(e) && empresasSel.length === 1 ? 'Debe quedar al menos una empresa' : ''"
              :class="empresasSel.includes(e)
                ? 'rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white border border-indigo-600'
                : 'rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-300 hover:border-indigo-400 hover:text-indigo-700'"
              @click="toggleEmpresa(e)"
            >
              {{ e }}
            </button>
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase text-slate-500">Año Operativo:</label>
          <select
            v-model.number="filtroAnio"
            class="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          >
            <option v-for="a in aniosDisponibles" :key="a" :value="a">
              {{ a }}
            </option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-semibold uppercase text-slate-500">Tipo EERR:</label>
          <select
            v-model="tipoEerr"
            class="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          >
            <option value="financiero">Financiero</option>
            <option value="contable">Contable</option>
          </select>
        </div>
        <div ref="centrosDropdownRef" class="relative flex flex-col gap-1">
          <label for="eerr-centros-costo" class="text-xs font-semibold uppercase text-slate-500">Centros de costo:</label>
          <button
            id="eerr-centros-costo"
            type="button"
            class="flex min-w-[11rem] max-w-[16rem] items-center justify-between gap-2 border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white font-medium text-left focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            @click.stop="centrosDropdownAbierto = !centrosDropdownAbierto"
          >
            <span class="truncate">{{ textoResumenCentros }}</span>
            <span class="shrink-0 text-slate-400 text-xs" aria-hidden="true">▾</span>
          </button>

          <div
            v-if="centrosDropdownAbierto"
            class="absolute right-0 top-full z-40 mt-1 w-80 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1"
            @click.stop
          >
            <button
              type="button"
              class="w-full text-left text-xs px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="!centrosSeleccionados.length"
              @click="limpiarCentrosSeleccionados"
            >
              Limpiar todos (ver todos los centros)
            </button>
            <label
              v-for="cc in centrosDisponibles"
              :key="cc.codigo"
              class="flex items-start gap-2 px-3 py-2 text-xs hover:bg-indigo-50/60 cursor-pointer"
            >
              <input
                type="checkbox"
                class="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                :checked="centrosSeleccionados.includes(cc.codigo)"
                @change="toggleCentro(cc.codigo)"
              />
              <span class="leading-snug">
                <span class="font-mono text-indigo-700">{{ cc.codigo }}</span>
                <span class="text-slate-600"> — {{ cc.nombre }}</span>
              </span>
            </label>
            <p
              v-if="!centrosDisponibles.length"
              class="px-3 py-2 text-xs text-slate-400 italic"
            >
              Sin centros de costo en este año.
            </p>
          </div>
        </div>
      </div>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      <!-- Ingresos Acumulados (más ancha: trae el desglose de arriendos al costado) -->
      <div class="relative rounded-xl shadow-sm p-5 border-l-4 border-emerald-500 bg-emerald-50/70 border border-emerald-100 md:col-span-2 flex flex-col sm:flex-row gap-4">
        <button type="button" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-[10px] font-bold text-emerald-700 border border-emerald-300" title="¿Qué significa esta tarjeta?" @click="abrirInfo('ingresos')">i</button>
        <div class="flex-1 min-w-0">
          <p class="text-xs uppercase text-emerald-700 font-bold tracking-wider">Ingresos Acumulados</p>
          <p class="text-2xl font-bold text-emerald-900 mt-1">{{ formatCLP(kpis.ingresos) }}</p>
          <p class="text-[11px] mt-1 text-emerald-700/80">Año Anterior: {{ formatCLP(kpisAnioAnterior.ingresos) }}</p>
          <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpi('ingresos')">{{ textoVariacionKpi('ingresos') }}</p>
          <p class="text-[11px] mt-1 text-emerald-700/80">Acum. Año Anterior: {{ formatCLP(kpisAnioAnteriorAcum.ingresos) }}</p>
          <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpiAcumulada('ingresos')">{{ textoVariacionKpiAcumulada('ingresos') }}</p>
          <p class="text-[11px] mt-2 text-emerald-700/80">Ingresos de Explotación + Ingresos Financieros</p>
        </div>
        <div class="w-full h-px sm:w-px sm:h-auto bg-emerald-200 shrink-0"></div>
        <div class="flex-1 min-w-0 flex flex-col justify-center gap-2.5">
          <p class="text-[10px] uppercase font-bold tracking-wider text-emerald-700">Arriendos</p>
          <div v-for="tipo in [{ clave: 'fijo', etiqueta: 'Arriendo Fijo' }, { clave: 'variable', etiqueta: 'Arriendo Variable' }]" :key="tipo.clave">
            <p class="text-[11px] font-semibold text-emerald-900">{{ tipo.etiqueta }}</p>
            <p class="text-sm font-bold text-emerald-900">{{ formatCLP(arriendosDesglose.actual[tipo.clave]) }}</p>
            <p class="text-[10px] text-emerald-700/80">Año Anterior: {{ formatCLP(arriendosDesglose.anterior[tipo.clave]) }}</p>
            <p class="text-[10px] font-semibold" :class="claseVariacionArriendo(tipo.clave)">{{ textoVariacionArriendo(tipo.clave) }}</p>
            <p class="text-[10px] text-emerald-700/80">Acum. Año Anterior: {{ formatCLP(arriendosDesglose.anteriorAcum[tipo.clave]) }}</p>
            <p class="text-[10px] font-semibold" :class="claseVariacionArriendoAcumulada(tipo.clave)">{{ textoVariacionArriendoAcumulada(tipo.clave) }}</p>
          </div>
        </div>
      </div>
       <!-- Ingresos Financieros -->
       <div class="relative rounded-xl shadow-sm p-5 border-l-4 border border-cyan-100" :class="kpis.ingresosFinancieros >= 0 ? 'border-cyan-500 bg-cyan-50/80' : 'border-rose-500 bg-rose-50/80'">
        <button type="button" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-[10px] font-bold border" :class="kpis.ingresosFinancieros >= 0 ? 'text-cyan-700 border-cyan-300' : 'text-rose-700 border-rose-300'" title="¿Qué significa esta tarjeta?" @click="abrirInfo('ingresosFinancieros')">i</button>
        <p class="text-xs uppercase font-bold tracking-wider" :class="kpis.ingresosFinancieros >= 0 ? 'text-cyan-700' : 'text-rose-700'">Ingresos Financieros</p>
        <p class="text-2xl font-bold mt-1" :class="kpis.ingresosFinancieros >= 0 ? 'text-cyan-900' : 'text-rose-800'">
          {{ formatCLP(kpis.ingresosFinancieros) }}
        </p>
        <p class="text-[11px] mt-1" :class="kpis.ingresosFinancieros >= 0 ? 'text-cyan-700/80' : 'text-rose-700/80'">
          Año Anterior: {{ formatCLP(kpisAnioAnterior.ingresosFinancieros) }}
        </p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpi('ingresosFinancieros')">{{ textoVariacionKpi('ingresosFinancieros') }}</p>
        <p class="text-[11px] mt-1" :class="kpis.ingresosFinancieros >= 0 ? 'text-cyan-700/80' : 'text-rose-700/80'">
          Acum. Año Anterior: {{ formatCLP(kpisAnioAnteriorAcum.ingresosFinancieros) }}
        </p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpiAcumulada('ingresosFinancieros')">{{ textoVariacionKpiAcumulada('ingresosFinancieros') }}</p>
        <p class="text-[11px] mt-2" :class="kpis.ingresosFinancieros >= 0 ? 'text-cyan-700/80' : 'text-rose-700/80'">
          Suma de la categoría Ingresos Financieros
        </p>
      </div>
      <!-- Gastos Acumulados -->
      <div class="relative rounded-xl shadow-sm p-5 border-l-4 border-rose-500 bg-rose-50/70 border border-rose-100">
        <button type="button" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-[10px] font-bold text-rose-700 border border-rose-300" title="¿Qué significa esta tarjeta?" @click="abrirInfo('gastos')">i</button>
        <p class="text-xs uppercase text-rose-700 font-bold tracking-wider">Gastos Acumulados</p>
        <p class="text-2xl font-bold text-rose-900 mt-1">{{ formatCLP(kpis.gastos) }}</p>
        <p class="text-[11px] mt-1 text-rose-700/80">Año Anterior: {{ formatCLP(kpisAnioAnterior.gastos) }}</p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpi('gastos')">{{ textoVariacionKpi('gastos') }}</p>
        <p class="text-[11px] mt-1 text-rose-700/80">Acum. Año Anterior: {{ formatCLP(kpisAnioAnteriorAcum.gastos) }}</p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpiAcumulada('gastos')">{{ textoVariacionKpiAcumulada('gastos') }}</p>
        <p class="text-[11px] mt-2 text-rose-700/80">Resultado − Ingresos</p>
      </div>
      <!-- EBITDA -->
      <div class="relative rounded-xl shadow-md p-5 border-l-4 border border-purple-100" :class="kpis.ebitda >= 0 ? 'border-purple-600 bg-purple-50/80' : 'border-orange-500 bg-orange-50/80'">
        <button type="button" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-[10px] font-bold border" :class="kpis.ebitda >= 0 ? 'text-purple-700 border-purple-300' : 'text-orange-700 border-orange-300'" title="¿Qué significa esta tarjeta?" @click="abrirInfo('ebitda')">i</button>
        <p class="text-xs uppercase font-bold tracking-wider" :class="kpis.ebitda >= 0 ? 'text-purple-700' : 'text-orange-700'">EBITDA</p>
        <p class="text-2xl font-bold mt-1" :class="kpis.ebitda >= 0 ? 'text-purple-900' : 'text-orange-800'">
          {{ formatCLP(kpis.ebitda) }}
        </p>
        <p class="text-[11px] mt-1" :class="kpis.ebitda >= 0 ? 'text-purple-700/80' : 'text-orange-700/80'">
          Año Anterior: {{ formatCLP(kpisAnioAnterior.ebitda) }}
        </p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpi('ebitda')">{{ textoVariacionKpi('ebitda') }}</p>
        <p class="text-[11px] mt-1" :class="kpis.ebitda >= 0 ? 'text-purple-700/80' : 'text-orange-700/80'">
          Acum. Año Anterior: {{ formatCLP(kpisAnioAnteriorAcum.ebitda) }}
        </p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpiAcumulada('ebitda')">{{ textoVariacionKpiAcumulada('ebitda') }}</p>
        <p class="text-[11px] mt-2" :class="kpis.ebitda >= 0 ? 'text-purple-700/80' : 'text-orange-700/80'">
          Ingresos de Explotación + Ingresos Financieros + Gastos de Administración y Ventas
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <!-- Margen Bruto -->
      <div class="relative rounded-xl shadow-sm p-5 border-l-4 border-teal-500 bg-teal-50/70 border border-teal-100">
        <button type="button" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-[10px] font-bold text-teal-700 border border-teal-300" title="¿Qué significa esta tarjeta?" @click="abrirInfo('margenBruto')">i</button>
        <p class="text-xs uppercase text-teal-700 font-bold tracking-wider">Margen Bruto</p>
        <p class="text-2xl font-bold text-teal-900 mt-1">{{ formatCLP(kpis.margenBruto) }}</p>
        <p class="text-[11px] mt-1 text-teal-700/80">Año Anterior: {{ formatCLP(kpisAnioAnterior.margenBruto) }}</p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpi('margenBruto')">{{ textoVariacionKpi('margenBruto') }}</p>
        <p class="text-[11px] mt-1 text-teal-700/80">Acum. Año Anterior: {{ formatCLP(kpisAnioAnteriorAcum.margenBruto) }}</p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpiAcumulada('margenBruto')">{{ textoVariacionKpiAcumulada('margenBruto') }}</p>
        <p class="text-[11px] mt-2 text-teal-700/80">Ingresos de Explotación + (Gastos de Administración y Ventas − Remuneraciones)</p>
      </div>
      <!-- Contribuciones -->
      <div class="relative rounded-xl shadow-sm p-5 border-l-4 border-fuchsia-500 bg-fuchsia-50/70 border border-fuchsia-100">
        <button type="button" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-[10px] font-bold text-fuchsia-700 border border-fuchsia-300" title="¿Qué significa esta tarjeta?" @click="abrirInfo('contribuciones')">i</button>
        <p class="text-xs uppercase text-fuchsia-700 font-bold tracking-wider">Contribuciones</p>
        <p class="text-2xl font-bold text-fuchsia-900 mt-1">{{ formatCLP(kpis.contribuciones) }}</p>
        <p class="text-[11px] mt-1 text-fuchsia-700/80">Año Anterior: {{ formatCLP(kpisAnioAnterior.contribuciones) }}</p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpi('contribuciones')">{{ textoVariacionKpi('contribuciones') }}</p>
        <p class="text-[11px] mt-1 text-fuchsia-700/80">Acum. Año Anterior: {{ formatCLP(kpisAnioAnteriorAcum.contribuciones) }}</p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpiAcumulada('contribuciones')">{{ textoVariacionKpiAcumulada('contribuciones') }}</p>
        <p v-if="sobretasaAnio" class="text-[11px] mt-1 text-fuchsia-700/80">Sobretasa (aparte): <span class="font-semibold">{{ formatCLP(sobretasaAnio) }}</span></p>
        <p class="text-[11px] mt-2 text-fuchsia-700/80">Suma del subítem Impuestos y Contribuciones, sin sobretasa</p>
      </div>
      <!-- Patente Municipal -->
      <div class="relative rounded-xl shadow-sm p-5 border-l-4 border border-amber-100" :class="kpis.patenteMunicipal >= 0 ? 'border-amber-500 bg-amber-50/80' : 'border-orange-500 bg-orange-50/80'">
        <button type="button" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-[10px] font-bold border" :class="kpis.patenteMunicipal >= 0 ? 'text-amber-700 border-amber-300' : 'text-orange-700 border-orange-300'" title="¿Qué significa esta tarjeta?" @click="abrirInfo('patenteMunicipal')">i</button>
        <p class="text-xs uppercase font-bold tracking-wider" :class="kpis.patenteMunicipal >= 0 ? 'text-amber-700' : 'text-orange-700'">Patente Municipal</p>
        <p class="text-2xl font-bold mt-1" :class="kpis.patenteMunicipal >= 0 ? 'text-amber-900' : 'text-orange-800'">
          {{ formatCLP(kpis.patenteMunicipal) }}
        </p>
        <p class="text-[11px] mt-1" :class="kpis.patenteMunicipal >= 0 ? 'text-amber-700/80' : 'text-orange-700/80'">
          Año Anterior: {{ formatCLP(kpisAnioAnterior.patenteMunicipal) }}
        </p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpi('patenteMunicipal')">{{ textoVariacionKpi('patenteMunicipal') }}</p>
        <p class="text-[11px] mt-1" :class="kpis.patenteMunicipal >= 0 ? 'text-amber-700/80' : 'text-orange-700/80'">
          Acum. Año Anterior: {{ formatCLP(kpisAnioAnteriorAcum.patenteMunicipal) }}
        </p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpiAcumulada('patenteMunicipal')">{{ textoVariacionKpiAcumulada('patenteMunicipal') }}</p>
        <p v-if="!kpis.patenteMunicipal" class="text-[11px] mt-1 font-semibold text-amber-800">
          Sin pagos registrados en Softland en {{ filtroAnio }}: pendiente de pago
        </p>
        <p class="text-[11px] mt-2" :class="kpis.patenteMunicipal >= 0 ? 'text-amber-700/80' : 'text-orange-700/80'">
          Suma del subítem Patentes
        </p>
      </div>
      <!-- Resultado antes de impuestos -->
      <div class="relative rounded-xl shadow-md p-5 border-l-4 border" :class="kpis.resultado >= 0 ? 'bg-emerald-950 border-emerald-500' : 'bg-rose-950 border-rose-500'">
        <button type="button" class="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[10px] font-bold border" :class="kpis.resultado >= 0 ? 'text-emerald-200 border-emerald-400/50' : 'text-rose-200 border-rose-400/50'" title="¿Qué significa esta tarjeta?" @click="abrirInfo('resultado')">i</button>
        <p class="text-xs uppercase font-bold tracking-wider" :class="kpis.resultado >= 0 ? 'text-emerald-200' : 'text-rose-200'">Resultado antes de impuestos</p>
        <p class="text-2xl font-bold mt-1" :class="kpis.resultado >= 0 ? 'text-emerald-100' : 'text-rose-100'">
          {{ formatCLP(kpis.resultado) }}
        </p>
        <p class="text-[11px] mt-1" :class="kpis.resultado >= 0 ? 'text-emerald-300/80' : 'text-rose-300/80'">
          Año Anterior: {{ formatCLP(kpisAnioAnterior.resultado) }}
        </p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpi('resultado', true)">{{ textoVariacionKpi('resultado') }}</p>
        <p class="text-[11px] mt-1" :class="kpis.resultado >= 0 ? 'text-emerald-300/80' : 'text-rose-300/80'">
          Acum. Año Anterior: {{ formatCLP(kpisAnioAnteriorAcum.resultado) }}
        </p>
        <p class="text-[11px] font-semibold mt-0.5" :class="claseVariacionKpiAcumulada('resultado', true)">{{ textoVariacionKpiAcumulada('resultado') }}</p>
        <p v-if="valorizacionInversiones" class="text-[11px] mt-1" :class="kpis.resultado >= 0 ? 'text-emerald-300/80' : 'text-rose-300/80'">
          Sin valorización de inversiones: <span class="font-semibold">{{ formatCLP(kpis.resultado - valorizacionInversiones) }}</span>
        </p>
        <p class="text-[11px] mt-2" :class="kpis.resultado >= 0 ? 'text-emerald-300/80' : 'text-rose-300/80'">
          Suma del saldo neto de todas las categorías, sin impuesto a la renta
        </p>
      </div>
    </div>

    <!-- Diálogo de información: una sola instancia compartida por todas las tarjetas -->
    <div v-if="infoAbierto" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="cerrarInfo">
      <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
        <button type="button" class="absolute top-3 right-3 text-slate-400 hover:text-slate-600 text-lg leading-none" title="Cerrar" @click="cerrarInfo">✕</button>
        <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2 pr-6">{{ EXPLICACIONES[infoAbierto]?.titulo }}</h3>
        <p class="text-sm text-slate-600 leading-relaxed">{{ EXPLICACIONES[infoAbierto]?.texto }}</p>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div class="px-5 py-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wide">
          Matriz {{ tipoEerr === "financiero" ? "Financiera" : "Contable" }} {{ filtroAnio }}
          <span v-if="centrosSeleccionados.length" class="normal-case text-indigo-600 font-semibold">
            · {{ textoResumenCentros }}
          </span>
        </h2>
        <div class="flex flex-col items-end gap-2">
          <span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-semibold">
            Niveles: Categoría ▾ Subítem ▾ Cuenta ▾ Centro ▾ Proveedor ▾ Documento
          </span>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
            @click="descargarMatrizEerrExcel"
          >
            Descargar Excel
          </button>
        </div>
      </div>

      <p v-if="avisoMeses" class="px-5 py-2 text-[11px] text-amber-800 bg-amber-50 border-b border-amber-100">
        {{ avisoMeses }}
      </p>
      <div class="overflow-x-auto max-h-[65vh]">
        <table class="min-w-[1400px] w-full text-xs border-collapse">
          <thead class="sticky top-0 z-20 bg-slate-100 shadow-sm">
            <tr class="border-b border-slate-300 text-slate-700">
              <th class="px-4 py-3 text-left font-bold min-w-[24rem]">Estructura de Cuentas</th>
              <th class="px-4 py-3 text-right font-bold min-w-[8rem] bg-slate-200/50">TOTAL</th>
              <th v-for="m in 12" :key="m" class="px-2 py-3 text-right font-bold min-w-[6.5rem]" :title="tituloEstadoMes(m)">
                {{ mesNombre(m) }}
                <span v-if="estadoMes(m)" class="block text-[9px] font-semibold uppercase tracking-wide text-amber-700">{{ estadoMes(m) }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="grupo in matrizContable" :key="grupo.key">
              
              <tr :class="`border-y ${grupo.config.colorHeader} sticky top-[41px] z-10 shadow-sm`">
                <td class="px-4 py-2.5 font-bold text-slate-900 text-[13px] uppercase tracking-wide">{{ grupo.config.label }}</td>
                <td class="px-4 py-2.5 text-right font-mono font-bold bg-white/30" :class="grupo.total < 0 ? 'text-rose-700' : 'text-slate-900'">
                  {{ formatCLPContable(grupo.total) }}
                </td>
                <td v-for="m in 12" :key="'g-' + m" class="px-2 py-2.5 text-right font-mono font-bold" :class="[
                  grupo.mensual[m] < 0 ? 'text-rose-700' : 'text-slate-800',
                  claseVariacionRealMensual(grupo.key, grupo.mensual[m], valorMesAnterior(m, grupo.mensual, 'grupos', grupo.key), filtroAnio, m)
                ]">
                  {{ formatCLPContable(grupo.mensual[m]) }}
                </td>
              </tr>

              <template v-for="subitem in grupo.subitems" :key="subitem.key">
                <tr class="border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors bg-white" @click="toggleFila(subitem.key)">
                  <td class="px-4 py-2 pl-8 font-semibold text-slate-800 flex items-center gap-2">
                    <span class="text-indigo-500 text-lg leading-none w-4">{{ filasAbiertas[subitem.key] ? "▾" : "▸" }}</span>
                    <span class="capitalize">{{ formatearNombre(subitem.nombreOriginal) }}</span>
                  </td>
                  <td class="px-4 py-2 text-right font-mono font-bold bg-slate-50/50" :class="subitem.total < 0 ? 'text-rose-700' : 'text-slate-800'">
                    {{ formatCLPContable(subitem.total) }}
                  </td>
                  <td v-for="m in 12" :key="'s-' + m" class="px-2 py-2 text-right font-mono text-slate-700 font-medium" :class="[
                    subitem.mensual[m] < 0 ? 'text-rose-600' : '',
                    claseVariacionRealMensual(grupo.key, subitem.mensual[m], valorMesAnterior(m, subitem.mensual, 'subitems', subitem.key), filtroAnio, m)
                  ]">
                    {{ formatCLPContable(subitem.mensual[m]) }}
                  </td>
                </tr>

                <template v-if="filasAbiertas[subitem.key]">
                  <template v-for="cuenta in subitem.cuentas" :key="cuenta.key">
                    
                    <tr class="border-b border-slate-100 cursor-pointer hover:bg-indigo-50/30 transition-colors bg-slate-50/50" @click="toggleFila(subitem.key + '-' + cuenta.key)">
                      <td class="px-4 py-1.5 pl-14 font-medium text-slate-700 flex items-center gap-2">
                        <span class="text-slate-400 text-lg leading-none w-4">{{ filasAbiertas[subitem.key + '-' + cuenta.key] ? "▾" : "▸" }}</span>
                        <span class="text-indigo-600 font-mono">{{ cuenta.codigo }}</span>
                        <span class="truncate max-w-[15rem]">{{ cuenta.nombre }}</span>
                      </td>
                      <td class="px-4 py-1.5 text-right font-mono font-semibold bg-slate-100/50 text-[11px]" :class="cuenta.total < 0 ? 'text-rose-600' : 'text-slate-700'">
                        {{ formatCLPContable(cuenta.total) }}
                      </td>
                      <td v-for="m in 12" :key="'c-' + m" class="px-2 py-1.5 text-right font-mono text-slate-600 text-[11px]" :class="[
                        cuenta.mensual[m] < 0 ? 'text-rose-500' : '',
                        claseVariacionRealMensual(grupo.key, cuenta.mensual[m], valorMesAnterior(m, cuenta.mensual, 'cuentas', `${subitem.key}-${cuenta.key}`), filtroAnio, m)
                      ]">
                        {{ formatCLPContable(cuenta.mensual[m]) }}
                      </td>
                    </tr>

                    <template v-if="filasAbiertas[subitem.key + '-' + cuenta.key]">
                      <template v-for="cc in cuenta.centros" :key="cc.key">
                      <tr
                        class="border-b border-slate-50 hover:bg-slate-100 transition-colors bg-white"
                        :class="tieneDetalle(cuenta.codigo, cc.codigo, subitem.nombreOriginal) ? 'cursor-pointer' : ''"
                        @click="tieneDetalle(cuenta.codigo, cc.codigo, subitem.nombreOriginal) && toggleFila(claveCentro(subitem.key, cuenta.key, cc.key))"
                      >
                        <td class="px-4 py-1 pl-[5.5rem] text-slate-500 text-[11px] flex items-center gap-1.5">
                          <span v-if="tieneDetalle(cuenta.codigo, cc.codigo, subitem.nombreOriginal)" class="text-slate-400 text-base leading-none w-3">{{ filasAbiertas[claveCentro(subitem.key, cuenta.key, cc.key)] ? "▾" : "▸" }}</span>
                          <span v-else class="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span class="font-mono text-slate-400">{{ cc.codigo === '000' ? '' : cc.codigo }}</span>
                          <span class="truncate max-w-[14rem]">{{ cc.codigo === '000' ? 'Sin Centro de Costo' : cc.nombre }}</span>
                        </td>
                        <td class="px-4 py-1 text-right font-mono font-medium text-slate-500 bg-white text-[11px]" :class="cc.total < 0 ? 'text-rose-500' : ''">
                          {{ formatCLPContable(cc.total) }}
                        </td>
                        <td v-for="m in 12" :key="'cc-' + m" class="px-2 py-1 text-right font-mono text-slate-400 text-[11px]" :class="[
                          cc.mensual[m] < 0 ? 'text-rose-400' : '',
                          claseVariacionRealMensual(grupo.key, cc.mensual[m], valorMesAnterior(m, cc.mensual, 'centros', `${subitem.key}-${cuenta.key}-${cc.key}`), filtroAnio, m)
                        ]">
                          {{ formatCLPContable(cc.mensual[m]) }}
                        </td>
                      </tr>

                      <!-- NIVEL 5: PROVEEDOR (Entidad del detalle Softland) -->
                      <template v-if="filasAbiertas[claveCentro(subitem.key, cuenta.key, cc.key)]">
                        <template v-for="prov in nodosProveedor(cuenta.codigo, cc.codigo, subitem.nombreOriginal)" :key="prov.key">
                          <tr
                            class="border-b border-slate-50 bg-indigo-50/20 hover:bg-indigo-50/50 cursor-pointer transition-colors"
                            @click="toggleFila(claveProv(subitem.key, cuenta.key, cc.key, prov.key))"
                          >
                            <td class="px-4 py-1 pl-[7rem] text-[11px] flex items-center gap-1.5">
                              <span class="text-indigo-400 text-base leading-none w-3">{{ filasAbiertas[claveProv(subitem.key, cuenta.key, cc.key, prov.key)] ? "▾" : "▸" }}</span>
                              <span class="truncate max-w-[16rem] text-slate-600 font-medium" :title="prov.nombre">{{ prov.nombre }}</span>
                              <span class="text-slate-400 shrink-0">· {{ prov.documentos.length }} doc</span>
                            </td>
                            <td class="px-4 py-1 text-right font-mono font-semibold text-[11px] bg-indigo-50/40" :class="prov.total < 0 ? 'text-rose-500' : 'text-slate-600'">
                              {{ formatCLPContable(prov.total) }}
                            </td>
                            <td v-for="m in 12" :key="'pv-' + m" class="px-2 py-1 text-right font-mono text-[11px]" :class="prov.mensual[m] < 0 ? 'text-rose-400' : 'text-slate-500'">
                              {{ formatCLPContable(prov.mensual[m]) }}
                            </td>
                          </tr>

                          <!-- NIVEL 6: DOCUMENTO (línea real de Softland) -->
                          <template v-if="filasAbiertas[claveProv(subitem.key, cuenta.key, cc.key, prov.key)]">
                            <tr v-for="doc in prov.documentos" :key="doc.key" class="border-b border-slate-50 bg-white hover:bg-slate-50">
                              <td class="px-4 py-1 pl-[9rem] text-[10px] text-slate-500 flex items-center gap-1.5">
                                <span class="w-1 h-1 rounded-full bg-indigo-200 shrink-0"></span>
                                <span v-if="doc.doc" class="font-mono text-indigo-500 shrink-0">{{ doc.doc }}</span>
                                <span class="truncate max-w-[18rem]" :title="doc.glosa">{{ doc.glosaLimpia }}</span>
                                <span v-if="doc.fecha" class="text-slate-300 shrink-0">· {{ doc.fecha }}</span>
                              </td>
                              <td class="px-4 py-1 text-right font-mono text-[10px] text-slate-500" :class="doc.total < 0 ? 'text-rose-400' : ''">
                                {{ formatCLPContable(doc.total) }}
                              </td>
                              <td v-for="m in 12" :key="'dc-' + m" class="px-2 py-1 text-right font-mono text-[10px]" :class="doc.mensual[m] < 0 ? 'text-rose-300' : 'text-slate-400'">
                                {{ formatCLPContable(doc.mensual[m]) }}
                              </td>
                            </tr>
                          </template>
                        </template>
                      </template>
                      </template>
                    </template>

                  </template>
                </template>
                
              </template>
            </template>
          </tbody>
        </table>
      </div>
      <div class="px-5 py-3 border-t border-slate-100 bg-slate-50/70">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-2">
          Criterio de comparacion real mensual (ajustado por IPC)
        </p>
        <div class="flex flex-wrap gap-2 text-[11px]">
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            Ingresos: mejora real / Gastos: disminucion considerable
          </span>
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-100">
            <span class="w-2 h-2 rounded-full bg-rose-400"></span>
            Ingresos: caida real / Gastos: aumento considerable
          </span>
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-white text-slate-600 border border-slate-200">
            <span class="w-2 h-2 rounded-full bg-slate-300"></span>
            Sin color: variacion dentro de umbral o sin comparacion
          </span>
        </div>
        <p class="text-[10px] text-slate-500 mt-2">
          Referencia: mes anterior ajustado por inflacion mensual (IPC).
        </p>
      </div>
    </div>

    <!-- RESULTADO DEL EJERCICIO POR PERIODO: mes a mes, mismas cuentas de la matriz -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div class="px-5 py-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wide">
          Resultado del Ejercicio por Periodo {{ filtroAnio }}
          <span v-if="centrosSeleccionados.length" class="normal-case text-indigo-600 font-semibold">
            · {{ textoResumenCentros }}
          </span>
        </h2>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-semibold">
            Mismas cuentas de la matriz {{ tipoEerr === "financiero" ? "financiera" : "contable" }}
          </span>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
            title="Resultado del Ejercicio por periodo, carta horizontal"
            @click="descargarPeriodos('pdf')"
          >
            Descargar PDF
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
            title="Resultado del Ejercicio por periodo, carta horizontal"
            @click="descargarPeriodos('excel')"
          >
            Descargar Excel
          </button>
        </div>
      </div>

      <div class="overflow-x-auto px-5 pt-4">
        <table class="min-w-[1100px] w-full text-xs border-collapse">
          <thead>
            <tr class="border-b border-slate-300 text-slate-700 bg-slate-100">
              <th class="w-6 pl-3 pr-0 py-2 text-center font-bold" aria-label="Signo"></th>
              <th class="px-3 py-2 text-left font-bold min-w-[18rem]">Concepto</th>
              <th class="px-3 py-2 text-right font-bold min-w-[7rem] bg-slate-200/60">TOTAL</th>
              <th v-for="m in 12" :key="'rm-h-' + m" class="px-2 py-2 text-right font-bold min-w-[5.5rem]">
                {{ mesNombreAbrev(m) }}
                <span v-if="estadoMes(m)" class="block text-[9px] font-semibold uppercase tracking-wide text-amber-700" :title="tituloEstadoMes(m)">{{ estadoMes(m) }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fila in resumenResultadoMensual" :key="'rm-' + fila.label" class="border-b border-slate-100" :class="claseFilaResumen(fila.tipo)">
              <td class="w-6 pl-3 pr-0 py-1.5 text-center font-mono font-bold text-slate-500">{{ fila.signo }}</td>
              <td class="px-3 py-1.5">{{ fila.label }}</td>
              <td class="px-3 py-1.5 text-right font-mono font-bold bg-slate-50/60" :class="fila.total < 0 ? 'text-rose-700' : ''">
                {{ formatCLPContable(fila.total) }}
              </td>
              <td v-for="m in 12" :key="'rm-' + fila.label + '-' + m" class="px-2 py-1.5 text-right font-mono"
                :class="Number(fila.mensual[m]) < 0 ? 'text-rose-600' : ''">
                {{ formatCLPContable(fila.mensual[m]) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="px-5 py-3 mt-4 border-t border-slate-100 bg-slate-50/70">
        <p class="text-[10px] text-slate-500">
          {{ notaResultadoPeriodo }}
        </p>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div class="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
        <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wide">
          Cuentas No Clasificadas 4 y 5 EERR {{ filtroAnio }}
        </h2>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
          @click="descargarNoClasificadas45Excel"
        >
          Descargar Excel
        </button>
      </div>
      <div class="overflow-x-auto max-h-[45vh]">
        <table class="min-w-[1400px] w-full text-xs border-collapse">
          <thead class="sticky top-0 z-10 bg-slate-100">
            <tr class="border-b border-slate-300 text-slate-700">
              <th class="px-4 py-3 text-left font-bold min-w-[24rem]">Cuenta</th>
              <th class="px-4 py-3 text-right font-bold min-w-[8rem] bg-slate-200/50">TOTAL</th>
              <th v-for="m in 12" :key="'nc-h-' + m" class="px-2 py-3 text-right font-bold min-w-[6.5rem]">
                {{ mesNombre(m) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="grupo in matrizNoClasificadas45" :key="'ncg-' + grupo.key">
              <tr class="border-y bg-slate-200/70 border-slate-300">
                <td class="px-4 py-2.5 font-bold text-slate-900 uppercase tracking-wide">
                  {{ grupo.nombre }}
                </td>
                <td class="px-4 py-2.5 text-right font-mono font-bold text-slate-900 bg-white/40">
                  {{ formatCLPContable(grupo.total) }}
                </td>
                <td v-for="m in 12" :key="'ncg-m-' + grupo.key + '-' + m" class="px-2 py-2.5 text-right font-mono font-bold text-slate-800">
                  {{ formatCLPContable(grupo.mensual[m]) }}
                </td>
              </tr>

              <tr v-for="cuenta in grupo.cuentas" :key="'nc-' + grupo.key + '-' + cuenta.key" class="border-b border-slate-100 bg-white">
                <td class="px-4 py-2 text-slate-700">
                  <span class="font-mono text-indigo-600">{{ cuenta.codigo }}</span>
                  <span class="mx-2 text-slate-400">-</span>
                  <span>{{ cuenta.nombre }}</span>
                </td>
                <td class="px-4 py-2 text-right font-mono font-semibold text-slate-800">
                  {{ formatCLPContable(cuenta.total) }}
                </td>
                <td v-for="m in 12" :key="'nc-' + grupo.key + '-' + cuenta.key + '-' + m" class="px-2 py-2 text-right font-mono text-slate-700">
                  {{ formatCLPContable(cuenta.mensual[m]) }}
                </td>
              </tr>

              <tr class="bg-slate-50 border-b border-slate-300">
                <td class="px-4 py-2 font-bold text-slate-800">
                  Subtotal {{ grupo.nombre }}
                </td>
                <td class="px-4 py-2 text-right font-mono font-bold text-slate-900">
                  {{ formatCLPContable(grupo.total) }}
                </td>
                <td v-for="m in 12" :key="'ncs-m-' + grupo.key + '-' + m" class="px-2 py-2 text-right font-mono font-bold text-slate-800">
                  {{ formatCLPContable(grupo.mensual[m]) }}
                </td>
              </tr>
            </template>

            <tr class="bg-slate-100 border-t-2 border-slate-400" v-if="matrizNoClasificadas45.length">
              <td class="px-4 py-2.5 font-bold text-slate-900 uppercase tracking-wide">
                Total General
              </td>
              <td class="px-4 py-2.5 text-right font-mono font-bold text-slate-900 bg-white/50">
                {{ formatCLPContable(totalNoClasificadas45.total) }}
              </td>
              <td v-for="m in 12" :key="'nct-m-' + m" class="px-2 py-2.5 text-right font-mono font-bold text-slate-900">
                {{ formatCLPContable(totalNoClasificadas45.mensual[m]) }}
              </td>
            </tr>

            <tr v-if="!hayNoClasificadas45">
              <td colspan="14" class="px-4 py-4 text-center text-slate-500">
                No hay cuentas no clasificadas que comiencen con 4 o 5 para este año.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div class="px-5 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wide">
            EBITDA Mensual {{ filtroAnio }}
          </h2>
          <p class="text-[11px] text-slate-500 mt-1">
            Barras: monto mensual · Línea: variación % respecto al mes anterior (enero compara con diciembre {{ filtroAnio - 1 }})
          </p>
        </div>
        <p class="text-xs font-mono font-semibold text-slate-700 shrink-0">
          Total año: <span :class="ebitdaAnual < 0 ? 'text-rose-600' : 'text-slate-900'">{{ formatCLPContable(ebitdaAnual) }}</span>
        </p>
      </div>
      <div class="p-4 pt-2">
        <VueApexCharts
          type="line"
          height="380"
          :options="chartOptionsEbitdaMixto"
          :series="chartSeriesEbitdaMixto"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 bg-white rounded-xl shadow-sm p-5 border border-slate-200">
        <h2 class="font-bold text-slate-800 mb-4">Evolución Ingresos vs Gastos</h2>
        <VueApexCharts type="bar" height="300" :options="chartOptionsBarras" :series="chartSeriesBarras" />
      </div>
      <div class="bg-white rounded-xl shadow-sm p-5 border border-slate-200">
        <h2 class="font-bold text-slate-800 mb-4">Distribución del Gasto</h2>
        <p class="text-xs text-slate-500 mb-3">
          Gastos de administración y ventas por subítem (magnitud en valor absoluto).
        </p>
        <div v-if="gastoAdmDistribucion.entries.length" class="min-h-[300px]">
          <VueApexCharts type="donut" height="300" :options="chartOptionsDonut" :series="chartSeriesDonut" />
        </div>
        <div
          v-else
          class="flex items-center justify-center h-[300px] rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 text-center px-4"
        >
          No hay datos de gasto adm. / ventas para este año y tipo EERR.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import VueApexCharts from "vue3-apexcharts";
import * as XLSX from "xlsx";
import eerrDataRaw from "../assets/datos_vue.json";
import detalleMovimientos from "../assets/detalle_movimientos.json";
import mapeoCuentas from "../assets/config/mapeo_cuentas.json";
import macroData from "../assets/config/macro.json";
import {
  calcularKpisDesdeRows,
  normAnio,
  normMes,
  normCodigoCentro,
  mapearDatosAnioEerr,
  filtrarFilasPorCentros,
  filtrarFilasPorRangoMes,
} from "../utils/kpiEerr.js";
import { BLOQUES_FINANCIEROS, construirMatrizContableEerr } from "../utils/eerrMatriz.js";
import { EMPRESAS } from "../utils/empresas.js";
import { descargarPeriodosPdf, descargarPeriodosExcel } from "../utils/periodoEerrDescargas.js";

const props = defineProps({
  empresa: { type: String, required: true },
  variant: {
    type: String,
    default: "eerr",
    validator: (v) => ["eerr", "flujo_caja"].includes(v),
  },
});

const tituloPrincipal = computed(() =>
  props.variant === "flujo_caja" ? "Flujo de caja" : "Estado de Resultados EERR"
);

const filtroAnio = ref(new Date().getFullYear());
const tipoEerr = ref("financiero");
const centrosSeleccionados = ref([]);
const centrosDropdownAbierto = ref(false);
const centrosDropdownRef = ref(null);
const filasAbiertas = ref({});

const textoResumenCentros = computed(() => {
  if (!centrosSeleccionados.value.length) return "Todos los centros de costo";
  if (centrosSeleccionados.value.length === 1) {
    const cc = centrosDisponibles.value.find((c) => c.codigo === centrosSeleccionados.value[0]);
    if (!cc) return "1 centro seleccionado";
    return cc.codigo === "000" ? "000 — Sin centro de costo" : `${cc.codigo} — ${cc.nombre}`;
  }
  return `${centrosSeleccionados.value.length} centros seleccionados`;
});

function toggleCentro(codigo) {
  const idx = centrosSeleccionados.value.indexOf(codigo);
  if (idx >= 0) {
    centrosSeleccionados.value = centrosSeleccionados.value.filter((c) => c !== codigo);
  } else {
    centrosSeleccionados.value = [...centrosSeleccionados.value, codigo];
  }
}

function limpiarCentrosSeleccionados() {
  centrosSeleccionados.value = [];
  centrosDropdownAbierto.value = false;
}

function onClickFueraCentrosDropdown(event) {
  if (!centrosDropdownRef.value?.contains(event.target)) {
    centrosDropdownAbierto.value = false;
  }
}

const toggleFila = (key) => {
  filasAbiertas.value[key] = !filasAbiertas.value[key];
};

const CATEGORIA_EXCLUIDA_EBITDA = "otros_gastos_financieros";
const CATEGORIAS_INGRESOS = new Set(["ingreso_explotacion", "ingreso_financiero"]);
const CATEGORIAS_GASTOS = new Set(["gasto_adm_ventas", "otros_gastos_financieros"]);
const UMBRAL_RELATIVO_NEUTRO = 0.005;
const UMBRAL_CONSIDERABLE_GASTOS = 0.03;

// ── EMPRESAS: el EERR consolida las empresas marcadas (por defecto WCORP1 y WCORP2).
// Cada empresa se mapea con su propio plan en mapeo_cuentas.json y luego se suman:
// una misma cuenta o centro de costo en ambas queda en una sola fila.
const EMPRESAS_POR_DEFECTO = ["WCORP1", "WCORP2"];
const empresasConDatos = computed(() => {
  const set = new Set(eerrDataRaw.map((d) => String(d.Empresa).trim()));
  return [...EMPRESAS.filter((e) => set.has(e)), ...[...set].filter((e) => !EMPRESAS.includes(e)).sort()];
});
const empresasSel = ref(EMPRESAS_POR_DEFECTO.filter((e) => empresasConDatos.value.includes(e)));
if (!empresasSel.value.length) empresasSel.value = empresasConDatos.value.slice(0, 1);

function toggleEmpresa(e) {
  if (empresasSel.value.includes(e)) {
    if (empresasSel.value.length === 1) return; // siempre al menos una
    empresasSel.value = empresasSel.value.filter((x) => x !== e);
  } else {
    // Se conserva el orden de la lista, no el orden en que se marcaron.
    empresasSel.value = empresasConDatos.value.filter((x) => x === e || empresasSel.value.includes(x));
  }
}

const etiquetaEmpresas = computed(() => empresasSel.value.join(" + "));

const datosPorEmpresa = computed(() => {
  const sel = new Set(empresasSel.value);
  const m = new Map(empresasSel.value.map((e) => [e, []]));
  for (const d of eerrDataRaw) {
    const e = String(d.Empresa).trim();
    if (sel.has(e)) m.get(e).push(d);
  }
  return m;
});

const datosEmpresa = computed(() => [...datosPorEmpresa.value.values()].flat());

function mapearEmpresasSeleccionadas(anio) {
  const out = [];
  for (const [emp, filas] of datosPorEmpresa.value) {
    out.push(...separarSobretasa(mapearDatosAnioEerr(emp, anio, tipoEerr.value, filas, mapeoCuentas)));
  }
  return out;
}

// ── SOBRETASA ─────────────────────────────────────────────────────────────
// Softland registra la sobretasa en la misma cuenta que las contribuciones
// (5-2-01-07-001); solo la glosa del pago la distingue ("PAGO CUOTA n DE 4 SOBRETASA").
// Se separa en el subítem "sobretasa" con el detalle de movimientos, que suma
// exactamente lo mismo que datos_vue.json por cuenta+centro+mes.
const CUENTA_CONTRIBUCIONES = "5-2-01-07-001";
const SUBITEM_SOBRETASA = "sobretasa";
const esGlosaSobretasa = (glosa) => /SOBRETASA/i.test(String(glosa || ""));
const claveSobretasa = (emp, anio, mes, centro) => `${emp}|${Number(anio)}|${Number(mes)}|${normCodigoCentro(centro)}`;

const sobretasaPorClave = computed(() => {
  const m = new Map();
  for (const r of detalleMovimientos) {
    if (String(r.CodigoCuenta).trim() !== CUENTA_CONTRIBUCIONES || !esGlosaSobretasa(r.Glosa)) continue;
    const k = claveSobretasa(r.Empresa, r.Anio, r.Mes, r.CodigoCentroCosto);
    m.set(k, (m.get(k) || 0) + (Number(r.SaldoNeto) || 0));
  }
  return m;
});

function separarSobretasa(rows) {
  const out = [];
  const usadas = new Set();
  for (const d of rows) {
    if (String(d.CodigoCuenta).trim() !== CUENTA_CONTRIBUCIONES) {
      out.push(d);
      continue;
    }
    const k = claveSobretasa(d.Empresa, d.Anio, d.Mes, d.CodigoCentroCosto);
    const monto = usadas.has(k) ? 0 : sobretasaPorClave.value.get(k) || 0;
    usadas.add(k);
    if (!monto) {
      out.push(d);
      continue;
    }
    out.push({ ...d, SaldoNeto: d.SaldoNeto - monto });
    out.push({ ...d, Subitem: SUBITEM_SOBRETASA, NombreCuenta: "SOBRETASA (en cuenta CONTRIBUCIONES)", SaldoNeto: monto });
  }
  return out;
}

/** Copia del mapeo solo para ordenar la matriz: la sobretasa va justo después de contribuciones. */
const mapeoParaMatriz = computed(() => {
  const emp = empresasSel.value[0];
  const cfg = mapeoCuentas?.empresas?.[emp];
  if (!cfg) return mapeoCuentas;
  const ordenContrib = Number(cfg.cuentas?.[CUENTA_CONTRIBUCIONES]?.orden ?? 9998);
  return {
    ...mapeoCuentas,
    empresas: {
      ...mapeoCuentas.empresas,
      [emp]: {
        ...cfg,
        cuentas: {
          ...cfg.cuentas,
          __orden_sobretasa__: { categoria: "gasto_adm_ventas", subitem: SUBITEM_SOBRETASA, orden: ordenContrib + 0.5 },
        },
      },
    },
  };
});

const aniosDisponibles = computed(() => {
  const set = new Set(datosEmpresa.value.map((d) => normAnio(d.Anio)));
  const arr = Array.from(set).sort((a, b) => b - a);
  return arr.length ? arr : [new Date().getFullYear()];
});

const centrosDisponibles = computed(() => {
  const map = new Map();
  for (const d of datosEmpresa.value) {
    if (normAnio(d.Anio) !== Number(filtroAnio.value)) continue;
    const codigo = normCodigoCentro(d.CodigoCentroCosto);
    const nombre = String(d.CentroCosto || "").trim() || "Sin Centro de Costo";
    if (!map.has(codigo)) {
      map.set(codigo, { codigo, nombre: codigo === "000" ? "Sin Centro de Costo" : nombre });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.codigo.localeCompare(b.codigo, "es", { numeric: true })
  );
});

function filtrarMapeadosPorCentros(rows) {
  return filtrarFilasPorCentros(rows, centrosSeleccionados.value);
}

watch(empresasSel, () => {
  if (!aniosDisponibles.value.includes(filtroAnio.value)) filtroAnio.value = aniosDisponibles.value[0];
  centrosSeleccionados.value = [];
  centrosDropdownAbierto.value = false;
  filasAbiertas.value = {};
});

watch(filtroAnio, () => {
  centrosSeleccionados.value = centrosSeleccionados.value.filter((c) =>
    centrosDisponibles.value.some((cc) => cc.codigo === c)
  );
});

onMounted(() => {
  if (aniosDisponibles.value.length) filtroAnio.value = aniosDisponibles.value[0];
  document.addEventListener("click", onClickFueraCentrosDropdown);
});

onUnmounted(() => {
  document.removeEventListener("click", onClickFueraCentrosDropdown);
});

const ipcMensualMap = computed(() => {
  const map = new Map();
  const serie = macroData?.historico?.ipc || [];
  serie.forEach((punto) => {
    const anio = Number(punto?.anio);
    const mes = Number(punto?.mes);
    const valor = Number(punto?.valor);
    if (!Number.isFinite(anio) || !Number.isFinite(mes) || !Number.isFinite(valor)) return;
    map.set(`${anio}-${mes}`, valor);
  });
  return map;
});

function obtenerIpcMensualPct(anio, mes) {
  return ipcMensualMap.value.get(`${Number(anio)}-${Number(mes)}`) ?? 0;
}

function sonCasiIguales(actual, referencia, umbralRel = UMBRAL_RELATIVO_NEUTRO) {
  const base = Math.max(1, Math.abs(referencia));
  return Math.abs(actual - referencia) / base <= umbralRel;
}

function claseVariacionRealMensual(categoria, actual, anterior, anio, mes) {
  if (mes < 1) return "";
  const valorActual = Number(actual) || 0;
  const valorAnterior = Number(anterior) || 0;
  const ipcMensualPct = obtenerIpcMensualPct(anio, mes);
  const valorAnteriorAjustado = valorAnterior * (1 + ipcMensualPct / 100);

  if (sonCasiIguales(valorActual, valorAnteriorAjustado)) return "";

  if (CATEGORIAS_INGRESOS.has(categoria)) {
    return valorActual > valorAnteriorAjustado ? "bg-emerald-50" : "bg-rose-50";
  }

  if (CATEGORIAS_GASTOS.has(categoria)) {
    const gastoActual = Math.abs(valorActual);
    const gastoAnteriorAjustado = Math.abs(valorAnteriorAjustado);
    const umbralSuperior = gastoAnteriorAjustado * (1 + UMBRAL_CONSIDERABLE_GASTOS);
    const umbralInferior = gastoAnteriorAjustado * (1 - UMBRAL_CONSIDERABLE_GASTOS);
    if (gastoActual > umbralSuperior) return "bg-rose-50";
    if (gastoActual < umbralInferior) return "bg-emerald-50";
  }

  return "";
}

// Mapeo Inteligente
const datosAnioMapeados = computed(() =>
  filtrarMapeadosPorCentros(mapearEmpresasSeleccionadas(filtroAnio.value))
);
const datosAnioAnteriorMapeados = computed(() =>
  filtrarMapeadosPorCentros(mapearEmpresasSeleccionadas(Number(filtroAnio.value) - 1))
);
const datosAnioNoClasificados45 = computed(() => {
  // Cada fila se compara contra el plan de su propia empresa.
  const cuentasDe = (emp) => mapeoCuentas?.empresas?.[emp]?.cuentas || {};

  return datosEmpresa.value
    .filter((d) => normAnio(d.Anio) === Number(filtroAnio.value) && mapeoCuentas?.empresas?.[String(d.Empresa).trim()])
    .map((d) => ({
      ...d,
      Mes: normMes(d.Mes),
      SaldoNeto: Number(d.SaldoNeto ?? 0),
      CodigoCuenta: String(d.CodigoCuenta ?? "").trim(),
      NombreCuenta: d.NombreCuenta || d.Cuenta || "Sin Nombre",
    }))
    .filter((d) => {
      const cod = d.CodigoCuenta;
      if (!cod) return false;
      const esCuenta45 = cod.startsWith("4") || cod.startsWith("5");
      if (!esCuenta45) return false;

      const cfg = cuentasDe(String(d.Empresa).trim())[cod];
      // Se considera no clasificada para el tipo EERR actual si:
      // - no existe en el mapeo, o
      // - existe pero no incluye el tipo seleccionado.
      if (!cfg) return true;
      const tiposCuenta = Array.isArray(cfg.eerr) ? cfg.eerr : ["financiero", "contable"];
      return !tiposCuenta.includes(tipoEerr.value);
    });
});

const matrizNoClasificadas45 = computed(() => {
  const grupos = new Map([
    [
      "4",
      {
        key: "4",
        nombre: "Ingresos",
        mensual: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0 },
        total: 0,
        cuentasMap: new Map(),
      },
    ],
    [
      "5",
      {
        key: "5",
        nombre: "Costos de Explotación",
        mensual: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0 },
        total: 0,
        cuentasMap: new Map(),
      },
    ],
  ]);

  datosAnioNoClasificados45.value.forEach((d) => {
    const tipo = String(d.CodigoCuenta || "").charAt(0);
    const grupo = grupos.get(tipo);
    if (!grupo) return;

    if (!grupo.cuentasMap.has(d.CodigoCuenta)) {
      grupo.cuentasMap.set(d.CodigoCuenta, {
        key: d.CodigoCuenta,
        codigo: d.CodigoCuenta,
        nombre: d.NombreCuenta,
        mensual: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0 },
        total: 0,
      });
    }

    const row = grupo.cuentasMap.get(d.CodigoCuenta);
    row.mensual[d.Mes] += d.SaldoNeto;
    row.total += d.SaldoNeto;

    grupo.mensual[d.Mes] += d.SaldoNeto;
    grupo.total += d.SaldoNeto;
  });

  return ["4", "5"].map((k) => {
    const grupo = grupos.get(k);
    return {
      ...grupo,
      cuentas: Array.from(grupo.cuentasMap.values()).sort((a, b) =>
        a.codigo.localeCompare(b.codigo, "es", { numeric: true })
      ),
    };
  });
});

const hayNoClasificadas45 = computed(() =>
  matrizNoClasificadas45.value.some((g) => g.cuentas.length > 0)
);

const totalNoClasificadas45 = computed(() => {
  const mensual = { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0 };
  let total = 0;

  matrizNoClasificadas45.value.forEach((g) => {
    for (let m = 1; m <= 12; m += 1) {
      mensual[m] += Number(g.mensual[m] || 0);
    }
    total += Number(g.total || 0);
  });

  return { mensual, total };
});

function descargarNoClasificadas45Excel() {
  const filas = [];

  matrizNoClasificadas45.value.forEach((grupo) => {
    grupo.cuentas.forEach((cuenta) => {
      filas.push({
        Grupo: grupo.nombre,
        CodigoCuenta: cuenta.codigo,
        NombreCuenta: cuenta.nombre,
        Enero: Number(cuenta.mensual[1] || 0),
        Febrero: Number(cuenta.mensual[2] || 0),
        Marzo: Number(cuenta.mensual[3] || 0),
        Abril: Number(cuenta.mensual[4] || 0),
        Mayo: Number(cuenta.mensual[5] || 0),
        Junio: Number(cuenta.mensual[6] || 0),
        Julio: Number(cuenta.mensual[7] || 0),
        Agosto: Number(cuenta.mensual[8] || 0),
        Septiembre: Number(cuenta.mensual[9] || 0),
        Octubre: Number(cuenta.mensual[10] || 0),
        Noviembre: Number(cuenta.mensual[11] || 0),
        Diciembre: Number(cuenta.mensual[12] || 0),
        Total: Number(cuenta.total || 0),
      });
    });
  });

  if (!filas.length) return;

  const worksheet = XLSX.utils.json_to_sheet(filas);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "NoClasificadas45");

  const nombreArchivo = `no_clasificadas_45_${etiquetaEmpresas.value}_${filtroAnio.value}.xlsx`;
  XLSX.writeFile(workbook, nombreArchivo);
}

function descargarMatrizEerrExcel() {
  const filas = [];

  matrizContable.value.forEach((grupo) => {
    grupo.subitems.forEach((sub) => {
      sub.cuentas.forEach((cta) => {
        cta.centros.forEach((cc) => {
          filas.push({
            Categoria: grupo.config.label,
            Subitem: sub.nombreOriginal,
            CodigoCuenta: cta.codigo,
            NombreCuenta: cta.nombre,
            CodigoCentroCosto: cc.codigo,
            CentroCosto: cc.codigo === "000" ? "Sin Centro de Costo" : cc.nombre,
            Enero: Number(cc.mensual[1] || 0),
            Febrero: Number(cc.mensual[2] || 0),
            Marzo: Number(cc.mensual[3] || 0),
            Abril: Number(cc.mensual[4] || 0),
            Mayo: Number(cc.mensual[5] || 0),
            Junio: Number(cc.mensual[6] || 0),
            Julio: Number(cc.mensual[7] || 0),
            Agosto: Number(cc.mensual[8] || 0),
            Septiembre: Number(cc.mensual[9] || 0),
            Octubre: Number(cc.mensual[10] || 0),
            Noviembre: Number(cc.mensual[11] || 0),
            Diciembre: Number(cc.mensual[12] || 0),
            Total: Number(cc.total || 0),
          });
        });
      });
    });
  });

  if (!filas.length) return;

  const worksheet = XLSX.utils.json_to_sheet(filas);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "MatrizEERR");

  const tipo = tipoEerr.value === "financiero" ? "financiera" : "contable";
  const nombreArchivo = `matriz_eerr_${tipo}_${etiquetaEmpresas.value}_${filtroAnio.value}.xlsx`;
  XLSX.writeFile(workbook, nombreArchivo);
}

const diciembreAnteriorPorNivel = computed(() => {
  const grupos = new Map();
  const subitems = new Map();
  const cuentas = new Map();
  const centros = new Map();

  datosAnioAnteriorMapeados.value.forEach((d) => {
    if (d.Mes !== 12) return;
    const categoria = d.Categoria;
    if (!BLOQUES_FINANCIEROS.some((b) => b.key === categoria)) return;
    const subitem = d.Subitem || "sin_subitem";
    const cuenta = d.CodigoCuenta || "sin_cuenta";
    const cc = d.CodigoCentroCosto || "000";
    const monto = Number(d.SaldoNeto) || 0;

    const subitemKey = `${categoria}-${subitem}`;
    const cuentaKey = `${subitemKey}-${cuenta}`;
    const centroKey = `${cuentaKey}-${cc}`;

    grupos.set(categoria, (grupos.get(categoria) || 0) + monto);
    subitems.set(subitemKey, (subitems.get(subitemKey) || 0) + monto);
    cuentas.set(cuentaKey, (cuentas.get(cuentaKey) || 0) + monto);
    centros.set(centroKey, (centros.get(centroKey) || 0) + monto);
  });

  return { grupos, subitems, cuentas, centros };
});

function valorMesAnterior(mes, mensual, nivel, keyNivel) {
  if (mes > 1) return Number(mensual?.[mes - 1]) || 0;
  const map = diciembreAnteriorPorNivel.value[nivel];
  return Number(map?.get(keyNivel)) || 0;
}

const matrizContable = computed(() =>
  construirMatrizContableEerr(datosAnioMapeados.value, empresasSel.value[0], mapeoParaMatriz.value)
);

// ── DETALLE PROVEEDOR / DOCUMENTO ─────────────────────────────────────────
// Bajo cada centro de costo: Proveedor (Entidad del detalle Softland: auxiliar o,
// si no hay, el nombre parseado de la glosa) y Documento (línea real con folio,
// glosa y fecha). Mismo ETL que datos_vue.json, así que por cuenta+centro+mes
// suma exactamente lo mismo que la matriz.

const claveCentro = (s, c, cc) => `${s}-${c}-${cc}`;
const claveProv = (s, c, cc, p) => `${s}-${c}-${cc}::${p}`;

/** Clave del detalle. En la cuenta de contribuciones se separa por glosa, igual que la matriz. */
function claveDetalle(cuenta, centro, subitem) {
  const base = `${String(cuenta ?? "").trim()}||${normCodigoCentro(centro)}`;
  if (String(cuenta ?? "").trim() !== CUENTA_CONTRIBUCIONES) return base;
  return `${base}||${subitem === SUBITEM_SOBRETASA ? "S" : "C"}`;
}

/** Detalle de la empresa y año en pantalla, filtrado por centros, agrupado por `cuenta||centro`. */
const detalleIndex = computed(() => {
  const idx = new Map();
  const anio = Number(filtroAnio.value);
  const filas = filtrarFilasPorCentros(
    detalleMovimientos.filter((r) => empresasSel.value.includes(r.Empresa) && Number(r.Anio) === anio),
    centrosSeleccionados.value
  );
  for (const r of filas) {
    const key = claveDetalle(r.CodigoCuenta, r.CodigoCentroCosto, esGlosaSobretasa(r.Glosa) ? SUBITEM_SOBRETASA : "");
    if (!idx.has(key)) idx.set(key, []);
    idx.get(key).push(r);
  }
  return idx;
});

function tieneDetalle(cuentaCod, centroCod, subitem) {
  return detalleIndex.value.has(claveDetalle(cuentaCod, centroCod, subitem));
}

/** Quita del inicio de la glosa el folio que ya se muestra aparte
 * (ej. "F.V 26283 / 15.842.077-5 - JAIME…" con doc "F.V 26283" → "15.842.077-5 - JAIME…"). */
function limpiarGlosa(glosa, doc) {
  const g = String(glosa ?? "").trim();
  if (!doc || !g.startsWith(doc)) return g;
  return g.slice(doc.length).replace(/^\s*[-–/]\s*/, "").trim() || g;
}

function agruparDocumentos(lineas) {
  const m = new Map();
  for (const r of lineas) {
    const doc = String(r.Doc ?? "").trim();
    const glosa = String(r.Glosa ?? "").trim();
    const dkey = doc || glosa || "(s/documento)";
    if (!m.has(dkey)) {
      m.set(dkey, { key: dkey, doc, glosa: glosa || "(sin glosa)", fecha: r.Fecha || "", mensual: mesesCeroPeriodo(), total: 0 });
    }
    const d = m.get(dkey);
    const monto = Number(r.SaldoNeto) || 0;
    d.mensual[normMes(r.Mes)] += monto;
    d.total += monto;
    if (r.Fecha && (!d.fecha || r.Fecha > d.fecha)) d.fecha = r.Fecha;
  }
  return [...m.values()]
    .map((d) => ({ ...d, glosaLimpia: limpiarGlosa(d.glosa, d.doc) }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

/** Nodos proveedor (con sus documentos) para una cuenta+centro. */
function nodosProveedor(cuentaCod, centroCod, subitem) {
  const lineas = detalleIndex.value.get(claveDetalle(cuentaCod, centroCod, subitem)) || [];
  const provMap = new Map();
  for (const r of lineas) {
    // La Entidad parseada de la glosa trae "NOMBRE / descripción": se agrupa por el
    // nombre (la descripción sigue visible en la glosa del documento).
    const prov = String(r.Entidad ?? "").split(" / ")[0].trim() || "(Sin proveedor identificado)";
    if (!provMap.has(prov)) {
      provMap.set(prov, { key: prov, nombre: prov, mensual: mesesCeroPeriodo(), total: 0, lineas: [] });
    }
    const p = provMap.get(prov);
    const monto = Number(r.SaldoNeto) || 0;
    p.mensual[normMes(r.Mes)] += monto;
    p.total += monto;
    p.lineas.push(r);
  }
  return [...provMap.values()]
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
    .map((p) => ({ ...p, documentos: agruparDocumentos(p.lineas) }));
}

// ── RESULTADO DEL EJERCICIO POR PERIODO ───────────────────────────────────
// Mes a mes del año en pantalla, sobre las mismas filas que arman la matriz
// (respeta tipo EERR y filtro de centros). Se lee como una suma: el signo de la
// izquierda indica la operación; los gastos ya vienen con SaldoNeto negativo.

const mesesCeroPeriodo = () => ({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 });
const sumaMeses = (m) => Object.values(m).reduce((s, v) => s + (Number(v) || 0), 0);
const SIGNO_CATEGORIA = { ingreso_explotacion: "+", ingreso_financiero: "+", gasto_adm_ventas: "−" };

const categoriasMensuales = computed(() => {
  const porCat = new Map(BLOQUES_FINANCIEROS.map((b) => [b.key, mesesCeroPeriodo()]));
  datosAnioMapeados.value.forEach((d) => {
    const mensual = porCat.get(d.Categoria);
    if (!mensual || !(d.Mes >= 1 && d.Mes <= 12)) return;
    mensual[d.Mes] += Number(d.SaldoNeto) || 0;
  });
  return porCat;
});

const resumenResultadoMensual = computed(() => {
  const porCat = categoriasMensuales.value;
  const ebitda = mesesCeroPeriodo();
  const resultado = mesesCeroPeriodo();
  for (let m = 1; m <= 12; m++) {
    for (const b of BLOQUES_FINANCIEROS) {
      const v = porCat.get(b.key)[m] || 0;
      resultado[m] += v;
      if (b.key !== CATEGORIA_EXCLUIDA_EBITDA) ebitda[m] += v;
    }
  }
  const filaCategoria = (b, signo) => ({
    label: b.label, signo, mensual: porCat.get(b.key), total: sumaMeses(porCat.get(b.key)), tipo: "categoria",
  });

  const filas = BLOQUES_FINANCIEROS
    .filter((b) => b.key !== CATEGORIA_EXCLUIDA_EBITDA)
    .map((b) => filaCategoria(b, SIGNO_CATEGORIA[b.key] || "+"));
  filas.push({ label: "EBITDA", signo: "=", mensual: ebitda, total: sumaMeses(ebitda), tipo: "subtotal" });
  filas.push(filaCategoria(BLOQUES_FINANCIEROS.find((b) => b.key === CATEGORIA_EXCLUIDA_EBITDA), "−"));
  filas.push({ label: "RESULTADO DEL MES", signo: "=", mensual: resultado, total: sumaMeses(resultado), tipo: "resultado" });
  return filas;
});

function claseFilaResumen(tipo) {
  if (tipo === "resultado") return "bg-indigo-50 font-bold text-indigo-900 border-y border-indigo-200";
  if (tipo === "subtotal") return "bg-slate-50 font-semibold text-slate-700";
  return "bg-white text-slate-700";
}

// Misma nota en pantalla y en las descargas.
const NOTA_RESULTADO_PERIODO =
  "EBITDA = ingresos de explotación + ingresos financieros − gastos de administración y ventas. " +
  "Resultado del mes = EBITDA − otros gastos financieros. Los gastos se muestran entre paréntesis porque " +
  "vienen con signo negativo; el signo de la izquierda indica la operación.";

const notaResultadoPeriodo = computed(() =>
  avisoMeses.value ? `${NOTA_RESULTADO_PERIODO} ${avisoMeses.value}` : NOTA_RESULTADO_PERIODO
);

// ── ESTADO DE LOS MESES ───────────────────────────────────────────────────
// "Sin mov.": mes anterior al último con datos que no trae ningún movimiento de
// resultado (p. ej. enero 2026 en Softland). "Parcial": el mes calendario en curso,
// que el ETL trae hasta el día de la extracción.
const mesesConMovimiento = computed(() => new Set(datosAnioMapeados.value.map((d) => Number(d.Mes))));
const mesParcial = computed(() => {
  const hoy = new Date();
  const mes = hoy.getMonth() + 1;
  return Number(filtroAnio.value) === hoy.getFullYear() && mesesConMovimiento.value.has(mes) ? mes : null;
});
const mesesSinMovimiento = computed(() => {
  const out = [];
  for (let m = 1; m < ultimoMesConMovimiento.value; m++) if (!mesesConMovimiento.value.has(m)) out.push(m);
  return out;
});

function estadoMes(m) {
  if (m === mesParcial.value) return "parcial";
  if (mesesSinMovimiento.value.includes(m)) return "sin mov.";
  return "";
}
function tituloEstadoMes(m) {
  if (m === mesParcial.value) return "Mes en curso: datos hasta el día de la última actualización";
  if (mesesSinMovimiento.value.includes(m)) return "Softland no trae movimientos de resultado en este mes";
  return "";
}

const avisoMeses = computed(() => {
  const partes = [];
  const sin = mesesSinMovimiento.value.map((m) => mesNombre(m));
  if (sin.length) {
    partes.push(`${sin.join(", ")} ${filtroAnio.value} sin movimientos de resultado en Softland (verificar con contabilidad).`);
  }
  if (mesParcial.value) partes.push(`${mesNombre(mesParcial.value)} es el mes en curso: datos parciales.`);
  return partes.join(" ");
});

function descargarPeriodos(formato) {
  const tipo = tipoEerr.value === "financiero" ? "EERR Financiero" : "EERR Contable";
  const p = {
    empresa: etiquetaEmpresas.value,
    anio: filtroAnio.value,
    subtitulo: `${tipo} · ${textoResumenCentros.value}`,
    fecha: new Date().toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" }),
    tablas: [
      { titulo: "Resultado del Ejercicio por Periodo", filas: resumenResultadoMensual.value, nota: notaResultadoPeriodo.value },
    ],
  };
  if (formato === "pdf") descargarPeriodosPdf(p);
  else descargarPeriodosExcel(p);
}

const kpis = computed(() => calcularKpisDesdeRows(datosAnioMapeados.value));
const kpisAnioAnterior = computed(() => calcularKpisDesdeRows(datosAnioAnteriorMapeados.value));

/** Mayor/menor valor de inversiones (subítem propio en mapeo_cuentas.json): variación de
 * valor de los fondos, no es caja. Se informa aparte para leer el resultado sin ella. */
const sobretasaAnio = computed(() =>
  datosAnioMapeados.value.reduce((s, d) => s + (d.Subitem === SUBITEM_SOBRETASA ? Number(d.SaldoNeto) || 0 : 0), 0)
);

const valorizacionInversiones = computed(() =>
  datosAnioMapeados.value.reduce((s, d) => s + (d.Subitem === "valorizacion_inversiones" ? Number(d.SaldoNeto) || 0 : 0), 0)
);

/** Último mes con movimiento del año en pantalla: corte del acumulado comparable. */
const ultimoMesConMovimiento = computed(() =>
  datosAnioMapeados.value.reduce((max, d) => Math.max(max, Number(d.Mes) || 0), 0)
);

// Var Acumulada: enero → último mes con datos del año en pantalla, contra el mismo
// tramo del año anterior (el año anterior trae sus 12 meses en `kpisAnioAnterior`).
const kpisAnioAnteriorAcum = computed(() =>
  calcularKpisDesdeRows(
    filtrarFilasPorRangoMes(datosAnioAnteriorMapeados.value, 1, ultimoMesConMovimiento.value)
  )
);
const etiquetaAcumulado = computed(() => {
  const m = ultimoMesConMovimiento.value;
  if (m <= 1) return "Ene";
  return `Ene-${mesNombreAbrev(Math.min(m, 12))}`;
});

const KPIS_MEJORA_CUANDO_SUBE = new Set(["ingresos", "ingresosFinancieros", "ebitda", "margenBruto", "resultado"]);
const KPIS_COMPARAR_ABSOLUTO = new Set(["gastos", "contribuciones", "patenteMunicipal"]);

function variacionPorcentualEntre(actualRaw, anteriorRaw, key) {
  const actual = KPIS_COMPARAR_ABSOLUTO.has(key) ? Math.abs(actualRaw) : actualRaw;
  const anterior = KPIS_COMPARAR_ABSOLUTO.has(key) ? Math.abs(anteriorRaw) : anteriorRaw;
  if (!Number.isFinite(anterior) || anterior === 0) return null;
  return ((actual - anterior) / Math.abs(anterior)) * 100;
}

function claseSegunVariacion(variacion, key, modoOscuro = false) {
  if (variacion === null) return modoOscuro ? "text-slate-300" : "text-slate-500";
  const mejora = KPIS_MEJORA_CUANDO_SUBE.has(key) ? variacion >= 0 : variacion <= 0;
  if (modoOscuro) return mejora ? "text-emerald-300" : "text-rose-300";
  return mejora ? "text-emerald-600" : "text-rose-600";
}

/** Var Anual: año en pantalla (lo cargado) vs. año anterior completo. */
function variacionKpiPorcentual(key) {
  return variacionPorcentualEntre(Number(kpis.value[key] ?? 0), Number(kpisAnioAnterior.value[key] ?? 0), key);
}

function textoVariacionKpi(key) {
  const variacion = variacionKpiPorcentual(key);
  if (variacion === null) return "• Var Anual: N/A";
  const flecha = variacion >= 0 ? "▲" : "▼";
  const signo = variacion > 0 ? "+" : "";
  return `${flecha} Var Anual: ${signo}${variacion.toFixed(1)}%`;
}

function claseVariacionKpi(key, modoOscuro = false) {
  return claseSegunVariacion(variacionKpiPorcentual(key), key, modoOscuro);
}

/** Var Acumulada: enero → mismo mes, año en pantalla vs. año anterior. */
function variacionKpiAcumuladaPorcentual(key) {
  return variacionPorcentualEntre(Number(kpis.value[key] ?? 0), Number(kpisAnioAnteriorAcum.value[key] ?? 0), key);
}

function textoVariacionKpiAcumulada(key) {
  const variacion = variacionKpiAcumuladaPorcentual(key);
  if (variacion === null) return `• Var Acumulada (${etiquetaAcumulado.value}): N/A`;
  const flecha = variacion >= 0 ? "▲" : "▼";
  const signo = variacion > 0 ? "+" : "";
  return `${flecha} Var Acumulada (${etiquetaAcumulado.value}): ${signo}${variacion.toFixed(1)}%`;
}

function claseVariacionKpiAcumulada(key, modoOscuro = false) {
  return claseSegunVariacion(variacionKpiAcumuladaPorcentual(key), key, modoOscuro);
}

// ── DESGLOSE DE ARRIENDOS (fijo vs. variable), al costado de "Ingresos Acumulados".
// El subítem "arriendos" no distingue fijo/variable en mapeo_cuentas.json: se separa
// por el nombre de la cuenta Softland ("ARRIENDO FIJO" / "ARRIENDO VARIABLE"). Solo
// ingresos de explotación (en WW DINAMITY SA "arriendos" es un gasto).
function sumaArriendosPorTipo(rows) {
  let fijo = 0;
  let variable = 0;
  for (const d of rows) {
    if (d.Subitem !== "arriendos" || d.Categoria !== "ingreso_explotacion") continue;
    const nombreCuenta = String(d.NombreCuenta || "").toUpperCase();
    if (nombreCuenta.includes("VARIABLE")) variable += Number(d.SaldoNeto) || 0;
    else fijo += Number(d.SaldoNeto) || 0;
  }
  return { fijo, variable };
}

const arriendosDesglose = computed(() => ({
  actual: sumaArriendosPorTipo(datosAnioMapeados.value),
  anterior: sumaArriendosPorTipo(datosAnioAnteriorMapeados.value),
  anteriorAcum: sumaArriendosPorTipo(
    filtrarFilasPorRangoMes(datosAnioAnteriorMapeados.value, 1, ultimoMesConMovimiento.value)
  ),
}));

function variacionArriendoEntre(actual, anterior) {
  if (!anterior) return null;
  return ((actual - anterior) / Math.abs(anterior)) * 100;
}

function textoVariacionArriendoBase(variacion, etiqueta) {
  if (variacion === null) return `${etiqueta}: N/A`;
  const flecha = variacion >= 0 ? "▲" : "▼";
  const signo = variacion > 0 ? "+" : "";
  return `${flecha} ${etiqueta} ${signo}${variacion.toFixed(1)}%`;
}

function claseVariacionArriendoBase(variacion) {
  if (variacion === null) return "text-emerald-700/60";
  return variacion >= 0 ? "text-emerald-700" : "text-rose-600";
}

const variacionArriendoAnual = (tipo) =>
  variacionArriendoEntre(Number(arriendosDesglose.value.actual[tipo]) || 0, Number(arriendosDesglose.value.anterior[tipo]) || 0);
const variacionArriendoAcum = (tipo) =>
  variacionArriendoEntre(Number(arriendosDesglose.value.actual[tipo]) || 0, Number(arriendosDesglose.value.anteriorAcum[tipo]) || 0);

const textoVariacionArriendo = (tipo) => textoVariacionArriendoBase(variacionArriendoAnual(tipo), "Anual");
const claseVariacionArriendo = (tipo) => claseVariacionArriendoBase(variacionArriendoAnual(tipo));
const textoVariacionArriendoAcumulada = (tipo) => textoVariacionArriendoBase(variacionArriendoAcum(tipo), "Acum.");
const claseVariacionArriendoAcumulada = (tipo) => claseVariacionArriendoBase(variacionArriendoAcum(tipo));

// ── DIÁLOGO DE INFORMACIÓN: una explicación en lenguaje simple por tarjeta ────
const infoAbierto = ref(null);
function abrirInfo(clave) {
  infoAbierto.value = clave;
}
function cerrarInfo() {
  infoAbierto.value = null;
}

const EXPLICACIONES = {
  ingresos: {
    titulo: "Ingresos Acumulados",
    texto: "Suma de todos los ingresos del año en pantalla: Ingresos de Explotación (arriendos, gastos comunes, consumos) más Ingresos Financieros. Es el ingreso bruto, antes de cualquier gasto. El desglose de arriendos fijo/variable al costado se separa por el nombre de la cuenta en Softland.",
  },
  ingresosFinancieros: {
    titulo: "Ingresos Financieros",
    texto: "Solo la parte de los Ingresos Acumulados que corresponde a la categoría Ingresos Financieros (intereses ganados, dividendos recibidos, corrección monetaria a favor). Ya está incluida dentro de Ingresos Acumulados, no se suma aparte.",
  },
  gastos: {
    titulo: "Gastos Acumulados",
    texto: "Todos los gastos del año: Gastos de Administración y Ventas más Otros Gastos Financieros. Se calcula como Resultado menos Ingresos, lo que da exactamente lo mismo que sumar ambas categorías de gasto.",
  },
  ebitda: {
    titulo: "EBITDA",
    texto: "Resultado operacional antes de intereses y corrección monetaria: Ingresos de Explotación más Ingresos Financieros, menos Gastos de Administración y Ventas. Excluye a propósito la categoría Otros Gastos Financieros, que sí está incluida en el Resultado antes de impuestos. La fórmula es la misma en Financiero y Contable; lo que cambia es qué cuentas entran según el plan de cuentas, por eso el EBITDA puede moverse al cambiar el selector \"Tipo EERR\".",
  },
  margenBruto: {
    titulo: "Margen Bruto",
    texto: "Ingresos de Explotación menos Gastos de Administración y Ventas, excluyendo Remuneraciones. Aproxima el margen del negocio antes de pagar sueldos.",
  },
  contribuciones: {
    titulo: "Contribuciones",
    texto: "Suma de todas las cuentas del subítem Impuestos y Contribuciones: el impuesto territorial (contribuciones) que se paga por los inmuebles. La sobretasa se paga junto con las contribuciones y Softland la registra en la misma cuenta; aquí se separa según la glosa del pago y se muestra aparte (subítem Sobretasa en la matriz).",
  },
  patenteMunicipal: {
    titulo: "Patente Municipal",
    texto: "Suma de todas las cuentas del subítem Patentes (5-2-01-03-003 y 5-2-01-07-002): la patente comercial/municipal pagada a la municipalidad. Si sale en cero es porque no hay pagos registrados en Softland en el año: la patente se debería pagar y queda como pendiente.",
  },
  resultado: {
    titulo: "Resultado antes de impuestos",
    texto: "Suma de las cuatro categorías (Ingresos de Explotación, Ingresos Financieros, Gastos de Administración y Ventas, Otros Gastos Financieros) según Softland, para el tipo EERR seleccionado arriba. No descuenta impuesto a la renta. En Contable incluye depreciación y corrección monetaria; en Financiero no. \"Sin valorización de inversiones\" muestra el mismo resultado quitando el mayor/menor valor de los fondos, que es una variación de valor y no un gasto pagado.",
  },
};

function computeEbitdaMensualFromRows(rows) {
  const mensual = Array(12).fill(0);
  rows.forEach((d) => {
    const idx = d.Mes - 1;
    if (idx < 0 || idx > 11) return;

    const esIngreso = d.Categoria === "ingreso_explotacion" || d.Categoria === "ingreso_financiero";
    const esOtrosGastosFinancieros = d.Categoria === CATEGORIA_EXCLUIDA_EBITDA;
    const esGastoAdmVentasConsiderado = d.Categoria === "gasto_adm_ventas";

    if (!esOtrosGastosFinancieros && (esIngreso || esGastoAdmVentasConsiderado)) {
      mensual[idx] += d.SaldoNeto;
    }
  });
  return mensual;
}

const ebitdaMensual = computed(() => computeEbitdaMensualFromRows(datosAnioMapeados.value));

const ebitdaDiciembreAnioAnterior = computed(() => {
  const m = computeEbitdaMensualFromRows(datosAnioAnteriorMapeados.value);
  return m[11];
});

/** Variación % vs mes calendario anterior; enero usa diciembre del año anterior. */
const ebitdaVariacionMesAnteriorPct = computed(() => {
  const mes = ebitdaMensual.value;
  const prevDec = ebitdaDiciembreAnioAnterior.value;
  const out = [];
  for (let i = 0; i < 12; i += 1) {
    const actual = Number(mes[i]) || 0;
    const anterior = i > 0 ? Number(mes[i - 1]) || 0 : prevDec;
    if (!Number.isFinite(anterior) || Math.abs(anterior) < 1e-6) {
      out.push(null);
      continue;
    }
    out.push(((actual - anterior) / Math.abs(anterior)) * 100);
  }
  return out;
});

const ebitdaAnual = computed(() => kpis.value.ebitda);

const chartSeriesEbitdaMixto = computed(() => [
  {
    name: "EBITDA",
    type: "column",
    data: [...ebitdaMensual.value],
  },
  {
    name: "Var. vs mes ant. (%)",
    type: "line",
    data: [...ebitdaVariacionMesAnteriorPct.value],
  },
]);

const chartOptionsEbitdaMixto = computed(() => ({
  chart: {
    type: "line",
    fontFamily: "inherit",
    toolbar: { show: false },
    zoom: { enabled: false },
  },
  colors: ["#7c3aed", "#0ea5e9"],
  plotOptions: {
    bar: {
      columnWidth: "55%",
      borderRadius: 4,
    },
  },
  dataLabels: { enabled: false },
  stroke: {
    width: [0, 3],
    curve: "smooth",
  },
  markers: {
    size: [0, 4],
    strokeWidth: 2,
    hover: { sizeOffset: 2 },
  },
  xaxis: {
    categories: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
  },
  yaxis: [
    {
      seriesName: "EBITDA",
      title: { text: "EBITDA", style: { fontSize: "11px", color: "#64748b" } },
      labels: {
        formatter: (val) => {
          const n = Number(val);
          if (!Number.isFinite(n)) return "";
          const abs = Math.abs(n);
          if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
          if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
          if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
          return `$${Math.round(n)}`;
        },
      },
    },
    {
      seriesName: "Var. vs mes ant. (%)",
      opposite: true,
      title: { text: "Variación % (mes ant.)", style: { fontSize: "11px", color: "#64748b" } },
      labels: {
        formatter: (val) => {
          const n = Number(val);
          if (!Number.isFinite(n)) return "";
          return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
        },
      },
    },
  ],
  tooltip: {
    shared: true,
    intersect: false,
    y: {
      formatter: (val, opts) => {
        const idx = opts?.seriesIndex;
        if (idx === 1) {
          if (val == null || val === "") return "N/A (mes ant. ~0)";
          const n = Number(val);
          if (!Number.isFinite(n)) return "";
          return `${n >= 0 ? "+" : ""}${n.toFixed(1)}% vs mes anterior`;
        }
        return val == null || val === "" ? "" : formatCLP(val);
      },
    },
  },
  legend: {
    position: "top",
    horizontalAlign: "right",
  },
  grid: {
    borderColor: "#e2e8f0",
    strokeDashArray: 4,
  },
}));

const chartSeriesBarras = computed(() => {
  const ingresos = Array(12).fill(0);
  const gastos = Array(12).fill(0);

  datosAnioMapeados.value.forEach((d) => {
    const idx = d.Mes - 1;
    if (d.Categoria === "ingreso_explotacion" || d.Categoria === "ingreso_financiero") {
      ingresos[idx] += d.SaldoNeto;
    } else {
      gastos[idx] += d.SaldoNeto;
    }
  });

  return [
    { name: "Ingresos Totales", data: ingresos },
    { name: "Gastos Totales", data: gastos },
  ];
});

const chartOptionsBarras = computed(() => ({
  chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
  colors: ["#10B981", "#EF4444"],
  plotOptions: { bar: { columnWidth: "50%", borderRadius: 2 } },
  dataLabels: { enabled: false },
  stroke: { show: true, width: 2, colors: ["transparent"] },
  xaxis: { categories: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"] },
  yaxis: { labels: { formatter: (val) => "$" + (val / 1000000).toFixed(1) + "M" } },
  tooltip: { y: { formatter: (val) => formatCLP(val) } },
}));

const PALETA_DONUT_GASTO = [
  "#DC2626", "#EA580C", "#D97706", "#CA8A04", "#65A30D", "#16A34A",
  "#0D9488", "#0891B2", "#2563EB", "#7C3AED", "#C026D3", "#DB2777",
];

/** Saldos de gasto adm. suelen ser negativos; la dona necesita magnitudes positivas y etiquetas alineadas. */
const gastoAdmDistribucion = computed(() => {
  const map = new Map();
  datosAnioMapeados.value
    .filter((d) => d.Categoria === "gasto_adm_ventas")
    .forEach((d) => {
      const key = d.Subitem || "sin_subitem";
      map.set(key, (map.get(key) || 0) + Number(d.SaldoNeto ?? 0));
    });

  const entries = [...map.entries()]
    .map(([nombre, raw]) => ({
      nombre,
      magnitud: Math.abs(Number(raw) || 0),
      raw: Number(raw) || 0,
    }))
    .filter((e) => e.magnitud > 1e-9)
    .sort((a, b) => b.magnitud - a.magnitud);

  const totalMagnitud = entries.reduce((s, e) => s + e.magnitud, 0);
  return { entries, totalMagnitud };
});

const chartSeriesDonut = computed(() =>
  gastoAdmDistribucion.value.entries.map((e) => e.magnitud)
);

const chartOptionsDonut = computed(() => {
  const { entries, totalMagnitud } = gastoAdmDistribucion.value;
  const labels = entries.map((e) => formatearNombre(e.nombre));
  const n = entries.length;
  const colors = Array.from({ length: n }, (_, i) => PALETA_DONUT_GASTO[i % PALETA_DONUT_GASTO.length]);

  return {
    chart: {
      type: "donut",
      fontFamily: "inherit",
      toolbar: { show: false },
    },
    labels,
    colors,
    stroke: { width: 2, colors: ["#fff"] },
    plotOptions: {
      pie: {
        expandOnClick: false,
        donut: {
          size: "62%",
          labels: {
            show: true,
            name: { fontSize: "12px" },
            value: {
              fontSize: "14px",
              fontWeight: 600,
              formatter: (val) => formatCLP(val),
            },
            total: {
              show: true,
              showAlways: entries.length > 0,
              label: "Total",
              fontSize: "11px",
              color: "#64748b",
              formatter: () => formatCLP(totalMagnitud),
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${Number(val).toFixed(1)}%`,
      style: { fontSize: "10px", fontWeight: 500 },
      dropShadow: { enabled: false },
    },
    legend: {
      position: "bottom",
      fontSize: "11px",
    },
    tooltip: {
      y: {
        formatter: (val, opts) => {
          const i = opts?.seriesIndex;
          const e = typeof i === "number" ? entries[i] : undefined;
          const pct = totalMagnitud > 0 && val != null ? (Number(val) / totalMagnitud) * 100 : 0;
          const base = `${formatCLP(val)} · ${pct.toFixed(1)}% del total`;
          if (e && e.raw < 0) return `${base} (saldo contable negativo)`;
          return base;
        },
      },
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: { height: 280 },
          legend: { position: "bottom" },
        },
      },
    ],
  };
});

const formatCLP = (v) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Math.round(Number(v || 0)));
const formatCLPContable = (v) => {
  if (!v || v === 0) return "-";
  const n = Math.round(Number(v));
  const abs = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(Math.abs(n));
  return n < 0 ? `(${abs})` : abs;
};
const formatearNombre = (t) => String(t || "").replace(/_/g, " ");
const mesNombre = (m) => ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][m - 1];
const mesNombreAbrev = (m) => ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][m - 1];
</script>