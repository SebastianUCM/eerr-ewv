<template>
    <div class="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-800">
      <header class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">
            Dashboard de Activos (Renta Inmobiliaria)
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            Monitor de KPIs Estratégicos Nivel Institucional — {{ empresa }}
          </p>
        </div>
  
        <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex items-center gap-3">
          <label class="text-xs font-semibold uppercase text-slate-500">Periodo:</label>
          <select
            v-model="filtroMes"
            @change="cargarDatos"
            class="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          >

            <option value="2026-04">Abril 2026</option>
            <option value="2026-03">Marzo 2026</option>
            <option value="2026-02">Febrero 2026</option>
            <option value="2026-01">Enero 2026</option>
            <option value="2025-12">Diciembre 2025</option>
            <option value="2025-11">Noviembre 2025</option>
            <option value="2025-10">Octubre 2025</option>
            <option value="2025-09">Septiembre 2025</option>
            <option value="2025-08">Agosto 2025</option>
            <option value="2025-07">Julio 2025</option>
            <option value="2025-06">Junio 2025</option>
            <option value="2025-05">Mayo 2025</option>
            <option value="2025-04">Abril 2025</option>
            <option value="2025-03">Marzo 2025</option>
            <option value="2025-02">Febrero 2025</option>
            <option value="2025-01">Enero 2025</option>
            <option value="2024-12">Diciembre 2024</option>
            <option value="2024-11">Noviembre 2024</option>
            <option value="2024-10">Octubre 2024</option>
            <option value="2024-09">Septiembre 2024</option>
            <option value="2024-08">Agosto 2024</option>
            <option value="2024-07">Julio 2024</option>
            <option value="2024-06">Junio 2024</option>
            <option value="2024-05">Mayo 2024</option>
            <option value="2024-04">Abril 2024</option>
            <option value="2024-03">Marzo 2024</option>
            <option value="2024-02">Febrero 2024</option>
            <option value="2024-01">Enero 2024</option>
            <option value="2023-12">Diciembre 2023</option>
            <option value="2023-11">Noviembre 2023</option>
            <option value="2023-10">Octubre 2023</option>
            <option value="2023-09">Septiembre 2023</option>
            <option value="2023-08">Agosto 2023</option>
            <option value="2023-07">Julio 2023</option>
            <option value="2023-06">Junio 2023</option>
            <option value="2023-05">Mayo 2023</option>
            <option value="2023-04">Abril 2023</option>
            <option value="2023-03">Marzo 2023</option>
            <option value="2023-02">Febrero 2023</option>
            <option value="2023-01">Enero 2023</option>
            <option value="2022-12">Diciembre 2022</option>
            <option value="2022-11">Noviembre 2022</option>
            <option value="2022-10">Octubre 2022</option>
            <option value="2022-09">Septiembre 2022</option>
            <option value="2022-08">Agosto 2022</option>
            <option value="2022-07">Julio 2022</option>
            <option value="2022-06">Junio 2022</option>
            <option value="2022-05">Mayo 2022</option>
            <option value="2022-04">Abril 2022</option>
            <option value="2022-03">Marzo 2022</option>
            <option value="2022-02">Febrero 2022</option>
            <option value="2022-01">Enero 2022</option>
            <option value="2021-12">Diciembre 2021</option>
            <option value="2021-11">Noviembre 2021</option>
            <option value="2021-10">Octubre 2021</option>
            <option value="2021-09">Septiembre 2021</option>
            <option value="2021-08">Agosto 2021</option>
          </select>
        </div>
      </header>
  
      <div v-if="cargando" class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
  
      <template v-else>
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          
          <div class="bg-white rounded-xl shadow-sm p-4 border-t-4 border-indigo-500">
            <p class="text-[10px] uppercase text-slate-500 font-bold tracking-wider">1. NOI (Net Operating Income)</p>
            <p class="text-xl font-bold text-slate-900 mt-1">{{ formatCLP(kpisGlobales.noi) }}</p>
            <p class="text-xs mt-2" :class="kpisGlobales.margenNoi >= 0.7 ? 'text-emerald-600' : 'text-amber-500'">
              Margen: {{ (kpisGlobales.margenNoi * 100).toFixed(1) }}% (Ideal 70%-85%)
            </p>
          </div>
  
          <div class="bg-white rounded-xl shadow-sm p-4 border-t-4" :class="kpisGlobales.ocupacion >= 0.95 ? 'border-emerald-500' : 'border-rose-500'">
            <p class="text-[10px] uppercase text-slate-500 font-bold tracking-wider">2. Ocupación Física</p>
            <p class="text-xl font-bold text-slate-900 mt-1">{{ (kpisGlobales.ocupacion * 100).toFixed(1) }}%</p>
            <p class="text-xs mt-2 text-slate-500">
              Benchmark: >95% sano
            </p>
          </div>
  
          <div class="bg-white rounded-xl shadow-sm p-4 border-t-4 border-blue-500">
            <p class="text-[10px] uppercase text-slate-500 font-bold tracking-wider">3. Ingreso x m²</p>
            <p class="text-xl font-bold text-slate-900 mt-1">{{ formatUF(kpisGlobales.ingresoM2) }} UF/m²</p>
            <p class="text-xs mt-2 text-emerald-600 font-medium">
              ↑ Crecimiento Sano
            </p>
          </div>
  
          <div class="bg-white rounded-xl shadow-sm p-4 border-t-4" :class="claseBordeDeudaEbitda">
            <p class="text-[10px] uppercase text-slate-500 font-bold tracking-wider">4. Deuda Neta / EBITDA</p>
            <p
              v-if="deudaEbitdaMostrable"
              class="text-xl font-bold mt-1"
              :class="kpisGlobales.deudaEbitda > 7 ? 'text-rose-600' : 'text-slate-900'"
            >
              {{ Number(kpisGlobales.deudaEbitda).toFixed(1) }}x
            </p>
            <p v-else class="text-xl font-bold mt-1 text-slate-500">N/A</p>
            <p class="text-xs mt-2 text-slate-500">
              Deuda (mapeo) / EBITDA YTD · norma tributaria · Objetivo ≤6.0x
            </p>
          </div>
  
          <div class="bg-white rounded-xl shadow-sm p-4 border-t-4" :class="kpisGlobales.ltv <= 0.65 ? 'border-emerald-500' : 'border-rose-500'">
            <p class="text-[10px] uppercase text-slate-500 font-bold tracking-wider">5. LTV (Loan to Value)</p>
            <p class="text-xl font-bold text-slate-900 mt-1">{{ (kpisGlobales.ltv * 100).toFixed(1) }}%</p>
            <p class="text-xs mt-2 text-slate-500">
              Controlado: &lt;65%
            </p>
          </div>
        </div>
  
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div class="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Rendimiento Operacional por Activo
            </h2>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead class="bg-slate-100 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th class="px-4 py-3">Activo</th>
                  <th class="px-4 py-3 text-right">GLA (m²)</th>
                  <th class="px-4 py-3 text-right">Ocupación</th>
                  <th class="px-4 py-3 text-right">Ingreso/m² (UF)</th>
                  <th class="px-4 py-3 text-right">NOI Mensual</th>
                  <th class="px-4 py-3 text-right">Cap Rate</th>
                  <th class="px-4 py-3 text-center">WAULT</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="activo in activosData" :key="activo.id" class="hover:bg-slate-50 transition-colors">
                  <td class="px-4 py-3 font-medium text-slate-800">{{ activo.nombre }}</td>
                  <td class="px-4 py-3 text-right text-slate-600 font-mono">{{ formatNumber(activo.gla) }}</td>
                  <td class="px-4 py-3 text-right font-mono">
                    <span :class="activo.ocupacion < 0.9 ? 'text-rose-600 font-bold' : 'text-emerald-600'">
                      {{ (activo.ocupacion * 100).toFixed(1) }}%
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right text-slate-600 font-mono">{{ activo.ingresoM2.toFixed(2) }}</td>
                  <td class="px-4 py-3 text-right text-slate-800 font-mono font-semibold">{{ formatCLP(activo.noi) }}</td>
                  <td class="px-4 py-3 text-right text-slate-600 font-mono">{{ (activo.capRate * 100).toFixed(1) }}%</td>
                  <td class="px-4 py-3 text-center text-slate-600 font-mono">
                    <span :class="activo.wault < 2 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'" class="px-2 py-0.5 rounded text-xs font-bold">
                      {{ activo.wault }} años
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
  
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white rounded-xl shadow-sm p-5 border border-slate-200">
            <h2 class="font-bold text-slate-800 mb-4">Evolución NOI vs Deuda/EBITDA</h2>
            <apexchart type="line" height="300" :options="chartOptionsEvolucion" :series="chartSeriesEvolucion"></apexchart>
          </div>
          <div class="bg-white rounded-xl shadow-sm p-5 border border-slate-200">
            <h2 class="font-bold text-slate-800 mb-4">Mix Comercial (% GLA)</h2>
            <apexchart type="donut" height="300" :options="chartOptionsMix" :series="chartSeriesMix"></apexchart>
          </div>
        </div>
      </template>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted } from 'vue';
  import { computeKpiDeudaSobreEbitda } from '../utils/kpiActivosDeudaEbitda.js';
  
  const props = defineProps({
    empresa: { type: String, default: 'FIDELMIRA' },
  });
  
  const filtroMes = ref('2026-04');
  const cargando = ref(true);
  
  // Estado Reactivo para los datos
  const kpisGlobales = ref({});
  const activosData = ref([]);
  const chartSeriesEvolucion = ref([]);
  const chartSeriesMix = ref([]);

  const deudaEbitdaMostrable = computed(() => {
    const r = kpisGlobales.value?.deudaEbitda;
    return r != null && Number.isFinite(Number(r));
  });

  const claseBordeDeudaEbitda = computed(() => {
    const r = kpisGlobales.value?.deudaEbitda;
    if (r == null || !Number.isFinite(Number(r))) return 'border-slate-300';
    return Number(r) <= 6 ? 'border-emerald-500' : 'border-orange-500';
  });
  
  // ---------------------------------------------------------
  // CONTRATO DE DATOS (MOCK API)
  // Así es exactamente como el Backend deberá enviarte el JSON
  // ---------------------------------------------------------
  const mockApiData = {
    "2026-04": {
      kpis: {
        noi: 850000000, 
        margenNoi: 0.78, 
        ocupacion: 0.96, 
        ingresoM2: 0.65, 
        deudaEbitda: null,
        ltv: 0.58 
      },
      activos: [
        { id: 1, nombre: 'Mall Centro', gla: 12500, ocupacion: 0.98, ingresoM2: 0.70, noi: 450000000, capRate: 0.065, wault: 4.2 },
        { id: 2, nombre: 'Strip Center Sur', gla: 4200, ocupacion: 0.92, ingresoM2: 0.55, noi: 300000000, capRate: 0.072, wault: 3.1 },
        { id: 3, nombre: 'Edificio Oficinas', gla: 1800, ocupacion: 0.85, ingresoM2: 0.60, noi: 100000000, capRate: 0.080, wault: 1.5 },
      ],
      evolucion: [
        { name: 'NOI (MM$)', type: 'column', data: [780, 800, 810, 850] },
        { name: 'Deuda/EBITDA (x)', type: 'line', data: [10.2, 9.8, 9.5, 9.1] }
      ],
      mixComercial: [45, 25, 15, 10, 5]
    },
    "2026-03": {
      kpis: {
        noi: 810000000, margenNoi: 0.76, ocupacion: 0.94, ingresoM2: 0.63, deudaEbitda: null, ltv: 0.59 
      },
      activos: [
        { id: 1, nombre: 'Mall Centro', gla: 12500, ocupacion: 0.97, ingresoM2: 0.68, noi: 430000000, capRate: 0.065, wault: 4.3 },
        { id: 2, nombre: 'Strip Center Sur', gla: 4200, ocupacion: 0.90, ingresoM2: 0.54, noi: 280000000, capRate: 0.072, wault: 3.2 },
        { id: 3, nombre: 'Edificio Oficinas', gla: 1800, ocupacion: 0.82, ingresoM2: 0.59, noi: 100000000, capRate: 0.080, wault: 1.6 },
      ],
      evolucion: [
        { name: 'NOI (MM$)', type: 'column', data: [760, 780, 800, 810] },
        { name: 'Deuda/EBITDA (x)', type: 'line', data: [10.5, 10.2, 9.8, 9.5] }
      ],
      mixComercial: [46, 24, 15, 10, 5]
    }
  };
  
  // ---------------------------------------------------------
  // SIMULADOR DE LLAMADA AL BACKEND
  // ---------------------------------------------------------
  const cargarDatos = () => {
    cargando.value = true;
    
    // Simulamos un retraso de red de 600ms
    setTimeout(() => {
      const data = mockApiData[filtroMes.value];
      
      const kpiDeuda = computeKpiDeudaSobreEbitda(props.empresa, filtroMes.value, 'Trib');
      kpisGlobales.value = {
        ...data.kpis,
        deudaEbitda: kpiDeuda.ratio,
      };
      activosData.value = data.activos;
      chartSeriesEvolucion.value = data.evolucion;
      chartSeriesMix.value = data.mixComercial;
      
      cargando.value = false;
    }, 600);
  };
  
  // Configuraciones estáticas de Gráficos
  const chartOptionsMix = ref({
    chart: { type: "donut", fontFamily: "inherit" },
    labels: ["Retail Ancla", "Servicios", "Gastronomía", "Salud", "Otros"],
    colors: ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#64748B"],
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    legend: { position: "bottom" },
  });
  
  const chartOptionsEvolucion = ref({
    chart: { fontFamily: "inherit", toolbar: { show: false } },
    colors: ["#10B981", "#EF4444"],
    stroke: { width: [0, 3] },
    xaxis: { categories: ["Hace 3 Meses", "Hace 2 Meses", "Mes Anterior", "Mes Actual"] },
    yaxis: [
      { title: { text: 'NOI (MM$)' }, labels: { formatter: (val) => "$" + val + "M" } },
      { opposite: true, title: { text: 'Ratio (x)' }, labels: { formatter: (val) => val + "x" } }
    ],
  });
  
  // Helpers de formato
  const formatCLP = (v) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(v);
  const formatNumber = (v) => new Intl.NumberFormat("es-CL").format(v);
  const formatUF = (v) => new Intl.NumberFormat("es-CL", { minimumFractionDigits: 2 }).format(v);
  
  // Carga inicial
  onMounted(() => {
    cargarDatos();
  });
  </script>