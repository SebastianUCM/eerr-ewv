<template>
  <div class="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800 dark:bg-slate-950 dark:text-slate-200">
    <!-- Encabezado + filtros -->
    <header class="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Estado de resultados — Informe</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Cierre {{ mesNombre(mesHasta) }} {{ filtroAnio }} ·
          {{ modo === 'acumulado' ? 'Acumulado (Sociedad EWV)' : 'Comparativo por empresa' }}
        </p>
      </div>

      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div class="flex flex-wrap items-center gap-2">
          <select v-model.number="filtroAnio" :class="selCls">
            <option v-for="a in aniosDisponibles" :key="a" :value="a">{{ a }}</option>
          </select>
          <select v-model.number="mesDesde" :class="selCls">
            <option v-for="m in 12" :key="'d-' + m" :value="m">Desde {{ mesCorto(m) }}</option>
          </select>
          <select v-model.number="mesHasta" :class="selCls">
            <option v-for="m in 12" :key="'h-' + m" :value="m">Hasta {{ mesCorto(m) }}</option>
          </select>
          <select v-model="tipoEerr" :class="selCls">
            <option value="financiero">Financiero</option>
            <option value="contable">Contable</option>
          </select>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800">
            <button type="button" :class="modo === 'acumulado' ? segActive : segIdle" @click="modo = 'acumulado'">
              Acumulado
            </button>
            <button type="button" :class="modo === 'empresa' ? segActive : segIdle" @click="modo = 'empresa'">
              Por empresa
            </button>
          </div>
          <button type="button" :class="btnGhost" @click="toggleTodo">
            {{ hayAlgoAbierto ? 'Contraer todo' : 'Expandir todo' }}
          </button>
          <button type="button" :class="btnExcel" @click="descargarExcel">Descargar Excel</button>
          <button type="button" :class="btnPdf" @click="descargarPdf">Descargar PDF</button>
        </div>

        <div v-if="modo === 'empresa'" class="flex flex-wrap items-center gap-1.5">
          <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Empresas:</span>
          <button
            v-for="e in props.empresasDisponibles"
            :key="e"
            type="button"
            :class="empresasSel.includes(e) ? chipOn : chipOff"
            @click="toggleEmpresa(e)"
          >
            {{ e }}
          </button>
        </div>
      </div>
    </header>

    <!-- Tarjetas de caja + participación (editables por período) -->
    <div class="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div :class="cardBase">
        <div class="flex items-start justify-between gap-2">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400">Banco / Caja "Sociedad EWV"</p>
          <button type="button" class="shrink-0 text-slate-400 hover:text-indigo-600" title="Editar valor del período" @click="empezarEdit('banco')">✎</button>
        </div>
        <input v-if="editar === 'banco'" ref="inp" type="number" v-model.number="draft" :class="editInput"
          @blur="guardar('banco')" @keyup.enter="guardar('banco')" />
        <p v-else class="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-white">$ {{ formatMiles(cajaBanco) }}</p>
      </div>

      <div :class="cardBase">
        <div class="flex items-start justify-between gap-2">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400">FI BTG Pactual Renta Comercial</p>
          <button type="button" class="shrink-0 text-slate-400 hover:text-indigo-600" title="Editar valor del período" @click="empezarEdit('btg')">✎</button>
        </div>
        <input v-if="editar === 'btg'" ref="inp" type="number" v-model.number="draft" :class="editInput"
          @blur="guardar('btg')" @keyup.enter="guardar('btg')" />
        <p v-else class="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-white">$ {{ formatMiles(cajaBtg) }}</p>
      </div>

      <div :class="cardAccent">
        <p class="text-xs font-medium text-indigo-100">Posición total</p>
        <p class="mt-1 font-mono text-lg font-semibold tabular-nums text-white">$ {{ formatMiles(cajaBanco + cajaBtg) }}</p>
      </div>

      <div :class="cardBase" class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <p class="text-xs font-medium text-slate-500 dark:text-slate-400">Participación</p>
            <button type="button" class="text-slate-400 hover:text-indigo-600" title="Editar" @click="empezarEdit('participacion')">✎</button>
          </div>
          <input v-if="editar === 'participacion'" ref="inp" type="number" step="0.01" v-model.number="draft" :class="editInput" style="max-width: 7rem"
            @blur="guardar('participacion')" @keyup.enter="guardar('participacion')" />
          <p v-else class="mt-1 font-mono text-lg font-semibold text-slate-900 dark:text-white">{{ participacion }}%</p>
        </div>
        <span class="shrink-0 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          {{ mesNombre(mesHasta) }} {{ filtroAnio }}
        </span>
      </div>
    </div>

    <!-- Informe -->
    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
              <th class="sticky left-0 z-10 min-w-[20rem] bg-slate-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide dark:bg-slate-800/60">
                Concepto
              </th>
              <th
                v-for="col in columnas"
                :key="col.key"
                class="min-w-[9rem] px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide"
                :class="col.key === '__acum__' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' : ''"
              >
                {{ col.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="fila in filasVisibles"
              :key="fila.key"
              :class="claseFila(fila)"
              @click="fila.tieneHijos ? toggle(fila.key) : null"
            >
              <td
                class="sticky left-0 z-[5] px-4 py-2 pr-3 font-inherit"
                :class="[claseCeldaConcepto(fila), fila.tieneHijos ? 'cursor-pointer' : '']"
                :style="{ paddingLeft: 16 + fila.depth * 18 + 'px' }"
              >
                <span class="inline-flex items-center gap-1.5">
                  <span class="w-3 text-slate-400" aria-hidden="true">{{ fila.tieneHijos ? (abiertas[fila.key] ? '▾' : '▸') : '' }}</span>
                  <span>{{ fila.label }}</span>
                </span>
              </td>
              <td
                v-for="col in columnas"
                :key="fila.key + col.key"
                class="px-4 py-2 text-right font-mono tabular-nums"
                :class="[claseValor(fila, valor(fila, col.key)), col.key === '__acum__' ? 'bg-indigo-50/40 font-semibold dark:bg-indigo-950/20' : '']"
              >
                {{ formatCLPContable(valor(fila, col.key)) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="mt-3 px-1 text-[11px] text-slate-400">
      Clic en las filas con ▸ para bajar de nivel. Los ingresos operacionales se agrupan por propiedad (centro de costo).
      Estructura y montos alineados con el resumen gerencial existente.
    </p>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from "vue";
import * as XLSX from "xlsx";
import eerrDataRaw from "../assets/datos_vue.json";
import detalleRaw from "../assets/detalle_movimientos.json";
import mapeoCuentas from "../assets/config/mapeo_cuentas.json";
import comparativoGerencial from "../assets/config/comparativo_gerencial.json";
import appUi from "../assets/config/app_ui.json";
import { normAnio, mapearDatosAnioEerr, filtrarFilasPorRangoMes } from "../utils/kpiEerr.js";
import { calcularMatrizResumenGerencial } from "../utils/eerrResumenGerencial.js";
import { descargarInformeEerrPdf } from "../utils/informeEerrPdf.js";

const props = defineProps({
  empresasDisponibles: { type: Array, required: true },
});

const selCls =
  "rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200";
const segActive = "rounded-md px-3 py-1 text-xs font-semibold text-white bg-indigo-600 shadow-sm";
const segIdle = "rounded-md px-3 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300";
const btnGhost =
  "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";
const btnExcel =
  "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
const btnPdf =
  "rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
const chipOn = "rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white";
const chipOff =
  "rounded-full border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-indigo-400 dark:border-slate-600 dark:text-slate-300";
const cardBase = "rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900";
const cardAccent = "rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 p-3 shadow-sm";
const editInput =
  "mt-1 w-full rounded-md border border-indigo-300 bg-white px-2 py-1 font-mono text-lg font-semibold text-slate-900 outline-none focus:border-indigo-500 dark:border-indigo-600 dark:bg-slate-800 dark:text-white";

const filtroAnio = ref(new Date().getFullYear());
const mesDesde = ref(1);
const mesHasta = ref(12);
const tipoEerr = ref("financiero");
const modo = ref("acumulado");
const empresasSel = ref([]);
const abiertas = ref({});

// Valores de caja/participación editables por período (se guardan en el navegador).
const LS_KEY = "informeEerr_overrides";
const overrides = ref({});
const editar = ref(null);
const draft = ref(0);
const inp = ref(null);

const periodoKey = computed(() => `${filtroAnio.value}-${String(mesHasta.value).padStart(2, "0")}`);
function ov(tipo) {
  return overrides.value[periodoKey.value]?.[tipo];
}
const cfgCaja = computed(() => appUi.informeEerr?.caja?.porPeriodo?.[periodoKey.value] || {});
function cajaEnLibros(key) {
  const f = matrizGerencial.value.filas.find((x) => x.key === key);
  return f ? -(Number(f.acumulado) || 0) : 0;
}
const cajaBanco = computed(() => {
  const o = ov("banco");
  if (o != null) return o;
  if (cfgCaja.value.banco != null) return cfgCaja.value.banco;
  return cajaEnLibros("banco_caja_ewv");
});
const cajaBtg = computed(() => {
  const o = ov("btg");
  if (o != null) return o;
  if (cfgCaja.value.btg != null) return cfgCaja.value.btg;
  return cajaEnLibros("fi_btg_pactual");
});
const participacion = computed(() => {
  const o = ov("participacion");
  if (o != null) return o;
  return appUi.informeEerr?.participacion ?? 28.43;
});

// Impuesto a la renta = Resultado antes de impuestos × tasa (automático desde Softland).
const tasaImpuesto = computed(() => appUi.informeEerr?.tasaImpuesto ?? 0.27);

function empezarEdit(tipo) {
  draft.value = tipo === "participacion" ? participacion.value : tipo === "banco" ? cajaBanco.value : cajaBtg.value;
  editar.value = tipo;
  nextTick(() => inp.value && inp.value.focus());
}
function guardar(tipo) {
  const k = periodoKey.value;
  const next = { ...overrides.value, [k]: { ...(overrides.value[k] || {}), [tipo]: Number(draft.value) || 0 } };
  overrides.value = next;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch (e) {
    void e;
  }
  editar.value = null;
}

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const mesNombre = (m) => MESES[Number(m) - 1] || "";
const mesCorto = (m) => (MESES[Number(m) - 1] || "").slice(0, 3);

const SUBITEM_LABEL = {
  arriendos: "Arriendos",
  gastos_comunes: "Gastos comunes",
  consumos: "Consumos",
  servicios_basicos: "Servicios básicos",
  varios: "Varios",
  sin_subitem: "Otros",
};
const formatNombre = (t) => String(t || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const labelSubitem = (s) => SUBITEM_LABEL[s] || formatNombre(s);

function filasPorEmpresa(emp) {
  return eerrDataRaw.filter((d) => String(d.Empresa).trim() === String(emp).trim());
}

const aniosDisponibles = computed(() => {
  const set = new Set();
  (props.empresasDisponibles || []).forEach((emp) => filasPorEmpresa(emp).forEach((d) => set.add(normAnio(d.Anio))));
  const arr = Array.from(set).sort((a, b) => b - a);
  return arr.length ? arr : [new Date().getFullYear()];
});

const empresasActivas = computed(() => {
  const disp = props.empresasDisponibles || [];
  const sel = empresasSel.value.filter((e) => disp.includes(e));
  return sel.length ? sel : disp;
});

watch([mesDesde, mesHasta], () => {
  if (mesDesde.value > mesHasta.value) mesHasta.value = mesDesde.value;
});
watch(aniosDisponibles, (arr) => {
  if (arr.length && !arr.includes(filtroAnio.value)) filtroAnio.value = arr[0];
});

onMounted(() => {
  empresasSel.value = [...(props.empresasDisponibles || [])];
  if (aniosDisponibles.value.length) filtroAnio.value = aniosDisponibles.value[0];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) overrides.value = JSON.parse(raw) || {};
  } catch (e) {
    void e;
  }
});

const mappedPorEmpresa = computed(() => {
  const out = {};
  for (const e of empresasActivas.value) {
    out[e] = filtrarFilasPorRangoMes(
      mapearDatosAnioEerr(e, filtroAnio.value, tipoEerr.value, filasPorEmpresa(e), mapeoCuentas),
      mesDesde.value,
      mesHasta.value
    );
  }
  return out;
});

const matrizGerencial = computed(() => {
  const emps = empresasActivas.value;
  if (!emps.length) return { empresas: [], filas: [] };
  const datosPorEmpresa = {};
  for (const emp of emps) datosPorEmpresa[emp] = filasPorEmpresa(emp);
  return calcularMatrizResumenGerencial(emps, {
    anio: filtroAnio.value,
    mesDesde: mesDesde.value,
    mesHasta: mesHasta.value,
    tipoEerr: tipoEerr.value,
    datosPorEmpresa,
    mapeoCuentas,
    config: comparativoGerencial,
  });
});

function nodoVacio(emps) {
  const v = {};
  emps.forEach((e) => (v[e] = 0));
  return v;
}
function sumaValores(dest, src, emps) {
  emps.forEach((e) => (dest[e] = (dest[e] || 0) + (Number(src[e]) || 0)));
}
function acumular(valores, emps) {
  return emps.reduce((s, e) => s + (Number(valores[e]) || 0), 0);
}

// Detalle (factura/proveedor) indexado por cuenta||centro, filtrado por empresa/año/rango de meses.
const detalleIndex = computed(() => {
  const emps = new Set(empresasActivas.value);
  const anio = Number(filtroAnio.value);
  const d = Math.min(mesDesde.value, mesHasta.value);
  const h = Math.max(mesDesde.value, mesHasta.value);
  const idx = new Map();
  for (const r of detalleRaw) {
    if (!emps.has(r.Empresa)) continue;
    if (Number(r.Anio) !== anio) continue;
    const m = Number(r.Mes);
    if (m < d || m > h) continue;
    const k = String(r.CodigoCuenta) + "||" + String(r.CodigoCentroCosto);
    if (!idx.has(k)) idx.set(k, []);
    idx.get(k).push(r);
  }
  return idx;
});

// Nodos hoja de facturas para un par (cuenta, centro).
function nodosFactura(cuentaCod, centroCod, depth) {
  const emps = empresasActivas.value;
  const k = String(cuentaCod) + "||" + String(centroCod);
  const lineas = detalleIndex.value.get(k) || [];
  return lineas
    .slice()
    .sort((a, b) => String(a.Fecha).localeCompare(String(b.Fecha)))
    .map((ln, i) => {
      const v = nodoVacio(emps);
      v[ln.Empresa] = Number(ln.SaldoNeto) || 0;
      const partes = [ln.Fecha, ln.Entidad || ln.Glosa];
      if (ln.Doc) partes.push(ln.Doc);
      if (ln.Rut) partes.push(ln.Rut);
      return {
        key: `f|${k}|${i}`,
        label: partes.filter(Boolean).join("  ·  "),
        depth,
        kind: "factura",
        valores: v,
        acumulado: Number(ln.SaldoNeto) || 0,
        children: [],
      };
    });
}

// Ingresos operacionales agrupados por propiedad (centro de costo) → subitem → cuenta.
const ingresosOperacionales = computed(() => {
  const emps = empresasActivas.value;
  const props0 = new Map();
  for (const emp of emps) {
    for (const r of mappedPorEmpresa.value[emp] || []) {
      if (r.Categoria !== "ingreso_explotacion") continue;
      const ccCod = String(r.CodigoCentroCosto ?? "000").trim() || "000";
      if (!props0.has(ccCod)) {
        props0.set(ccCod, {
          codigo: ccCod,
          nombre: r.CentroCosto || (ccCod === "000" ? "Sin centro de costo" : ccCod),
          valores: nodoVacio(emps),
          subs: new Map(),
        });
      }
      const prop = props0.get(ccCod);
      const punto = { [emp]: Number(r.SaldoNeto) || 0 };
      sumaValores(prop.valores, punto, emps);

      const subKey = r.Subitem || "sin_subitem";
      if (!prop.subs.has(subKey)) prop.subs.set(subKey, { key: subKey, valores: nodoVacio(emps), cuentas: new Map() });
      const sub = prop.subs.get(subKey);
      sumaValores(sub.valores, punto, emps);

      const ctaKey = String(r.CodigoCuenta ?? "").trim();
      if (!sub.cuentas.has(ctaKey)) sub.cuentas.set(ctaKey, { codigo: ctaKey, nombre: r.NombreCuenta || ctaKey, valores: nodoVacio(emps) });
      sumaValores(sub.cuentas.get(ctaKey).valores, punto, emps);
    }
  }

  const propiedades = Array.from(props0.values())
    .sort((a, b) => acumular(b.valores, emps) - acumular(a.valores, emps))
    .map((prop) => ({
      key: "io|" + prop.codigo,
      label: (prop.codigo !== "000" ? prop.codigo + " · " : "") + formatNombre(prop.nombre),
      depth: 1,
      kind: "grupo",
      valores: prop.valores,
      acumulado: acumular(prop.valores, emps),
      children: Array.from(prop.subs.values())
        .sort((a, b) => acumular(b.valores, emps) - acumular(a.valores, emps))
        .map((sub) => ({
          key: "io|" + prop.codigo + "|" + sub.key,
          label: labelSubitem(sub.key),
          depth: 2,
          kind: "linea",
          valores: sub.valores,
          acumulado: acumular(sub.valores, emps),
          children: Array.from(sub.cuentas.values())
            .sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }))
            .map((cta) => ({
              key: "io|" + prop.codigo + "|" + sub.key + "|" + cta.codigo,
              label: (cta.codigo ? cta.codigo + " " : "") + formatNombre(cta.nombre),
              depth: 3,
              kind: "cuenta",
              valores: cta.valores,
              acumulado: acumular(cta.valores, emps),
              children: nodosFactura(cta.codigo, prop.codigo, 4),
            })),
        })),
    }));

  const valores = nodoVacio(emps);
  propiedades.forEach((p) => sumaValores(valores, p.valores, emps));
  return {
    key: "ingresos_operacionales",
    label: "Ingresos operacionales",
    depth: 0,
    kind: "seccion",
    tone: "ingreso",
    valores,
    acumulado: acumular(valores, emps),
    children: propiedades,
  };
});

const TONO_POR_SECCION = {
  ingresos_no_operacionales: "ingreso",
  gastos_comunes_servicios: "gasto",
  gastos_adm_ventas: "gasto",
  resultado_antes_impuestos: "resultado",
  retiros_mutuos: "neutro",
};
const SECCIONES_CAJA = new Set(["banco_caja_ewv", "fi_btg_pactual"]);

function nodoDesdeGerencial(fila, depth) {
  const children = [];
  for (const sf of fila.subfilas || []) children.push(nodoDesdeGerencial(sf, depth + 1));
  if (!(fila.subfilas && fila.subfilas.length) && fila.tieneCuentas) {
    for (const c of fila.cuentas || []) {
      const centros = (c.centros || []).map((cc) => {
        const cod = String(cc.codigo ?? "").trim();
        const esSinCentro = !cod || cod === "000";
        return {
          key: fila.key + "|c|" + c.key + "|cc|" + cc.key,
          label: (esSinCentro ? "" : cod + " · ") + (esSinCentro ? "Sin centro de costo" : formatNombre(cc.nombre || cod)),
          depth: depth + 2,
          kind: "centro",
          valores: cc.valoresPorEmpresa,
          acumulado: cc.acumulado,
          children: nodosFactura(c.codigo, cod, depth + 3),
        };
      });
      children.push({
        key: fila.key + "|c|" + c.key,
        label: (c.codigo ? c.codigo + " " : "") + formatNombre(c.nombre),
        depth: depth + 1,
        kind: "cuenta",
        valores: c.valoresPorEmpresa,
        acumulado: c.acumulado,
        children: centros,
      });
    }
  }
  return {
    key: fila.key,
    label: depth === 0 ? fila.label : formatNombre(String(fila.label || "").toLowerCase()),
    depth,
    kind: depth === 0 ? "seccion" : "grupo",
    tone: depth === 0 ? TONO_POR_SECCION[fila.key] || "neutro" : undefined,
    valores: fila.valoresPorEmpresa,
    acumulado: fila.acumulado,
    children,
  };
}

// Aplica Impuesto a la renta = Resultado × tasa, y Utilidad = Resultado − Impuesto.
function aplicarImpuesto(nodo, emps, tasa) {
  if (nodo.key !== "resultado_antes_impuestos") return nodo;
  const imp = {};
  const util = {};
  emps.forEach((e) => {
    const r = Number(nodo.valores[e]) || 0;
    imp[e] = -(r * tasa);
    util[e] = r + imp[e];
  });
  const impAcum = acumular(imp, emps);
  const utilAcum = acumular(util, emps);
  const children = (nodo.children || []).map((ch) => {
    if (/impuesto/i.test(ch.key)) {
      return { ...ch, label: `Impuesto a la renta (${Math.round(tasa * 100)}%)`, valores: imp, acumulado: impAcum, children: [] };
    }
    if (/utilidad/i.test(ch.key)) {
      return { ...ch, valores: util, acumulado: utilAcum, children: [] };
    }
    return ch;
  });
  return { ...nodo, children };
}

const secciones = computed(() => {
  const emps = empresasActivas.value;
  const out = [ingresosOperacionales.value];
  for (const fila of matrizGerencial.value.filas) {
    if (SECCIONES_CAJA.has(fila.key)) continue;
    let nodo = nodoDesdeGerencial(fila, 0);
    if (fila.key === "resultado_antes_impuestos") nodo = aplicarImpuesto(nodo, emps, tasaImpuesto.value);
    out.push(nodo);
  }
  return out;
});

const columnas = computed(() => {
  const cols = [];
  if (modo.value === "empresa") {
    for (const e of empresasActivas.value) cols.push({ key: e, label: e });
  }
  cols.push({ key: "__acum__", label: modo.value === "empresa" ? "Sociedad EWV" : "Sociedad EWV" });
  return cols;
});

function valor(fila, colKey) {
  if (colKey === "__acum__") return Number(fila.acumulado) || 0;
  return Number(fila.valores?.[colKey]) || 0;
}

const filasVisibles = computed(() => {
  const out = [];
  const walk = (node) => {
    const tieneHijos = (node.children || []).length > 0;
    out.push({ ...node, tieneHijos });
    if (tieneHijos && abiertas.value[node.key]) node.children.forEach(walk);
  };
  secciones.value.forEach(walk);
  return out;
});

const hayAlgoAbierto = computed(() => Object.values(abiertas.value).some(Boolean));

function toggle(key) {
  abiertas.value = { ...abiertas.value, [key]: !abiertas.value[key] };
}
function toggleEmpresa(e) {
  empresasSel.value = empresasSel.value.includes(e)
    ? empresasSel.value.filter((x) => x !== e)
    : [...empresasSel.value, e];
}
function toggleTodo() {
  if (hayAlgoAbierto.value) {
    abiertas.value = {};
    return;
  }
  const todas = {};
  const walk = (node) => {
    if ((node.children || []).length) {
      todas[node.key] = true;
      node.children.forEach(walk);
    }
  };
  secciones.value.forEach(walk);
  abiertas.value = todas;
}

watch(
  secciones,
  () => {
    if (Object.keys(abiertas.value).length) return;
    const init = {};
    secciones.value.forEach((s) => {
      if ((s.children || []).length) init[s.key] = true;
    });
    abiertas.value = init;
  },
  { immediate: true }
);

// Estilos por fila
function claseFila(fila) {
  if (fila.kind === "seccion") return "border-t-2 border-slate-200 dark:border-slate-700";
  if (fila.kind === "grupo") return "border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40";
  return "border-b border-slate-50 hover:bg-slate-50/60 dark:border-slate-800/60 dark:hover:bg-slate-800/30";
}
function claseCeldaConcepto(fila) {
  const bg = "bg-white dark:bg-slate-900";
  if (fila.kind === "seccion") {
    const tono =
      fila.tone === "ingreso"
        ? "text-emerald-800 dark:text-emerald-300"
        : fila.tone === "gasto"
        ? "text-rose-800 dark:text-rose-300"
        : fila.tone === "resultado"
        ? "text-indigo-800 dark:text-indigo-300"
        : "text-slate-800 dark:text-slate-200";
    return `bg-slate-50 dark:bg-slate-800/50 text-[13px] font-bold uppercase tracking-wide ${tono}`;
  }
  if (fila.kind === "grupo") return `${bg} font-semibold text-slate-700 dark:text-slate-200`;
  if (fila.kind === "linea") return `${bg} font-medium text-slate-600 dark:text-slate-300`;
  if (fila.kind === "centro") return `${bg} text-slate-400 dark:text-slate-500 text-[12px] italic`;
  if (fila.kind === "factura") return `${bg} text-slate-400 dark:text-slate-500 text-[11px]`;
  return `${bg} text-slate-500 dark:text-slate-400 text-[13px]`;
}
function claseValor(fila, v) {
  const neg = v < 0 ? "text-rose-600 dark:text-rose-400" : "";
  if (fila.kind === "seccion") return `font-bold ${v < 0 ? "text-rose-700 dark:text-rose-400" : "text-slate-900 dark:text-white"}`;
  if (fila.kind === "grupo") return `font-semibold ${neg || "text-slate-800 dark:text-slate-200"}`;
  return neg || "text-slate-600 dark:text-slate-300";
}

const nf = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
const formatMiles = (v) => nf.format(Math.round(Number(v) || 0));
const formatCLPContable = (v) => {
  const n = Math.round(Number(v) || 0);
  if (n === 0) return "-";
  const abs = nf.format(Math.abs(n));
  return n < 0 ? `(${abs})` : abs;
};

function descargarExcel() {
  const emps = empresasActivas.value;
  const filas = [];
  const walk = (node) => {
    const row = { Concepto: "  ".repeat(node.depth) + node.label };
    if (modo.value === "empresa") emps.forEach((e) => (row[e] = Number(node.valores?.[e]) || 0));
    row["Sociedad EWV"] = Number(node.acumulado) || 0;
    filas.push(row);
    (node.children || []).forEach(walk);
  };
  secciones.value.forEach(walk);
  if (!filas.length) return;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), "Informe EERR");
  XLSX.writeFile(wb, `informe_eerr_${filtroAnio.value}_${mesDesde.value}-${mesHasta.value}_${tipoEerr.value}.xlsx`);
}

function descargarPdf() {
  const hoy = new Date();
  const fecha = `${String(hoy.getDate()).padStart(2, "0")}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${hoy.getFullYear()}`;
  const empresasPdf = empresasActivas.value.filter((e) => e !== "WW DINAMITY SA");
  descargarInformeEerrPdf({
    secciones: secciones.value,
    empresas: empresasPdf,
    meta: {
      empresa: 'Sociedad EWV',
      periodoLabel: `Cierre ${mesNombre(mesHasta.value)} ${filtroAnio.value}` + (mesDesde.value !== mesHasta.value ? ` · desde ${mesNombre(mesDesde.value)}` : ""),
      participacion: participacion.value,
      caja: { banco: cajaBanco.value, btg: cajaBtg.value, total: cajaBanco.value + cajaBtg.value },
      fecha,
      fileBaseName: `informe_eerr_${filtroAnio.value}_${mesDesde.value}-${mesHasta.value}`,
    },
  });
}
</script>
