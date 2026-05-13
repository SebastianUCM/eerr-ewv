<template>
    <div class="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      
      <header class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">
            {{ props.norma === 'IFRS' ? 'Balance IFRS' : 'Balance Tributario' }}
          </h1>
          <p class="text-sm text-slate-500 mt-1">Estructura Oficial Softland - {{ props.empresa }}</p>
        </div>

        <div
          v-if="tieneMapeoDeuda"
          class="rounded-xl border border-indigo-200 bg-indigo-950 text-white px-4 py-2.5 shadow-sm shrink-0"
        >
          <p class="text-[10px] uppercase tracking-wide text-indigo-200 font-bold">Deuda total</p>
          <p class="text-lg font-bold font-mono tabular-nums" :class="deudaTotal < 0 ? 'text-rose-300' : 'text-indigo-50'">
            {{ formatCLPMonto(deudaTotal) }}
          </p>
          <p class="text-[9px] text-indigo-300/90 mt-0.5">Suma Saldo Cuenta según mapeo_deuda.json</p>
        </div>
        
        <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex flex-wrap items-center gap-3">
          <label class="text-xs font-semibold uppercase text-slate-500">Acumulado a:</label>
          <select v-model.number="filtroMes" class="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white font-medium outline-none">
            <option v-for="m in 12" :key="m" :value="m">{{ mesNombre(m) }}</option>
          </select>
          <select v-model.number="filtroAnio" class="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white font-medium outline-none">
            <option v-for="a in aniosDisponibles" :key="a" :value="a">{{ a }}</option>
          </select>
    
          <div class="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
    
          <button 
            @click="toggleExpandirTodo" 
            class="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-colors border"
            :class="expandido ? 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'"
          >
            <span v-if="!expandido">📂 Expandir Todos</span>
            <span v-else>📁 Contraer a Principal</span>
          </button>
    
          <button 
            @click="descargarExcel" 
            class="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-colors border bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            title="Exportar vista actual a Excel"
          >
            📥 Descargar Excel
          </button>
        </div>
      </header>
    
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div class="overflow-x-auto max-h-[72vh]">
          <table class="min-w-[1300px] w-full text-xs whitespace-nowrap">
            <thead class="sticky top-0 z-20 bg-slate-100 shadow-[0_2px_5px_rgba(0,0,0,0.05)]">
              <tr class="border-b border-slate-300 text-slate-700">
                <th colspan="2" class="px-4 py-2 text-left font-bold border-r border-slate-300">Plan de Cuentas (Softland)</th>
                <th colspan="2" class="px-2 py-2 text-center font-bold border-r border-slate-300 bg-slate-200/50">Valores Acumulados</th>
                <th colspan="2" class="px-2 py-2 text-center font-bold border-r border-slate-300 bg-slate-200/50">Saldos</th>
                <th colspan="2" class="px-2 py-2 text-center font-bold border-r border-slate-300 bg-indigo-50/50 text-indigo-800">Inventario</th>
                <th colspan="2" class="px-2 py-2 text-center font-bold bg-emerald-50/50 text-emerald-800">Resultados</th>
                <th colspan="1" class="px-2 py-2 text-center font-bold border-l border-slate-300 bg-amber-100/70 text-amber-900">Análisis</th>
              </tr>
              <tr class="border-b border-slate-300 text-slate-600 bg-slate-50">
                <th class="px-4 py-2 text-left font-semibold w-36">Código</th>
                <th class="px-4 py-2 text-left font-semibold border-r border-slate-300">Nombre de la Cuenta</th>
                <th class="px-3 py-2 text-right font-semibold">Débitos</th>
                <th class="px-3 py-2 text-right font-semibold border-r border-slate-300">Créditos</th>
                <th class="px-3 py-2 text-right font-semibold">Deudor</th>
                <th class="px-3 py-2 text-right font-semibold border-r border-slate-300">Acreedor</th>
                <th class="px-3 py-2 text-right font-semibold bg-indigo-50/20">Activo</th>
                <th class="px-3 py-2 text-right font-semibold border-r border-slate-300 bg-indigo-50/20">Pasivo</th>
                <th class="px-3 py-2 text-right font-semibold bg-emerald-50/20">Pérdida</th>
                <th class="px-3 py-2 text-right font-semibold bg-emerald-50/20">Ganancia</th>
                <th class="px-3 py-2 text-right font-semibold border-l border-slate-300 bg-amber-50">Saldo Cuenta</th>
              </tr>
            </thead>
            
            <tbody>
              <tr 
                v-for="row in filasVisibles" 
                :key="row.codigo"
                class="border-b transition-colors"
                :class="estiloFila(row)"
                @click="!row.esHoja ? toggleFila(row.codigo) : null"
              >
                <td class="py-1.5 pr-2 font-mono" :style="{ paddingLeft: `${(row.nivel * 1.2)}rem` }">
                  <div class="flex items-center gap-2">
                    <span v-if="!row.esHoja" class="w-3 text-center cursor-pointer text-slate-400">
                      {{ filasAbiertas[row.codigo] ? "▾" : "▸" }}
                    </span>
                    <span v-else class="w-3 text-center text-slate-300">•</span>
                    {{ row.codigo }}
                  </div>
                </td>
                
                <td class="px-4 py-1.5 border-r border-slate-200 truncate max-w-[20rem]" :title="row.nombre">
                  {{ row.nombre }}
                </td>
                
                <td class="px-3 py-1.5 text-right font-mono" :class="row.esHoja ? 'text-slate-500' : 'text-slate-800'">{{ formatCLP(row.debitos) }}</td>
                <td class="px-3 py-1.5 text-right font-mono border-r border-slate-200" :class="row.esHoja ? 'text-slate-500' : 'text-slate-800'">{{ formatCLP(row.creditos) }}</td>
                
                <td class="px-3 py-1.5 text-right font-mono font-medium" :class="row.esHoja ? 'text-slate-600' : 'text-slate-800'">{{ formatCLP(row.saldoDeudor) }}</td>
                <td class="px-3 py-1.5 text-right font-mono font-medium border-r border-slate-200" :class="row.esHoja ? 'text-slate-600' : 'text-slate-800'">{{ formatCLP(row.saldoAcreedor) }}</td>
                
                <td class="px-3 py-1.5 text-right font-mono" :class="row.esHoja ? 'text-indigo-600' : 'text-indigo-800'">{{ formatCLP(row.activo) }}</td>
                <td class="px-3 py-1.5 text-right font-mono border-r border-slate-200" :class="row.esHoja ? 'text-indigo-600' : 'text-indigo-800'">{{ formatCLP(row.pasivo) }}</td>
                
                <td class="px-3 py-1.5 text-right font-mono" :class="row.esHoja ? 'text-emerald-600' : 'text-emerald-800'">{{ formatCLP(row.perdida) }}</td>
                <td class="px-3 py-1.5 text-right font-mono" :class="row.esHoja ? 'text-emerald-600' : 'text-emerald-800'">{{ formatCLP(row.ganancia) }}</td>
  
                <td class="px-3 py-1.5 text-right font-mono font-bold border-l border-slate-200" 
                    :class="row.saldoCuentas >= 0 ? 'bg-emerald-50/60 text-emerald-700' : 'bg-rose-50/60 text-rose-700'">
                  {{ formatCLP(row.saldoCuentas) }}
                </td>
              </tr>
            </tbody>
    
            <tfoot class="sticky bottom-0 z-20 bg-slate-100 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
              <tr class="border-t-4 border-slate-300 bg-slate-200/80">
                <td colspan="2" class="px-4 py-3 text-right font-bold text-slate-800 border-r border-slate-300">SUBTOTALES GENERALES</td>
                <td class="px-3 py-3 text-right font-mono font-bold">{{ formatCLP(totalesGlobales.debitos) }}</td>
                <td class="px-3 py-3 text-right font-mono font-bold border-r border-slate-300">{{ formatCLP(totalesGlobales.creditos) }}</td>
                <td class="px-3 py-3 text-right font-mono font-bold">{{ formatCLP(totalesGlobales.saldoDeudor) }}</td>
                <td class="px-3 py-3 text-right font-mono font-bold border-r border-slate-300">{{ formatCLP(totalesGlobales.saldoAcreedor) }}</td>
                <td class="px-3 py-3 text-right font-mono font-bold text-indigo-900">{{ formatCLP(totalesGlobales.activo) }}</td>
                <td class="px-3 py-3 text-right font-mono font-bold text-indigo-900 border-r border-slate-300">{{ formatCLP(totalesGlobales.pasivo) }}</td>
                <td class="px-3 py-3 text-right font-mono font-bold text-emerald-900">{{ formatCLP(totalesGlobales.perdida) }}</td>
                <td class="px-3 py-3 text-right font-mono font-bold text-emerald-900">{{ formatCLP(totalesGlobales.ganancia) }}</td>
                <td class="px-3 py-3 text-right font-mono font-bold border-l border-slate-300 bg-amber-100/50 text-amber-900">{{ formatCLP(totalesGlobales.saldoCuentas) }}</td>
              </tr>
              
              <tr class="bg-slate-800 text-white border-b-2" :class="resultadoEjercicio >= 0 ? 'border-emerald-500' : 'border-rose-500'">
                <td colspan="6" class="px-4 py-3 text-right font-bold uppercase tracking-wide border-r border-slate-700">
                  PÉRDIDAS / GANANCIAS
                </td>
                <td class="px-3 py-3 text-right font-mono font-bold text-emerald-300">
                  {{ resultadoEjercicio < 0 ? formatCLP(Math.abs(resultadoEjercicio)) : '' }}
                </td>
                <td class="px-3 py-3 text-right font-mono font-bold text-emerald-300 border-r border-slate-700">
                  {{ resultadoEjercicio >= 0 ? formatCLP(resultadoEjercicio) : '' }}
                </td>
                <td class="px-3 py-3 text-right font-mono font-bold text-emerald-300">
                  {{ resultadoEjercicio >= 0 ? formatCLP(resultadoEjercicio) : '' }}
                </td>
                <td class="px-3 py-3 text-right font-mono font-bold text-emerald-300">
                  {{ resultadoEjercicio < 0 ? formatCLP(Math.abs(resultadoEjercicio)) : '' }}
                </td>
                <td class="border-l border-slate-700"></td>
              </tr>
    
              <tr class="bg-slate-900 text-white">
                <td colspan="6" class="px-4 py-3 text-right font-bold uppercase tracking-widest border-r border-slate-700">
                  TOTAL GENERAL
                </td>
                <td class="px-3 py-3 text-right font-mono font-bold text-indigo-300">
                  {{ formatCLP(totalesGlobales.activo + (resultadoEjercicio < 0 ? Math.abs(resultadoEjercicio) : 0)) }}
                </td>
                <td class="px-3 py-3 text-right font-mono font-bold text-indigo-300 border-r border-slate-700">
                  {{ formatCLP(totalesGlobales.pasivo + (resultadoEjercicio >= 0 ? resultadoEjercicio : 0)) }}
                </td>
                <td class="px-3 py-3 text-right font-mono font-bold text-emerald-300">
                  {{ formatCLP(totalesGlobales.perdida + (resultadoEjercicio >= 0 ? resultadoEjercicio : 0)) }}
                </td>
                <td class="px-3 py-3 text-right font-mono font-bold text-emerald-300">
                  {{ formatCLP(totalesGlobales.ganancia + (resultadoEjercicio < 0 ? Math.abs(resultadoEjercicio) : 0)) }}
                </td>
                <td class="border-l border-slate-700"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </template>
    
  <script setup>
  import { ref, computed, watch, onMounted } from 'vue';
  import * as XLSX from 'xlsx'; // Importamos la librería de Excel
  import eerrDataRaw from '../assets/datos_vue.json';
  import planCuentasRaw from '../assets/plan_cuentas.json';
  import mapeoDeuda from '../assets/config/mapeo_deuda.json';
  
  const props = defineProps({ 
    empresa: { type: String, required: true },
    norma: { type: String, default: 'Trib' }
  });
  
  const filtroAnio = ref(new Date().getFullYear());
  const filtroMes = ref(12);
  
  const filasAbiertas = ref({});
  const expandido = ref(false);
  
  const toggleFila = (codigo) => { 
    filasAbiertas.value[codigo] = !filasAbiertas.value[codigo]; 
  };
  
  const datosEmpresa = computed(() => eerrDataRaw.filter(d => d.Empresa === props.empresa));
  const planEmpresa = computed(() => planCuentasRaw.filter(c => c.Empresa === props.empresa));
  
  const aniosDisponibles = computed(() => {
    const set = new Set(datosEmpresa.value.map(d => Number(d.Anio)));
    const arr = Array.from(set).sort((a, b) => b - a);
    return arr.length ? arr : [new Date().getFullYear()];
  });
  
  watch([() => props.empresa, () => props.norma], () => {
    filtroAnio.value = aniosDisponibles.value[0];
    filtroMes.value = 12; 
    expandido.value = false;
    filasAbiertas.value = {};
  });
  onMounted(() => { if (aniosDisponibles.value.length) filtroAnio.value = aniosDisponibles.value[0]; });
  
  // ==========================================
  // EL MOTOR DEL ÁRBOL
  // ==========================================
  const arbolContable = computed(() => {
    const movsFiltrados = datosEmpresa.value.filter(d => {
      const matchPeriodo = Number(d.Anio) === Number(filtroAnio.value) && Number(d.Mes) <= Number(filtroMes.value);
      const matchNorma = props.norma === 'IFRS' ? d.NormaIFRS === 'S' : d.NormaTrib === 'S';
      return matchPeriodo && matchNorma;
    });
    
    const dict = {};
  
    planEmpresa.value.forEach(c => {
      dict[c.CodigoCuenta] = { 
        codigo: c.CodigoCuenta, 
        nombre: String(c.NombreCuenta).trim(), 
        nivel: Number(c.NivelCuenta) || 1,
        prefijo: c.CodigoCuenta.substring(0, Number(c.LongitudCodigo)), 
        debitos: 0, creditos: 0, hijos: [], esHoja: true 
      };
    });
  
    movsFiltrados.forEach(m => {
      if (!dict[m.CodigoCuenta]) {
        dict[m.CodigoCuenta] = { 
          codigo: m.CodigoCuenta, nombre: String(m.NombreCuenta).trim(), nivel: 5, 
          prefijo: m.CodigoCuenta, debitos: 0, creditos: 0, hijos: [], esHoja: true 
        };
      }
      dict[m.CodigoCuenta].debitos += m.TotalDebe;
      dict[m.CodigoCuenta].creditos += m.TotalHaber;
    });
  
    const nodosArray = Object.values(dict).sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true }));
    const raices = [];
  
    nodosArray.forEach((nodo, index) => {
      let padreEncontrado = null;
      for (let i = index - 1; i >= 0; i--) {
        const candidato = nodosArray[i];
        if (candidato.nivel < nodo.nivel && nodo.codigo.startsWith(candidato.prefijo)) {
          padreEncontrado = candidato;
          break; 
        }
      }
  
      if (padreEncontrado) {
        padreEncontrado.hijos.push(nodo);
        padreEncontrado.esHoja = false; 
      } else {
        raices.push(nodo);
        if (!(nodo.codigo in filasAbiertas.value) && !expandido.value) {
          filasAbiertas.value[nodo.codigo] = true;
        }
      }
    });
  
    const procesarNodo = (nodo) => {
      let sumDebe = nodo.debitos;
      let sumHaber = nodo.creditos;
      
      let sumSaldoDeudor = 0, sumSaldoAcreedor = 0, sumActivo = 0, sumPasivo = 0, sumPerdida = 0, sumGanancia = 0;
  
      if (sumDebe > sumHaber) sumSaldoDeudor = sumDebe - sumHaber;
      if (sumHaber > sumDebe) sumSaldoAcreedor = sumHaber - sumDebe;
  
      const prefix = String(nodo.codigo).charAt(0);
      const esDinamity = props.empresa === "WW DINAMITY SA";
      if (prefix === '1') { sumActivo = sumSaldoDeudor; sumPasivo = sumSaldoAcreedor; }
      else if (prefix === '2') { sumPasivo = sumSaldoAcreedor; sumActivo = sumSaldoDeudor; }
      else if (prefix === '3') {
        if (esDinamity) {
          sumPerdida = sumSaldoDeudor;
          sumGanancia = sumSaldoAcreedor;
        } else {
          sumPasivo = sumSaldoAcreedor;
          sumActivo = sumSaldoDeudor;
        }
      }
      else if (prefix === '4') { sumGanancia = sumSaldoAcreedor; sumPerdida = sumSaldoDeudor; }
      else if (prefix === '5') { sumPerdida = sumSaldoDeudor; sumGanancia = sumSaldoAcreedor; }
      else { sumGanancia = sumSaldoAcreedor; sumPerdida = sumSaldoDeudor; } 
  
      nodo.hijos.forEach(hijo => {
        const vals = procesarNodo(hijo);
        sumDebe += vals.debe; sumHaber += vals.haber;
        sumSaldoDeudor += vals.saldoDeudor; sumSaldoAcreedor += vals.saldoAcreedor;
        sumActivo += vals.activo; sumPasivo += vals.pasivo;
        sumPerdida += vals.perdida; sumGanancia += vals.ganancia;
      });
  
      // FÓRMULA DE SALDO CUENTA SOLICITADA
      let sumSaldoCuentas = 0;
      if (prefix === '1') {
        // Activos (1): (+ Activo - Pasivo - Perdida + Ganancia)
        sumSaldoCuentas = sumActivo - sumPasivo - sumPerdida + sumGanancia;
      } else {
        // Resto (2,3,4,5...): (- Activo + Pasivo - Perdida + Ganancia)
        sumSaldoCuentas = -sumActivo + sumPasivo - sumPerdida + sumGanancia;
      }
  
      Object.assign(nodo, { 
        debitos: sumDebe, creditos: sumHaber, saldoDeudor: sumSaldoDeudor, saldoAcreedor: sumSaldoAcreedor, 
        activo: sumActivo, pasivo: sumPasivo, perdida: sumPerdida, ganancia: sumGanancia,
        saldoCuentas: sumSaldoCuentas
      });
  
      return { 
        debe: sumDebe, haber: sumHaber, saldoDeudor: sumSaldoDeudor, saldoAcreedor: sumSaldoAcreedor, 
        activo: sumActivo, pasivo: sumPasivo, perdida: sumPerdida, ganancia: sumGanancia,
        saldoCuentas: sumSaldoCuentas 
      };
    };
  
    raices.forEach(r => procesarNodo(r));
    return raices;
  });

  const codigosDeudaMapeados = computed(() => {
    const list = mapeoDeuda?.empresas?.[props.empresa]?.cuentas_deuda_total;
    if (!Array.isArray(list)) return new Set();
    return new Set(list.map((c) => String(c).trim()).filter(Boolean));
  });

  const tieneMapeoDeuda = computed(() => codigosDeudaMapeados.value.size > 0);

  const deudaTotal = computed(() => {
    const set = codigosDeudaMapeados.value;
    if (!set.size) return 0;
    let suma = 0;
    const walk = (nodos) => {
      for (const n of nodos) {
        if (set.has(String(n.codigo).trim())) {
          suma += Number(n.saldoCuentas) || 0;
        }
        if (n.hijos?.length) walk(n.hijos);
      }
    };
    walk(arbolContable.value);
    return suma;
  });
  
  const toggleExpandirTodo = () => {
    expandido.value = !expandido.value;
    if (expandido.value) {
      const nuevosAbiertos = {};
      const abrirRecursivo = (nodos) => {
        nodos.forEach(n => {
          if (!n.esHoja) {
            nuevosAbiertos[n.codigo] = true;
            abrirRecursivo(n.hijos);
          }
        });
      };
      abrirRecursivo(arbolContable.value);
      filasAbiertas.value = nuevosAbiertos;
    } else {
      filasAbiertas.value = {};
      arbolContable.value.forEach(r => { filasAbiertas.value[r.codigo] = true; });
    }
  };
  
  const filasVisibles = computed(() => {
    const result = [];
    const recorrer = (nodo, esVisible) => {
      if (nodo.debitos === 0 && nodo.creditos === 0) return;
      if (esVisible) { result.push(nodo); }
      const hijosVisibles = esVisible && filasAbiertas.value[nodo.codigo];
      nodo.hijos
        .sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true }))
        .forEach(h => recorrer(h, hijosVisibles));
    };
    arbolContable.value
      .sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true }))
      .forEach(r => recorrer(r, true));
    return result;
  });
  
  const totalesGlobales = computed(() => {
    const t = { debitos: 0, creditos: 0, saldoDeudor: 0, saldoAcreedor: 0, activo: 0, pasivo: 0, perdida: 0, ganancia: 0, saldoCuentas: 0 };
    arbolContable.value.forEach(r => {
      t.debitos += r.debitos; t.creditos += r.creditos;
      t.saldoDeudor += r.saldoDeudor; t.saldoAcreedor += r.saldoAcreedor;
      t.activo += r.activo; t.pasivo += r.pasivo;
      t.perdida += r.perdida; t.ganancia += r.ganancia;
      t.saldoCuentas += r.saldoCuentas;
    });
    return t;
  });
  
  const resultadoEjercicio = computed(() => totalesGlobales.value.ganancia - totalesGlobales.value.perdida);
  
  // ==========================================
  // FUNCIÓN PARA EXPORTAR A EXCEL
  // ==========================================
  const descargarExcel = () => {
    const data = filasVisibles.value.map(row => ({
      'Código': row.codigo,
      'Nombre de la Cuenta': row.nombre,
      'Débitos': row.debitos || 0,
      'Créditos': row.creditos || 0,
      'Saldo Deudor': row.saldoDeudor || 0,
      'Saldo Acreedor': row.saldoAcreedor || 0,
      'Activo': row.activo || 0,
      'Pasivo': row.pasivo || 0,
      'Pérdida': row.perdida || 0,
      'Ganancia': row.ganancia || 0,
      'Saldo Cuenta': row.saldoCuentas || 0
    }));
  
    data.push({});
  
    data.push({
      'Código': '',
      'Nombre de la Cuenta': 'SUBTOTALES GENERALES',
      'Débitos': totalesGlobales.value.debitos,
      'Créditos': totalesGlobales.value.creditos,
      'Saldo Deudor': totalesGlobales.value.saldoDeudor,
      'Saldo Acreedor': totalesGlobales.value.saldoAcreedor,
      'Activo': totalesGlobales.value.activo,
      'Pasivo': totalesGlobales.value.pasivo,
      'Pérdida': totalesGlobales.value.perdida,
      'Ganancia': totalesGlobales.value.ganancia,
      'Saldo Cuenta': totalesGlobales.value.saldoCuentas
    });
  
    const res = resultadoEjercicio.value;
    data.push({
      'Código': '',
      'Nombre de la Cuenta': res >= 0 ? 'UTILIDAD DEL EJERCICIO' : 'PÉRDIDA DEL EJERCICIO',
      'Débitos': null,
      'Créditos': null,
      'Saldo Deudor': null,
      'Saldo Acreedor': null,
      'Activo': res < 0 ? Math.abs(res) : 0,
      'Pasivo': res >= 0 ? res : 0,
      'Pérdida': res >= 0 ? res : 0,
      'Ganancia': res < 0 ? Math.abs(res) : 0,
      'Saldo Cuenta': null
    });
  
    data.push({
      'Código': '',
      'Nombre de la Cuenta': 'TOTAL GENERAL (SUMAS IGUALES)',
      'Débitos': null,
      'Créditos': null,
      'Saldo Deudor': null,
      'Saldo Acreedor': null,
      'Activo': totalesGlobales.value.activo + (res < 0 ? Math.abs(res) : 0),
      'Pasivo': totalesGlobales.value.pasivo + (res >= 0 ? res : 0),
      'Pérdida': totalesGlobales.value.perdida + (res >= 0 ? res : 0),
      'Ganancia': totalesGlobales.value.ganancia + (res < 0 ? Math.abs(res) : 0),
      'Saldo Cuenta': null
    });
  
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Balance");
    
    const nombreArchivo = `Balance_${props.norma}_${props.empresa}_${filtroAnio.value}_Mes${filtroMes.value}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  };
  
  const estiloFila = (row) => {
    if (row.nivel === 1) return 'bg-slate-200/60 font-bold text-slate-900 border-slate-300'; 
    if (row.nivel === 2) return 'bg-slate-100/80 font-bold text-slate-800 border-slate-200';
    if (!row.esHoja) return 'bg-slate-50 font-semibold text-slate-700 cursor-pointer hover:bg-slate-200/50';
    return 'bg-white hover:bg-indigo-50/30 text-slate-600'; 
  };
  
  const formatCLP = (v) => {
    if (!v || v === 0) return '';
    return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(Math.round(Number(v)));
  };

  const formatCLPMonto = (v) =>
    new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(Math.round(Number(v || 0)));
  
  const mesNombre = (m) => ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][m - 1];
  </script>