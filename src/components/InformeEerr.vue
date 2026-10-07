<template>
  <div class="informe-modulo min-h-screen bg-slate-50 px-4 py-4 md:px-6 font-sans text-slate-800 dark:bg-slate-950 dark:text-slate-200">
    <!-- Encabezado del módulo: título a la izquierda, controles a la derecha -->
    <header class="enc-modulo">
      <div class="enc-titulo">
        <h1>Informe EERR</h1>
        <div class="enc-chips">
          <span class="chip chip-fuerte">{{ etiquetaPeriodo(periodo) }}</span>
          <span class="chip">{{ modo === 'acumulado' ? 'Sociedad EWV · consolidado' : 'Por empresa' }}</span>
          <span class="chip">{{ tipoEerr === 'contable' ? 'Contable' : 'Financiero' }}</span>
        </div>
      </div>

      <div class="enc-controles">
        <label class="sr-only" for="informe-periodo">Período</label>
        <select id="informe-periodo" v-model="periodo" :class="selCls" title="Período">
          <option v-for="p in periodosDisponibles" :key="p" :value="p">{{ etiquetaPeriodo(p) }}</option>
        </select>

        <div class="segmento" role="group" aria-label="Tipo de EERR">
          <button type="button" :class="tipoEerr === 'financiero' ? segActive : segIdle" :aria-pressed="tipoEerr === 'financiero'" @click="tipoEerr = 'financiero'">Financiero</button>
          <button type="button" :class="tipoEerr === 'contable' ? segActive : segIdle" :aria-pressed="tipoEerr === 'contable'" @click="tipoEerr = 'contable'">Contable</button>
        </div>

        <div class="segmento" role="group" aria-label="Vista">
          <button type="button" :class="modo === 'acumulado' ? segActive : segIdle" :aria-pressed="modo === 'acumulado'" @click="modo = 'acumulado'">Consolidado</button>
          <button type="button" :class="modo === 'empresa' ? segActive : segIdle" :aria-pressed="modo === 'empresa'" @click="modo = 'empresa'">Por empresa</button>
        </div>

        <span class="separador" aria-hidden="true"></span>

        <div class="segmento" role="group" aria-label="Niveles">
          <button type="button" :class="segIdle" title="Muestra el informe como los del dueño" @click="vistaInforme">Vista informe</button>
          <button type="button" :class="segIdle" @click="expandirTodo">Expandir</button>
          <button type="button" :class="segIdle" @click="abiertas = {}">Contraer</button>
        </div>

        <span class="separador" aria-hidden="true"></span>

        <button type="button" :class="btnExcel" @click="descargarExcel">Excel</button>
        <button type="button" :class="btnPdf" title="PDF con el formato del informe, tal como se ve en pantalla" @click="descargarInformePdf">Descargar PDF</button>
      </div>

      <div v-if="modo === 'empresa'" class="enc-empresas">
        <span class="enc-label">Empresas</span>
        <button
          v-for="e in props.empresasDisponibles"
          :key="e"
          type="button"
          :class="empresasSel.includes(e) ? chipOn : chipOff"
          :aria-pressed="empresasSel.includes(e)"
          @click="toggleEmpresa(e)"
        >
          {{ e }}
        </button>
      </div>
    </header>

    <!-- Tarjetas del período (solo pantalla: no van al PDF ni al Excel) -->
    <section class="tarjetas" aria-label="Resumen del período">
      <article
        v-for="t in tarjetas"
        :key="t.key"
        class="ui-card tarjeta"
        :class="[t.ancha ? 'tarjeta-ancha' : '', t.destacada ? 'tarjeta-destacada' : '']"
        :title="t.nota"
      >
        <p class="tarjeta-titulo"><span class="punto" :class="'punto-' + t.categoria" aria-hidden="true"></span>{{ t.titulo }}</p>
        <p class="tarjeta-valor">{{ formatTarjeta(t.valor) }}</p>
        <dl v-if="t.detalle" class="tarjeta-detalle">
          <div v-for="d in t.detalle" :key="d.key">
            <dt>{{ d.label }}</dt>
            <dd>{{ formatTarjeta(d.valor) }}</dd>
          </div>
        </dl>
        <p class="tarjeta-pie">
          <span class="tarjeta-var" :class="claseVarTarjeta(t)">{{ textoVarTarjeta(t) }}</span>
          <span class="tarjeta-ant">Mes ant. {{ formatTarjeta(t.anterior) }}</span>
        </p>
      </article>
    </section>

    <div class="informe-grid" :class="{ 'modo-empresa': modo === 'empresa' }">
    <!-- Izquierda: mismo mes del año anterior -->
    <aside class="ui-card resumen resumen-izq">
      <header class="resumen-cab">
        <span class="resumen-titulo">Año anterior</span>
        <span class="resumen-periodo">{{ resumenAnioAnterior.titulo || etiquetaPeriodo(resumenAnioAnterior.periodo) }}</span>
      </header>
      <dl v-if="resumenAnioAnterior.hayDatos" class="resumen-lista">
        <div v-for="l in resumenAnioAnterior.lineas" :key="'izq-' + l.key" class="resumen-fila" :class="l.clase">
          <dt>{{ l.label }}</dt>
          <dd>{{ formatTarjeta(l.valor) }}</dd>
        </div>
      </dl>
      <p v-else class="resumen-vacio">Sin datos en Softland ni informes del dueño para este período.</p>
      <p v-if="resumenAnioAnterior.fuente" class="resumen-fuente">Fuente: {{ resumenAnioAnterior.fuente }}</p>
    </aside>

    <!-- Hoja con el formato de los informes del dueño -->
    <div class="hoja">
      <!-- Recuadro de cierre -->
      <table class="caja">
        <tbody>
          <tr><td colspan="3" class="caja-fecha">FECHA CIERRE: {{ mesNombre(mesHasta) }} {{ filtroAnio }}</td></tr>
          <tr>
            <td class="caja-label">
              Banco/CAJA "Sociedad EWV"
              <span class="tag tag-softland" :title="tituloBanco">Softland</span>
              <span v-if="saldoInicial" class="tag tag-manual" :title="`Saldo inicial al cierre de ${etiquetaPeriodo(saldoInicial.periodo)}: ${formatMiles(saldoInicial.monto)}. ${saldoInicial.fuente}. Softland no tiene este dato.`">+ saldo inicial</span>
            </td>
            <td class="pesos">$</td>
            <td class="caja-monto">{{ formatCaja(cajaBanco) }}</td>
          </tr>
          <tr>
            <td class="caja-label">
              *FI BTG Pactual Renta Comercial
              <span class="tag tag-softland" title="Saldo de la cuenta 1-1-20-04-004 en Softland al cierre del período (valor de mercado)">Softland</span>
            </td>
            <td class="pesos">$</td>
            <td class="caja-monto">{{ formatCaja(cajaBtg) }}</td>
          </tr>
          <tr class="caja-total">
            <td></td>
            <td class="pesos">$</td>
            <td class="caja-monto">{{ formatCaja(cajaBanco + cajaBtg) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="titulo">ESTADO DE RESULTADOS PRELIMINAR</div>

      <table class="participacion">
        <tbody>
          <tr>
            <td class="part-vacio"></td>
            <td class="part-label">
              Participación
              <button type="button" class="lapiz" title="Editar" @click="empezarEdit('participacion')">✎</button>
            </td>
            <td class="part-valor">
              <input v-if="editar === 'participacion'" ref="inp" type="number" step="0.01" v-model.number="draft" class="caja-input"
                @blur="guardar('participacion')" @keyup.enter="guardar('participacion')" />
              <template v-else>{{ formatPct(participacion) }}</template>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="periodo">
        {{ tituloPeriodo }}
        <span v-if="tipoEerr === 'contable'" class="periodo-nota">· EERR contable</span>
      </div>

      <div class="tabla-wrap">
        <table class="informe" :class="{ multi: modo === 'empresa' }">
          <thead v-if="modo === 'empresa'">
            <tr>
              <th></th>
              <th v-for="col in columnas" :key="col.key" colspan="2" class="col-head" :class="{ 'col-acum': col.key === '__acum__' }">{{ col.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="fila in filasVisibles"
              :key="fila.key"
              :class="['r-' + estiloFila(fila), fila.seccion === 'gastos_comunes_servicios' ? 'gcs' : '', esResaltada(fila) ? 'resaltada' : '', nivelDrill(fila) ? 'drill d' + nivelDrill(fila) : '', fila.tieneHijos ? 'clic' : '']"
              @click="fila.tieneHijos ? toggle(fila.key) : null"
            >
              <td class="concepto" :style="{ paddingLeft: sangria(fila) }">
                <span v-if="fila.tieneHijos && estiloFila(fila) !== 'sec'" class="flecha" aria-hidden="true">{{ abiertas[fila.key] ? '▾' : '▸' }}</span>{{ fila.label }}
              </td>
              <template v-for="col in columnas" :key="fila.key + col.key">
                <td class="pesos" :class="{ 'col-acum': modo === 'empresa' && col.key === '__acum__' }">{{ mostrarPesos(fila, col.key) ? '$' : '' }}</td>
                <td class="monto" :class="{ 'col-acum': modo === 'empresa' && col.key === '__acum__' }">{{ formatMonto(fila, col.key) }}</td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pie: caja otra vez, como en los informes -->
      <table class="caja caja-pie">
        <tbody>
          <tr>
            <td class="caja-label">Banco/CAJA "Sociedad EWV"</td>
            <td class="pesos">$</td>
            <td class="caja-monto">{{ formatCaja(cajaBanco) }}</td>
          </tr>
          <tr>
            <td class="caja-label">*FI BTG Pactual Renta Comercial</td>
            <td class="pesos">$</td>
            <td class="caja-monto">{{ formatCaja(cajaBtg) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Derecha: mes anterior -->
    <aside class="ui-card resumen resumen-der">
      <header class="resumen-cab">
        <span class="resumen-titulo">Mes anterior</span>
        <span class="resumen-periodo">{{ resumenMesAnterior.titulo || etiquetaPeriodo(resumenMesAnterior.periodo) }}</span>
      </header>
      <dl v-if="resumenMesAnterior.hayDatos" class="resumen-lista">
        <div v-for="l in resumenMesAnterior.lineas" :key="'der-' + l.key" class="resumen-fila" :class="l.clase">
          <dt>{{ l.label }}</dt>
          <dd>{{ formatTarjeta(l.valor) }}</dd>
        </div>
      </dl>
      <p v-else class="resumen-vacio">Sin datos en Softland para este período.</p>
    </aside>
    </div>
    <p class="mt-3 px-1 text-[11px] text-slate-400">
      Montos desde Softland. Los gastos y retiros se muestran en positivo, como en los informes del dueño.
      Clic en una línea con ▸ para ver sus cuentas y documentos. Banco/Caja = saldo inicial del informe del dueño
      (cierre de enero 2026, que Softland de WCORP no tiene) + flujos de caja mensuales calculados con Softland.
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
import { descargarInformeHojaPdf } from "../utils/informeHojaPdf.js";
import { CUENTA_CONTRIBUCIONES, esGlosaSobretasa, sobretasaPorClave, separarSobretasaEnFilas } from "../utils/sobretasa.js";

const props = defineProps({
  empresasDisponibles: { type: Array, required: true },
});

const selCls =
  "h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200";
const segActive = "h-7 rounded-md px-3 text-xs font-semibold text-indigo-700 bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-700 dark:text-white dark:ring-slate-600";
const segIdle = "h-7 rounded-md px-3 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white";
const btnExcel =
  "h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-slate-600 dark:bg-slate-800 dark:text-emerald-300 dark:hover:bg-slate-700";
const btnPdf =
  "h-8 rounded-lg bg-indigo-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400";
const chipOn = "rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white";
const chipOff =
  "rounded-full border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-indigo-400 dark:border-slate-600 dark:text-slate-300";

const filtroAnio = ref(new Date().getFullYear());
const mesDesde = ref(1);
const mesHasta = ref(12);
// Un solo selector de período (YYYY-MM): el informe siempre muestra un mes.
const periodo = ref("");
watch(periodo, (p) => {
  if (!p) return;
  filtroAnio.value = Number(p.slice(0, 4));
  mesDesde.value = Number(p.slice(5, 7));
  mesHasta.value = Number(p.slice(5, 7));
});
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
function cajaEnLibros(key) {
  const f = matrizGerencial.value.filas.find((x) => x.key === key);
  return f ? -(Number(f.acumulado) || 0) : 0;
}
// Banco/Caja como en los informes del dueño: Flujo de caja del período + Flujo de caja
// acumulado (meses anteriores del año), todo calculado desde Softland.
const cajaBanco = computed(() => {
  const retiros = secciones.value.find((s) => s.key === "retiros_mutuos");
  const hijo = (k) => Number(retiros?.children?.find((ch) => ch.key === k)?.acumulado) || 0;
  return hijo("flujo_caja") + hijo("flujo_caja_acumulado");
});
// BTG siempre desde Softland (regla principal): saldo de la cuenta al cierre del período.
const cajaBtg = computed(() => cajaEnLibros("fi_btg_pactual"));
const participacion = computed(() => {
  const o = ov("participacion");
  if (o != null) return o;
  return appUi.informeEerr?.participacion ?? 28.43;
});

// Impuesto a la renta = Resultado antes de impuestos × tasa (automático desde Softland).
const tasaImpuesto = computed(() => appUi.informeEerr?.tasaImpuesto ?? 0.27);

function empezarEdit(tipo) {
  draft.value = participacion.value;
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

const formatNombre = (t) => String(t || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// La sobretasa viene dentro de la cuenta de contribuciones: se separa por glosa
// (detalle de Softland) para que la fila SOBRETASA del informe tenga su monto.
const sobretasaMapa = sobretasaPorClave(detalleRaw);

function filasPorEmpresa(emp) {
  return separarSobretasaEnFilas(
    eerrDataRaw.filter((d) => String(d.Empresa).trim() === String(emp).trim()),
    sobretasaMapa
  );
}

const aniosDisponibles = computed(() => {
  const set = new Set();
  (props.empresasDisponibles || []).forEach((emp) => filasPorEmpresa(emp).forEach((d) => set.add(normAnio(d.Anio))));
  const arr = Array.from(set).sort((a, b) => b - a);
  return arr.length ? arr : [new Date().getFullYear()];
});

/** Períodos con movimientos de resultado en Softland, del más reciente al más antiguo. */
const periodosDisponibles = computed(() => {
  const set = new Set();
  for (const emp of props.empresasDisponibles || []) {
    for (const d of filasPorEmpresa(emp)) {
      if (!/^[45]/.test(String(d.CodigoCuenta))) continue;
      set.add(`${normAnio(d.Anio)}-${String(Number(d.Mes)).padStart(2, "0")}`);
    }
  }
  return Array.from(set).sort().reverse();
});
// Abre en el último mes con ingresos (el mes en curso suele tener solo algunos gastos).
const periodoInicial = computed(() => {
  const conIngresos = new Set();
  for (const emp of props.empresasDisponibles || []) {
    for (const d of filasPorEmpresa(emp)) {
      if (String(d.CodigoCuenta).startsWith("4")) conIngresos.add(`${normAnio(d.Anio)}-${String(Number(d.Mes)).padStart(2, "0")}`);
    }
  }
  return periodosDisponibles.value.find((p) => conIngresos.has(p)) || periodosDisponibles.value[0] || "";
});
const etiquetaPeriodo = (p) => (p ? `${mesNombre(Number(p.slice(5, 7)))} ${p.slice(0, 4)}` : "");

const empresasActivas = computed(() => {
  const disp = props.empresasDisponibles || [];
  const sel = empresasSel.value.filter((e) => disp.includes(e));
  return sel.length ? sel : disp;
});

watch(aniosDisponibles, (arr) => {
  if (arr.length && !arr.includes(filtroAnio.value)) filtroAnio.value = arr[0];
});

onMounted(() => {
  empresasSel.value = [...(props.empresasDisponibles || [])];
  if (aniosDisponibles.value.length) filtroAnio.value = aniosDisponibles.value[0];
  if (periodosDisponibles.value.length) periodo.value = periodoInicial.value;
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
/** Líneas del detalle de Softland para una cuenta + centro (con la sobretasa separada). */
function lineasDetalle(cuentaCod, centroCod, filaKey = "") {
  const k = String(cuentaCod) + "||" + String(centroCod);
  let lineas = detalleIndex.value.get(k) || [];
  // Cuenta de contribuciones: la fila SOBRETASA muestra solo esos pagos y CONTRIBUCIONES el resto.
  if (String(cuentaCod).trim() === CUENTA_CONTRIBUCIONES) {
    const esSobretasa = filaKey === "sobretasa";
    lineas = lineas.filter((ln) => esGlosaSobretasa(ln.Glosa) === esSobretasa);
  }
  return lineas;
}

/** Nodos documento (una línea de Softland cada uno). Bajo un cliente no se repite su nombre. */
function nodosDocumento(lineas, keyBase, depth, { conCliente = true } = {}) {
  const emps = empresasActivas.value;
  return lineas
    .slice()
    .sort((a, b) => String(a.Fecha).localeCompare(String(b.Fecha)))
    .map((ln, i) => {
      const v = nodoVacio(emps);
      v[ln.Empresa] = Number(ln.SaldoNeto) || 0;
      const descripcion = conCliente
        ? ln.Entidad || ln.Glosa
        : String(ln.Entidad || "").split(" / ").slice(1).join(" / ").trim() || ln.Glosa;
      const partes = [ln.Fecha, ln.Doc, descripcion];
      if (conCliente && ln.Rut) partes.push(ln.Rut);
      return {
        key: `f|${keyBase}|${i}`,
        label: partes.filter(Boolean).join("  ·  "),
        depth,
        kind: "factura",
        valores: v,
        acumulado: Number(ln.SaldoNeto) || 0,
        children: [],
      };
    });
}

function nodosFactura(cuentaCod, centroCod, depth, filaKey = "") {
  const k = String(cuentaCod) + "||" + String(centroCod);
  return nodosDocumento(lineasDetalle(cuentaCod, centroCod, filaKey), k, depth);
}

/** Ingresos: cliente (nombre de la Entidad de Softland) → documentos. */
function nodosCliente(cuentaCod, centroCod, depth) {
  const emps = empresasActivas.value;
  const k = String(cuentaCod) + "||" + String(centroCod);
  const porCliente = new Map();
  for (const ln of lineasDetalle(cuentaCod, centroCod)) {
    const cliente = String(ln.Entidad || "").split(" / ")[0].trim() || "(Sin cliente identificado)";
    if (!porCliente.has(cliente)) porCliente.set(cliente, { valores: nodoVacio(emps), lineas: [] });
    const c = porCliente.get(cliente);
    c.valores[ln.Empresa] = (c.valores[ln.Empresa] || 0) + (Number(ln.SaldoNeto) || 0);
    c.lineas.push(ln);
  }
  return Array.from(porCliente.entries())
    .map(([cliente, c]) => ({ cliente, ...c, acumulado: acumular(c.valores, emps) }))
    .sort((a, b) => Math.abs(b.acumulado) - Math.abs(a.acumulado))
    .map((c) => ({
      key: `cl|${k}|${c.cliente}`,
      label: c.cliente,
      depth,
      kind: "cliente",
      valores: c.valores,
      acumulado: c.acumulado,
      children: nodosDocumento(c.lineas, `${k}|${c.cliente}`, depth + 1, { conCliente: false }),
    }));
}

// Ingresos operacionales: propiedad (centro de costo) → cuenta → cliente → documento.
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

  // Niveles: propiedad → cuenta (Arriendo fijo, Consumos de luz…) → cliente → documento.
  const propiedades = Array.from(props0.values())
    .sort((a, b) => acumular(b.valores, emps) - acumular(a.valores, emps))
    .map((prop) => ({
      key: "io|" + prop.codigo,
      label: etiquetaPropiedad(prop.codigo, prop.nombre),
      depth: 1,
      kind: "grupo",
      valores: prop.valores,
      acumulado: acumular(prop.valores, emps),
      children: Array.from(prop.subs.values())
        .flatMap((sub) => Array.from(sub.cuentas.values()))
        .sort((a, b) => acumular(b.valores, emps) - acumular(a.valores, emps))
        .map((cta) => ({
          key: "io|" + prop.codigo + "|" + cta.codigo,
          label: String(cta.nombre || cta.codigo).trim(),
          depth: 2,
          kind: "cuenta",
          valores: cta.valores,
          acumulado: acumular(cta.valores, emps),
          children: nodosCliente(cta.codigo, prop.codigo, 3),
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
          children: nodosFactura(c.codigo, cod, depth + 3, fila.key),
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

// Resultado del informe = suma de las secciones mostradas arriba (no rollup global del motor gerencial).
function resultadoDesdeSeccionesSuperiores(nodo, seccionesPrevias, emps) {
  const valores = nodoVacio(emps);
  for (const sec of seccionesPrevias) sumaValores(valores, sec.valores, emps);
  return { ...nodo, valores, acumulado: acumular(valores, emps) };
}

// Aplica Impuesto a la renta = Resultado × tasa, y Utilidad = Resultado − Impuesto.
function aplicarImpuesto(nodo, emps, tasa) {
  if (nodo.key !== "resultado_antes_impuestos") return nodo;
  const imp = {};
  const util = {};
  emps.forEach((e) => {
    const r = Number(nodo.valores[e]) || 0;
    // Sin impuesto cuando la sociedad tiene pérdida en el periodo (no hay impuesto negativo).
    imp[e] = r > 0 ? -(r * tasa) : 0;
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
    if (fila.key === "resultado_antes_impuestos") {
      nodo = resultadoDesdeSeccionesSuperiores(nodo, out, emps);
      nodo = aplicarImpuesto(nodo, emps, tasaImpuesto.value);
    }
    if (fila.key === "retiros_mutuos") nodo = aplicarFlujoCaja(nodo, out, emps);
    out.push(nodo);
  }
  return out;
});

// ── Cálculo de un mes, por empresa (para flujos de caja y cuadros resumen) ──
// Igual que la hoja: ingresos operacionales + secciones del motor; utilidad = resultado
// − impuesto (sin impuesto si hay pérdida); flujo = utilidad + retiros (negativos).
const SECCIONES_RESULTADO = ["ingresos_no_operacionales", "gastos_comunes_servicios", "gastos_adm_ventas"];
const datosEmpresasActivas = computed(() => {
  const out = {};
  for (const e of empresasActivas.value) out[e] = filasPorEmpresa(e);
  return out;
});
const memoMeses = new Map();
function calcularMes(anio, mes) {
  const emps = empresasActivas.value;
  const clave = `${anio}|${mes}|${tipoEerr.value}|${emps.join(",")}|${tasaImpuesto.value}`;
  if (memoMeses.has(clave)) return memoMeses.get(clave);
  const datos = datosEmpresasActivas.value;
  const mg = calcularMatrizResumenGerencial(emps, {
    anio, mesDesde: mes, mesHasta: mes, tipoEerr: tipoEerr.value,
    datosPorEmpresa: datos, mapeoCuentas, config: comparativoGerencial,
  });
  const fila = (k) => mg.filas.find((f) => f.key === k);
  const porEmpresa = {};
  let hayDatos = false;
  for (const e of emps) {
    let ingOp = 0;
    for (const r of mapearDatosAnioEerr(e, anio, tipoEerr.value, datos[e], mapeoCuentas)) {
      if (r.Mes !== mes) continue;
      hayDatos = true;
      if (r.Categoria === "ingreso_explotacion") ingOp += Number(r.SaldoNeto) || 0;
    }
    const v = (k) => Number(fila(k)?.valoresPorEmpresa?.[e]) || 0;
    const res = ingOp + SECCIONES_RESULTADO.reduce((s, k) => s + v(k), 0);
    const utilidad = res > 0 ? res * (1 - tasaImpuesto.value) : res;
    const retiros = v("retiros_mutuos");
    porEmpresa[e] = {
      btg: -v("fi_btg_pactual"),
      ingOp, ingNoOp: v("ingresos_no_operacionales"), gcs: v("gastos_comunes_servicios"), gav: v("gastos_adm_ventas"),
      res, utilidad, retiros, flujo: utilidad + retiros,
    };
  }
  const out = { porEmpresa, hayDatos };
  memoMeses.set(clave, out);
  return out;
}

// Saldo inicial de Banco/Caja (app_ui.json): el saldo del dueño al cierre de un período
// que Softland de WCORP no tiene. Se suma una sola vez y desde ahí se acumulan los flujos.
const saldoInicial = computed(() => {
  const si = appUi.informeEerr?.saldoInicialCaja;
  return si?.periodo && Number(si.monto) ? si : null;
});
const indicePeriodo = (anio, mes) => Number(anio) * 12 + Number(mes);

/** Banco/Caja al cierre de (anio, mes), por empresa. */
function bancoAlCierre(anio, mes) {
  const emps = empresasActivas.value;
  const out = nodoVacio(emps);
  const si = saldoInicial.value;
  const fin = indicePeriodo(anio, mes);
  let inicio = indicePeriodo(anio, 1);
  if (si) {
    const base = indicePeriodo(si.periodo.slice(0, 4), si.periodo.slice(5, 7));
    if (fin >= base) {
      const emp = emps.includes(si.empresa) ? si.empresa : emps[0];
      if (emp) out[emp] += Number(si.monto);
      inicio = base + 1;
    }
  }
  for (let i = inicio; i <= fin; i++) {
    const a = Math.floor((i - 1) / 12);
    const m = i - a * 12;
    const calc = calcularMes(a, m);
    emps.forEach((e) => (out[e] += Number(calc.porEmpresa[e]?.flujo) || 0));
  }
  return out;
}

const tituloBanco = computed(() =>
  saldoInicial.value
    ? `Saldo inicial al cierre de ${etiquetaPeriodo(saldoInicial.value.periodo)} (${saldoInicial.value.fuente}) + flujos de caja mensuales calculados con Softland.`
    : "Flujo de caja del período + flujo de caja acumulado desde enero, calculado con Softland."
);

// ── Cuadros resumen: mes anterior (derecha) y mismo mes del año anterior (izquierda) ──
function resumenDe(anio, mes) {
  const p = `${anio}-${String(mes).padStart(2, "0")}`;
  const calc = calcularMes(anio, mes);
  const suma = (k) => Object.values(calc.porEmpresa).reduce((s, x) => s + (Number(x[k]) || 0), 0);
  return {
    periodo: p,
    hayDatos: calc.hayDatos,
    lineas: [
      { key: "io", label: "Ingresos operacionales", valor: suma("ingOp"), clase: "rs-sec" },
      { key: "ino", label: "Ingresos no operacionales", valor: suma("ingNoOp"), clase: "rs-sec" },
      { key: "gcs", label: "Gastos comunes y servicios", valor: -suma("gcs"), clase: "rs-gasto" },
      { key: "gav", label: "Gastos adm. y ventas", valor: -suma("gav"), clase: "rs-gasto" },
      { key: "res", label: "Resultado antes de impuestos", valor: suma("res"), clase: "rs-res" },
      { key: "ret", label: "Retiros y/o mutuos", valor: -suma("retiros"), clase: "rs-sec" },
    ],
  };
}
const resumenMesAnterior = computed(() =>
  mesHasta.value === 1 ? resumenDe(filtroAnio.value - 1, 12) : resumenDe(filtroAnio.value, mesHasta.value - 1)
);
// Año anterior: Softland del mismo mes si existe; si no, la suma de los informes del
// dueño de ese año (app_ui.json), indicando la fuente y los meses sin informe.
const resumenAnioAnterior = computed(() => {
  const anio = filtroAnio.value - 1;
  const softland = resumenDe(anio, mesHasta.value);
  if (softland.hayDatos) return { ...softland, titulo: etiquetaPeriodo(softland.periodo), fuente: "Softland" };
  const inf = appUi.informeEerr?.resumenInformesDueno?.[String(anio)];
  if (!inf) return { ...softland, titulo: etiquetaPeriodo(softland.periodo), fuente: "" };
  const v = inf.valores || {};
  const meses = (lista) => (lista || []).map((p) => mesNombre(Number(p.slice(5, 7))).slice(0, 3)).join(", ");
  return {
    periodo: String(anio),
    titulo: inf.periodos?.length ? `Suma informes ${meses([inf.periodos[0]])}–${meses([inf.periodos[inf.periodos.length - 1]])} ${anio}` : `Suma informes ${anio}`,
    hayDatos: true,
    fuente: inf.periodos?.length
      ? `Informes EERR. Meses sumados: ${meses([inf.periodos[0]])} a ${meses([inf.periodos[inf.periodos.length - 1]])} ${anio}`
      : "Informes EERR",
    lineas: [
      { key: "io", label: "Ingresos operacionales", valor: v.ingOp, clase: "rs-sec" },
      { key: "ino", label: "Ingresos no operacionales", valor: v.ingNoOp, clase: "rs-sec" },
      { key: "gcs", label: "Gastos comunes y servicios", valor: v.gcs, clase: "rs-gasto" },
      { key: "gav", label: "Gastos adm. y ventas", valor: v.gav, clase: "rs-gasto" },
      { key: "res", label: "Resultado antes de impuestos", valor: v.res, clase: "rs-res" },
      { key: "ret", label: "Retiros y/o mutuos", valor: v.ret, clase: "rs-sec" },
    ],
  };
});

// ── Tarjetas del período (pantalla) ───────────────────────────────────────
// Mismo cálculo que la hoja; gastos y retiros en positivo, como en el informe.
// Comparan contra el mes anterior.
function totalesMes(anio, mes) {
  const calc = calcularMes(anio, mes);
  const suma = (k) => Object.values(calc.porEmpresa).reduce((s, x) => s + (Number(x[k]) || 0), 0);
  const banco = Object.values(bancoAlCierre(anio, mes)).reduce((s, x) => s + (Number(x) || 0), 0);
  const btg = suma("btg");
  const flujo = suma("flujo");
  return {
    ingOp: suma("ingOp"), ingNoOp: suma("ingNoOp"), gcs: -suma("gcs"), gav: -suma("gav"),
    res: suma("res"), impuesto: suma("res") - suma("utilidad"), utilidad: suma("utilidad"),
    ret: -suma("retiros"), flujo, flujoAcum: banco - flujo, banco, btg, total: banco + btg,
  };
}
const tarjetas = computed(() => {
  const anio = filtroAnio.value;
  const mes = mesHasta.value;
  const act = totalesMes(anio, mes);
  const prev = mes === 1 ? totalesMes(anio - 1, 12) : totalesMes(anio, mes - 1);
  const t = (key, titulo, categoria, nota, subeEsBueno = true, extra = {}) => ({
    key, titulo, categoria, nota, subeEsBueno, valor: act[key], anterior: prev[key], ...extra,
  });
  const det = (key, label) => ({ key, label, valor: act[key] });
  // Fila 1: ingresos, gastos y saldos; fila 2 (anchas): resultado, retiros y posición total.
  return [
    t("ingOp", "Ingresos operacionales", "ingreso", "Arriendos, gastos comunes y consumos"),
    t("ingNoOp", "Ingresos no operacionales", "ingreso", "Según la configuración del informe"),
    t("gcs", "Gastos comunes y servicios", "gasto", "Consumos, servicios, mantención y seguridad", false),
    t("gav", "Gastos adm. y ventas", "gasto", "Remuneraciones, contribuciones y administración", false),
    t("banco", 'Banco/CAJA "Sociedad EWV"', "caja", "Flujo de caja del período + flujo de caja acumulado"),
    t("btg", "FI BTG Pactual Renta Comercial", "caja", "Cuenta 1-1-20-04-004 al cierre (Softland)"),
    t("res", "Resultado antes de impuestos", "resultado", "Ingresos − gastos del período", true, {
      ancha: true, destacada: true,
      detalle: [det("impuesto", "Impuesto a la renta"), det("utilidad", "Utilidad del ejercicio")],
    }),
    t("ret", "Retiros y/o mutuos", "retiro", "Dividendos y mutuos registrados en Softland", false, {
      ancha: true,
      detalle: [det("flujo", "Flujo de caja"), det("flujoAcum", "Flujo de caja acumulado")],
    }),
    t("total", "Posición total", "resultado", "Banco/Caja + FI BTG Pactual", true, {
      ancha: true, destacada: true,
      detalle: [det("banco", 'Banco/CAJA "Sociedad EWV"'), det("btg", "FI BTG Pactual Renta Comercial")],
    }),
  ];
});
const formatTarjeta = (v) => {
  const n = Math.round(Number(v) || 0);
  return n < 0 ? `-$${nf.format(-n)}` : `$${nf.format(n)}`;
};
function variacionTarjeta(t) {
  const a = Number(t.anterior) || 0;
  if (!a) return null;
  return ((Number(t.valor) - a) / Math.abs(a)) * 100;
}
function textoVarTarjeta(t) {
  const v = variacionTarjeta(t);
  if (v === null) return "—";
  return `${v >= 0 ? "▲" : "▼"} ${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}
function claseVarTarjeta(t) {
  const v = variacionTarjeta(t);
  if (v === null || Math.abs(v) < 0.05) return "var-neutra";
  return (v > 0) === t.subeEsBueno ? "var-buena" : "var-mala";
}

// Flujo de caja (período) = Utilidad + Retiros. Flujo de caja acumulado = Banco/Caja al
// cierre del mes anterior (saldo inicial + flujos). Banco/Caja = ambos.
function aplicarFlujoCaja(nodo, seccionesPrevias, emps) {
  const resultado = seccionesPrevias.find((s) => s.key === "resultado_antes_impuestos");
  const utilidad = resultado?.children?.find((ch) => /utilidad/i.test(ch.key));
  if (!utilidad) return nodo;
  const flujo = nodoVacio(emps);
  emps.forEach((e) => (flujo[e] = (Number(utilidad.valores[e]) || 0) + (Number(nodo.valores[e]) || 0)));
  // Acumulado = banco al cierre del período menos el flujo del período (como en los informes).
  const banco = bancoAlCierre(filtroAnio.value, mesHasta.value);
  const anterior = nodoVacio(emps);
  emps.forEach((e) => (anterior[e] = (Number(banco[e]) || 0) - (Number(flujo[e]) || 0)));
  const children = (nodo.children || []).map((ch) => {
    if (ch.key === "flujo_caja") return { ...ch, valores: flujo, acumulado: acumular(flujo, emps), children: [] };
    if (ch.key === "flujo_caja_acumulado") return { ...ch, valores: anterior, acumulado: acumular(anterior, emps), children: [] };
    return ch;
  });
  return { ...nodo, children };
}

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
  const walk = (node, seccion) => {
    const tieneHijos = (node.children || []).length > 0;
    out.push({ ...node, tieneHijos, seccion });
    if (tieneHijos && abiertas.value[node.key]) node.children.forEach((ch) => walk(ch, seccion));
  };
  secciones.value.forEach((s) => walk(s, s.key));
  return out;
});

function toggle(key) {
  abiertas.value = { ...abiertas.value, [key]: !abiertas.value[key] };
}
function toggleEmpresa(e) {
  empresasSel.value = empresasSel.value.includes(e)
    ? empresasSel.value.filter((x) => x !== e)
    : [...empresasSel.value, e];
}
watch(
  secciones,
  () => {
    if (Object.keys(abiertas.value).length) return;
    vistaInforme();
  },
  { immediate: true }
);

// ── Formato de los informes del dueño ─────────────────────────────────────
// Nombres de propiedad como en los informes (app_ui.json). Se lee dentro de la función:
// el informe se calcula al montar el componente, antes de las constantes de más abajo.
function etiquetaPropiedad(codigo, nombre) {
  if (!codigo || codigo === "000") return formatNombre(nombre || "Sin centro de costo").toUpperCase();
  const nombres = appUi.informeEerr?.nombresPropiedad || {};
  const num = Number(codigo);
  return `${Number.isFinite(num) ? num : codigo} - ${nombres[codigo] || String(nombre || codigo).toUpperCase()}`;
}

const tituloPeriodo = computed(() => `MES ${mesNombre(mesHasta.value).toUpperCase()} ${filtroAnio.value}`);
const formatCaja = (v) => (Math.round(Number(v) || 0) === 0 ? "-" : formatMiles(v));
const formatPct = (v) => `${new Intl.NumberFormat("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v) || 0)}%`;

const SECCIONES_GASTO = new Set(["gastos_comunes_servicios", "gastos_adm_ventas"]);
/** Gastos, impuesto y retiros se muestran en positivo, como en los informes. */
function seMuestraInvertido(fila) {
  if (SECCIONES_GASTO.has(fila.seccion)) return true;
  if (fila.depth > 0 && fila.seccion === "resultado_antes_impuestos" && /impuesto/i.test(fila.key)) return true;
  if (fila.seccion === "retiros_mutuos" && !/flujo/i.test(fila.key)) return true;
  return false;
}
function valorMostrado(fila, colKey) {
  const v = valor(fila, colKey);
  return seMuestraInvertido(fila) ? -v : v;
}
function formatMonto(fila, colKey) {
  const n = Math.round(valorMostrado(fila, colKey));
  if (n === 0) return estiloFila(fila) === "sec" || fila.depth === 0 ? "-" : "";
  return n < 0 ? `-${nf.format(-n)}` : nf.format(n);
}
function mostrarPesos(fila, colKey) {
  return Math.round(valor(fila, colKey)) !== 0 || fila.depth === 0;
}

/** Nivel de navegación bajo la vista del informe (1 = cuenta o cliente, 2 = centro o
 * documento, 3 = documento bajo un centro). 0 = fila de la vista del informe. */
function nivelDrill(fila) {
  if (fila.seccion === "ingresos_operacionales") {
    if (fila.kind === "cliente") return 1;
    if (fila.kind === "factura") return 2;
    return 0;
  }
  if (fila.kind === "cuenta") return 1;
  if (fila.kind === "centro") return 2;
  if (fila.kind === "factura") return 3;
  return 0;
}

/** Fondo suave: propiedades en ingresos y primer nivel bajo cada sección de gastos. */
function esResaltada(fila) {
  if (fila.depth !== 1) return false;
  return fila.seccion === "ingresos_operacionales" || SECCIONES_GASTO.has(fila.seccion);
}

/** Tipo visual de cada fila, según su sección y nivel. */
function estiloFila(fila) {
  if (fila.depth === 0) {
    if (SECCIONES_GASTO.has(fila.key)) return "sec-gasto";
    if (fila.key === "resultado_antes_impuestos") return "sec-resultado";
    return "sec";
  }
  if (fila.kind === "factura" || fila.kind === "centro") return "detalle";
  if (fila.seccion === "ingresos_operacionales") {
    if (fila.depth === 1) return "prop";
    if (fila.kind === "cuenta") return "linea-ing";
    return fila.kind === "cliente" ? "cliente-ing" : "detalle";
  }
  if (fila.seccion === "resultado_antes_impuestos") return "resultado-linea";
  if (fila.seccion === "retiros_mutuos") return /flujo/i.test(fila.key) ? "flujo" : "linea";
  if (fila.kind === "cuenta") return "detalle";
  if (fila.tieneHijos && (fila.children || []).some((ch) => ch.kind === "grupo")) return "subgrupo";
  return "linea";
}
function sangria(fila) {
  const e = estiloFila(fila);
  if (e === "linea-ing") return "34px";
  if (e === "cliente-ing") return "56px";
  if (e === "subgrupo") return "34%";
  if (e === "linea" && SECCIONES_GASTO.has(fila.seccion)) return fila.depth >= 2 ? "36%" : "34%";
  if (e === "detalle") return SECCIONES_GASTO.has(fila.seccion) ? `calc(38% + ${(fila.depth - 2) * 12}px)` : `${34 + (fila.depth - 2) * 22}px`;
  return "4px";
}

/** Abre el informe como los del dueño: propiedades con sus cuentas, grupos y líneas de gasto. */
function vistaInforme() {
  const abiertasVista = {};
  const walk = (node) => {
    const hijos = node.children || [];
    if (!hijos.length || node.kind === "cuenta" || node.kind === "centro") return;
    const hijosSonCuentas = hijos.every((ch) => ch.kind === "cuenta");
    if (hijosSonCuentas && !String(node.key).startsWith("io|")) return;
    abiertasVista[node.key] = true;
    hijos.forEach(walk);
  };
  secciones.value.forEach(walk);
  abiertas.value = abiertasVista;
}
function expandirTodo() {
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

function descargarInformePdf() {
  descargarInformeHojaPdf({
    meta: {
      fechaCierre: `FECHA CIERRE: ${mesNombre(mesHasta.value)} ${filtroAnio.value}`,
      titulo: tituloPeriodo.value,
      nota: tipoEerr.value === "contable" ? "EERR contable" : "",
      participacion: formatPct(participacion.value),
      banco: formatCaja(cajaBanco.value),
      btg: formatCaja(cajaBtg.value),
      total: formatCaja(cajaBanco.value + cajaBtg.value),
    },
    columnas: columnas.value.map((c) => c.label),
    filas: filasVisibles.value.map((f) => ({
      label: f.label,
      estilo: estiloFila(f),
      seccion: f.seccion,
      depth: f.depth,
      drill: nivelDrill(f),
      valores: columnas.value.map((c) => ({ pesos: mostrarPesos(f, c.key), texto: formatMonto(f, c.key) })),
    })),
    fileName: `informe_eerr_${filtroAnio.value}-${String(mesHasta.value).padStart(2, "0")}_${modo.value === "empresa" ? "por_empresa" : "consolidado"}.pdf`,
  });
}
</script>

<style scoped>
/* Encabezado del módulo */
.enc-modulo { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 20px; margin-bottom: 16px; padding: 10px 14px; background: var(--ui-fondo); border: 1px solid var(--ui-borde); border-radius: var(--ui-radio); }
.enc-titulo { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; min-width: 0; }
.enc-titulo h1 { font-size: 17px; font-weight: 700; color: #0f172a; margin: 0; }
html.dark .enc-titulo h1 { color: #fff; }
.enc-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-size: 11px; font-weight: 500; color: #475569; background: #f1f5f9; border-radius: 999px; padding: 2px 9px; white-space: nowrap; }
.chip-fuerte { color: #3730a3; background: #e0e7ff; font-weight: 600; }
html.dark .chip { color: #cbd5e1; background: #1e293b; }
html.dark .chip-fuerte { color: #c7d2fe; background: #312e81; }
.enc-controles { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.segmento { display: inline-flex; gap: 2px; padding: 2px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; }
html.dark .segmento { background: #1e293b; border-color: #334155; }
.separador { width: 1px; height: 22px; background: #e2e8f0; }
html.dark .separador { background: #334155; }
.enc-empresas { flex-basis: 100%; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding-top: 8px; border-top: 1px solid #f1f5f9; }
html.dark .enc-empresas { border-top-color: #1e293b; }
.enc-label { font-size: 10.5px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #94a3b8; }

/* ── Sistema visual del módulo: un solo componente de tarjeta para todo lo que no es
   la hoja del informe (la hoja mantiene el formato de documento del dueño). ── */
.informe-modulo {
  --ui-fondo: #ffffff; --ui-borde: #e2e8f0; --ui-texto: #0f172a; --ui-suave: #64748b; --ui-tenue: #94a3b8;
  --ui-acento: #4f46e5; --ui-acento-suave: #eef2ff; --ui-acento-borde: #c7d2fe;
  --ui-bueno: #059669; --ui-malo: #dc2626; --ui-radio: 12px;
}
html.dark .informe-modulo {
  --ui-fondo: #0f172a; --ui-borde: #1e293b; --ui-texto: #e2e8f0; --ui-suave: #94a3b8; --ui-tenue: #64748b;
  --ui-acento: #818cf8; --ui-acento-suave: rgba(99, 102, 241, 0.12); --ui-acento-borde: #3730a3;
  --ui-bueno: #34d399; --ui-malo: #f87171;
}
.ui-card { background: var(--ui-fondo); border: 1px solid var(--ui-borde); border-radius: var(--ui-radio); min-width: 0; }

/* Tarjetas: grilla de 6 columnas; las de caja ocupan 2 */
.tarjetas { display: grid; gap: 12px; margin-bottom: 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
@media (min-width: 900px) { .tarjetas { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (min-width: 1280px) {
  .tarjetas { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .tarjeta-ancha { grid-column: span 2; }
}
.tarjeta { padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; }
.tarjeta-destacada { background: var(--ui-acento-suave); border-color: var(--ui-acento-borde); }
.tarjeta-titulo { display: flex; align-items: center; gap: 7px; font-size: 11.5px; font-weight: 600; color: var(--ui-suave); }
.tarjeta-valor { font-size: 21px; font-weight: 700; color: var(--ui-texto); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.01em; }
.tarjeta-destacada .tarjeta-valor { color: var(--ui-acento); }
.tarjeta-detalle { margin: 2px 0 0; display: grid; gap: 3px; font-size: 12px; }
.tarjeta-detalle div { display: flex; justify-content: space-between; gap: 12px; padding-top: 3px; border-top: 1px dashed var(--ui-borde); }
.tarjeta-detalle dt { color: var(--ui-suave); }
.tarjeta-detalle dd { margin: 0; font-weight: 600; color: var(--ui-texto); font-variant-numeric: tabular-nums; white-space: nowrap; }
.tarjeta-pie { margin-top: auto;  display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 2px 8px; font-size: 11px; }
.tarjeta-var { font-weight: 600; }
.tarjeta-ant { color: var(--ui-tenue); font-variant-numeric: tabular-nums; }
.punto { width: 7px; height: 7px; border-radius: 999px; flex-shrink: 0; }
.punto-ingreso { background: #10b981; }
.punto-gasto { background: #ef4444; }
.punto-resultado { background: var(--ui-acento); }
.punto-retiro { background: #a855f7; }
.punto-caja { background: #0ea5e9; }
.var-buena { color: var(--ui-bueno); }
.var-mala { color: var(--ui-malo); }
.var-neutra { color: var(--ui-tenue); }

/* Cuadros de año anterior y mes anterior: mismo componente que las tarjetas */
.resumen { padding: 14px 16px; font-size: 12.5px; color: var(--ui-texto); }
.resumen-cab { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; padding-bottom: 10px; margin-bottom: 4px; border-bottom: 1px solid var(--ui-borde); }
.resumen-titulo { font-size: 11.5px; font-weight: 600; color: var(--ui-suave); }
.resumen-periodo { font-size: 12.5px; font-weight: 600; color: var(--ui-texto); white-space: nowrap; }
.resumen-lista { margin: 0; }
.resumen-fila { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px solid var(--ui-borde); }
.resumen-fila:last-child { border-bottom: 0; }
.resumen-fila dt { color: var(--ui-suave); min-width: 0; }
.resumen-fila dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.resumen-fila.rs-res { margin: 2px -8px; padding: 7px 8px; border-radius: 8px; border-bottom: 0; background: var(--ui-acento-suave); }
.resumen-fila.rs-res dt { color: var(--ui-texto); font-weight: 600; }
.resumen-fila.rs-res dd { color: var(--ui-acento); }
.resumen-vacio { color: var(--ui-suave); font-size: 12px; line-height: 1.5; padding-top: 6px; }
.resumen-fuente { margin-top: 10px; color: var(--ui-tenue); font-size: 11px; line-height: 1.45; }

/* Rejilla: resumen año anterior | hoja | resumen mes anterior. */
.informe-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; align-items: start; }
.informe-grid .hoja { order: 1; width: 100%; }
.informe-grid .resumen-izq { order: 2; }
.informe-grid .resumen-der { order: 3; }
@media (min-width: 900px) {
  .informe-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .informe-grid .hoja { grid-column: 1 / -1; }
}
@media (min-width: 1440px) {
  /* Los resúmenes usan el ancho que sobra a los lados de la hoja. */
  .informe-grid { grid-template-columns: minmax(280px, 1fr) minmax(0, 880px) minmax(280px, 1fr); }
  .informe-grid .hoja { grid-column: auto; order: 2; }
  .informe-grid .resumen-izq { order: 1; position: sticky; top: 72px; }
  .informe-grid .resumen-der { order: 3; position: sticky; top: 72px; }
  .informe-grid .resumen-fila dt { white-space: nowrap; }
}
/* Por empresa: la hoja usa todo el ancho y los resúmenes quedan abajo. */
.informe-grid.modo-empresa { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); justify-content: stretch; }
.informe-grid.modo-empresa .hoja { grid-column: 1 / -1; order: 1; max-width: none; }
.informe-grid.modo-empresa .resumen-izq { order: 2; position: static; }
.informe-grid.modo-empresa .resumen-der { order: 3; position: static; }
.tag-manual { background: #fef3c7; color: #92400e; }
html.dark .tag-manual { background: #451a03; color: #fcd34d; }

/* Hoja con el formato de los informes del dueño (Excel → PDF, carta). */
.hoja {
  --tinta: #111827;
  --papel: #ffffff;
  --borde: #111827;
  --suave: #6b7280;
  --rojo: #d0021b;
  --azul: #1f4e8c;
  --azul-claro: #4a7fc1;
  --tag-soft-bg: #d1fae5;
  --tag-soft-fg: #065f46;
  --resalte: #f2f6fc;
  max-width: 880px;
  margin: 0 auto;
  padding: 28px 32px 36px;
  background: var(--papel);
  color: var(--tinta);
  border: 1px solid var(--ui-borde);
  border-radius: var(--ui-radio);
  font-family: Arial, Helvetica, sans-serif;
  font-size: 13px;
}
html.dark .hoja {
  --tinta: #e5e7eb;
  --papel: #0f172a;
  --borde: #cbd5e1;
  --suave: #94a3b8;
  --rojo: #f87171;
  --azul: #93c5fd;
  --azul-claro: #93c5fd;
  --tag-soft-bg: #064e3b;
  --tag-soft-fg: #6ee7b7;
  --resalte: rgba(148, 163, 184, 0.09);
  border-color: #334155;
}
.hoja table { width: 100%; border-collapse: collapse; }
.tabla-wrap { overflow-x: auto; margin-top: 4px; }
.pesos { width: 28px; text-align: center; white-space: nowrap; }
.lapiz { margin-left: 6px; color: var(--suave); font-size: 12px; }
.lapiz:hover { color: var(--azul); }
.tag { margin-left: 6px; padding: 1px 6px; border-radius: 999px; font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; vertical-align: 2px; }
.tag-softland { background: var(--tag-soft-bg); color: var(--tag-soft-fg); }

/* Recuadro de cierre */
.caja { border: 2px solid var(--borde); margin-bottom: 26px; }
.caja td { border-bottom: 1px solid var(--borde); padding: 3px 6px; }
.caja-fecha { color: var(--rojo); font-style: italic; font-size: 17px; }
.caja-label { font-weight: 700; font-size: 14px; }
.caja-monto { text-align: right; font-weight: 700; font-size: 18px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.caja .pesos { font-weight: 700; font-size: 18px; }
.caja-total td { color: var(--azul-claro); font-style: italic; font-weight: 400; }
.caja-total .caja-monto, .caja-total .pesos { font-weight: 400; font-size: 15px; }
.caja-input { width: 100%; text-align: right; font: inherit; border: 1px solid var(--azul-claro); background: transparent; color: inherit; padding: 1px 4px; }
.caja-pie { margin: 30px 0 0; border-width: 0; }
.caja-pie tr { border-top: 1px solid var(--borde); }
.caja-pie td { padding: 4px 6px; }

/* Título y participación */
.titulo { border: 1px solid var(--borde); padding: 3px 6px; font-weight: 700; font-size: 16px; margin-bottom: 10px; }
.participacion { margin-bottom: 12px; }
.participacion td { padding: 3px 6px; }
.part-vacio { width: 30%; }
.part-label { border: 1px solid var(--borde); font-size: 11px; }
.part-valor { border: 1px solid var(--borde); text-align: right; font-size: 11px; width: 30%; }
.periodo { font-weight: 700; padding: 4px 4px 3px; border-bottom: 1px solid var(--borde); margin-bottom: 10px; }
.periodo-nota { font-weight: 400; color: var(--suave); font-size: 11px; }

/* Cuerpo del informe */
.informe td { padding: 2px 4px; vertical-align: bottom; }
.informe .concepto { text-align: left; }
.informe .monto { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; width: 130px; }
.informe .col-head { text-align: right; font-size: 10.5px; font-weight: 700; color: var(--suave); padding: 4px 4px 5px; border-bottom: 1px solid var(--borde); white-space: nowrap; }
.informe.multi { min-width: 760px; }
.informe.multi .monto { width: 108px; }
.informe.multi .pesos { width: 16px; }
.informe .col-acum { background: rgba(74, 127, 193, 0.08); font-weight: 700; }
.informe .col-head.col-acum { color: var(--azul); }
.flecha { display: inline-block; width: 12px; color: var(--suave); font-style: normal; }
tr.clic { cursor: pointer; }
tr.clic:hover td { background: rgba(74, 127, 193, 0.07); }

tr.r-sec td, tr.r-sec-gasto td, tr.r-sec-resultado td { font-weight: 700; font-size: 13px; padding-top: 16px; border-bottom: 1px solid var(--borde); }
tr.r-sec .concepto, tr.r-sec-gasto .concepto { text-transform: uppercase; }
tr.r-sec-gasto .pesos, tr.r-sec-gasto .monto { color: var(--rojo); font-size: 15px; }
tr.r-sec .monto, tr.r-sec .pesos, tr.r-sec-resultado .monto, tr.r-sec-resultado .pesos { font-size: 14px; }
tr.r-prop td { font-size: 12px; padding-top: 5px; text-transform: uppercase; }
tr.r-linea-ing td { font-size: 11px; font-style: italic; color: var(--azul); }
tr.r-linea-ing .concepto { text-transform: uppercase; }
tr.r-linea-ing .monto, tr.r-linea-ing .pesos { color: var(--tinta); font-style: normal; font-size: 12px; }
tr.r-subgrupo td { font-size: 11px; font-weight: 700; font-style: italic; text-transform: uppercase; padding-top: 4px; }
tr.r-linea td { font-size: 11px; font-style: italic; color: var(--azul); }
tr.r-linea.gcs .concepto { text-transform: uppercase; }
tr.r-resultado-linea td { font-size: 12px; border-bottom: 1px solid var(--borde); }
tr.r-flujo td { font-size: 12px; color: var(--rojo); border-bottom: 1px solid var(--borde); }
tr.r-flujo .concepto { color: var(--tinta); }
tr.r-cliente-ing td { font-size: 11px; color: var(--tinta); }
tr.r-detalle td { font-size: 10.5px; color: var(--suave); }
tr.resaltada td { background: var(--resalte); }

/* Niveles de navegación bajo la vista del informe: franja y fondo progresivos. */
tr.drill td { background: var(--drill-bg); }
tr.drill .concepto { box-shadow: inset 3px 0 0 var(--drill-linea); }
tr.drill.d1 { --drill-bg: #f7f9fc; --drill-linea: #93c5fd; }
tr.drill.d2 { --drill-bg: #f1f4f9; --drill-linea: #a5b4fc; }
tr.drill.d3 { --drill-bg: #eceff5; --drill-linea: #cbd5e1; }
html.dark tr.drill.d1 { --drill-bg: rgba(148, 163, 184, 0.06); --drill-linea: #3b82f6; }
html.dark tr.drill.d2 { --drill-bg: rgba(148, 163, 184, 0.1); --drill-linea: #6366f1; }
html.dark tr.drill.d3 { --drill-bg: rgba(148, 163, 184, 0.14); --drill-linea: #64748b; }
tr.drill.d1 td { font-size: 11px; }
tr.drill.d2 td { font-size: 10.5px; }
tr.drill.d3 td { font-size: 10px; }
tr.r-cliente-ing.drill td { color: var(--tinta); }
</style>
