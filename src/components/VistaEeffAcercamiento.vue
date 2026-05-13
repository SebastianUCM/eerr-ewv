<template>
  <div class="min-h-screen bg-slate-50 p-6 md:p-8">
    <header class="mb-6">
      <h1 class="text-2xl font-bold text-slate-900">
        Estados financieros — acercamiento
      </h1>
      <p class="text-sm text-slate-600 mt-1">
        <span class="font-mono text-indigo-700">{{ empresa }}</span>
        · Periodos por <strong>año + mes</strong> según snapshots (mensual
        <code class="bg-slate-100 px-1 rounded">YYYY-MM</code> o trimestre
        <code class="bg-slate-100 px-1 rounded">YYYY-Qn</code>). Origen típico:
        <strong>cwmovim</strong> + <strong>cwpctas</strong>; opcional vistas
        <strong>CW_vsnpSaldoCuenta</strong> / <strong>CW_vsnpSalCtaIFRS</strong>
        (ver <code class="bg-slate-100 px-1 rounded">public/docs/contabilidad_softland.md</code>).
      </p>
    </header>

    <div class="flex flex-wrap items-end gap-4 mb-6 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-col gap-1 min-w-[14rem]">
        <span class="text-xs font-semibold uppercase text-slate-500">Lectura Softland</span>
        <div class="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
          <button
            type="button"
            :disabled="esUltimoExtracto"
            :class="modoSoftland === MODO_MOV ? tabModoActivo : tabModoIdle"
            @click="setModoSoftland(MODO_MOV)"
          >
            Movimiento del periodo
          </button>
          <button
            type="button"
            :disabled="esUltimoExtracto"
            :class="modoSoftland === MODO_CIERRE ? tabModoActivo : tabModoIdle"
            @click="setModoSoftland(MODO_CIERRE)"
          >
            Saldo a fecha
          </button>
        </div>
        <p class="text-[11px] text-slate-500 max-w-xs leading-snug">
          <span v-if="esUltimoExtracto" class="text-amber-800"
            >Último extracto: el modo lo fija <code class="bg-slate-100 px-0.5 rounded">extract_contabilidad.py</code> (ver meta cargada abajo).</span
          >
          <template v-else>
            <span v-if="modoSoftland === MODO_MOV">Suma neto solo entre las fechas del snapshot (variación del periodo).</span>
            <span v-else>Saldo acumulado hasta la fecha de cierre (todos los movimientos con CpbFec ≤ hasta).</span>
          </template>
        </p>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-xs font-semibold uppercase text-slate-500">Origen</span>
        <label class="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-700">
          <input v-model="esUltimoExtracto" type="checkbox" class="rounded border-slate-300 text-indigo-600" />
          Último extracto (pipeline actual)
        </label>
      </div>

      <div class="flex flex-col gap-1 min-w-[10rem]">
        <label class="text-xs font-semibold uppercase text-slate-500">Norma</label>
        <select
          v-model="filtroNorma"
          :disabled="esUltimoExtracto"
          class="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm disabled:opacity-50"
          @change="onCambioNormaFuente"
        >
          <option value="todos">Todas</option>
          <option value="nch">NCH / local</option>
          <option value="ifrs">IFRS</option>
        </select>
      </div>

      <div class="flex flex-col gap-1 min-w-[12rem]">
        <label class="text-xs font-semibold uppercase text-slate-500">Fuente SQL</label>
        <select
          v-model="filtroFuente"
          :disabled="esUltimoExtracto"
          class="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm disabled:opacity-50"
          @change="onCambioNormaFuente"
        >
          <option value="todos">Todas</option>
          <option value="cwmovim">cwmovim</option>
          <option value="cwmovim_cpb">cwmovim (Cpb año/mes)</option>
          <option value="saldo_vista">Vista saldos</option>
          <option value="ifrs">Vista IFRS</option>
        </select>
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold uppercase text-slate-500">Año</label>
        <select
          v-model.number="filtroAnio"
          :disabled="esUltimoExtracto"
          class="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm disabled:opacity-50"
        >
          <option v-for="a in añosDisponibles" :key="a" :value="a">{{ a }}</option>
        </select>
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold uppercase text-slate-500">Mes</label>
        <select
          v-model.number="filtroMesCierre"
          :disabled="esUltimoExtracto || mesesDisponiblesParaAnio.length === 0"
          class="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm disabled:opacity-50"
          @change="onCambioFiltroCmf"
        >
          <option v-for="m in mesesDisponiblesParaAnio" :key="m" :value="m">
            {{ String(m).padStart(2, "0") }} — {{ etiquetaMesCierre(m) }}
          </option>
        </select>
      </div>

      <div v-if="snapshotsSinInferir.length" class="flex flex-col gap-1 min-w-[12rem]">
        <label class="text-xs font-semibold uppercase text-slate-500">Snapshot (avanzado)</label>
        <select
          v-model="snapshotId"
          class="border border-amber-200 rounded-lg px-3 py-2 text-sm bg-amber-50 shadow-sm"
          @change="cargarDatos"
        >
          <option v-for="s in snapshotsSinInferir" :key="s.id" :value="s.id">
            {{ s.label }} ({{ s.id }})
          </option>
        </select>
      </div>

      <span v-if="metaPeriodo" class="text-xs text-slate-500 pb-2">
        {{ metaPeriodo }}
      </span>
    </div>

    <div
      v-if="errorCarga"
      class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      {{ errorCarga }}
    </div>

    <div v-else class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
          <p class="text-xs uppercase text-emerald-700 font-semibold">Total activos</p>
          <p class="text-2xl font-bold text-slate-900 mt-1">
            ${{ formatear(totalActivos) }}
          </p>
        </div>
        <div class="rounded-xl border border-rose-200 bg-white p-4 shadow-sm">
          <p class="text-xs uppercase text-rose-700 font-semibold">Total pasivos</p>
          <p class="text-2xl font-bold text-slate-900 mt-1">
            ${{ formatear(totalPasivos) }}
          </p>
        </div>
        <div class="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
          <p class="text-xs uppercase text-blue-700 font-semibold">Total patrimonio</p>
          <p class="text-2xl font-bold text-slate-900 mt-1">
            ${{ formatear(totalPatrimonio) }}
          </p>
        </div>
      </div>

      <div
        class="rounded-xl border p-4"
        :class="
          cuadreOk
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-amber-200 bg-amber-50'
        "
      >
        <p class="text-sm font-medium text-slate-800">
          Cuadre contable (activo ≈ pasivo + patrimonio)
        </p>
        <p class="text-lg font-mono mt-1">
          Diferencia: ${{ formatear(diferenciaCuadre) }}
          <span v-if="cuadreOk" class="text-emerald-700 text-sm ml-2">✓ Coherente</span>
          <span v-else class="text-amber-800 text-sm ml-2"
            >(puede deberse a cierre parcial o cuentas de orden)</span
          >
        </p>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 class="text-sm font-semibold text-slate-800">
            Resumen por tipo de cuenta (plan Softland)
          </h2>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b border-slate-100 text-left text-slate-600">
                <th class="px-4 py-2 font-medium">Concepto</th>
                <th class="px-4 py-2 font-medium text-right">Monto</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr>
                <td class="px-4 py-2">Activos (Tipo 1)</td>
                <td class="px-4 py-2 text-right font-mono">${{ formatear(totalActivos) }}</td>
              </tr>
              <tr>
                <td class="px-4 py-2">Pasivos (Tipo 2)</td>
                <td class="px-4 py-2 text-right font-mono">${{ formatear(totalPasivos) }}</td>
              </tr>
              <tr>
                <td class="px-4 py-2">Patrimonio (Tipo 3)</td>
                <td class="px-4 py-2 text-right font-mono">${{ formatear(totalPatrimonio) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 bg-slate-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 class="text-sm font-semibold text-slate-800">Detalle por cuenta</h2>
          <input
            v-model="filtroDetalle"
            type="search"
            placeholder="Buscar por código o nombre…"
            class="w-full sm:max-w-xs border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white shadow-sm"
            autocomplete="off"
          />
        </div>
        <div class="overflow-x-auto max-h-[min(70vh,720px)] overflow-y-auto">
          <table class="min-w-full text-sm">
            <thead class="sticky top-0 bg-slate-100 z-10 shadow-sm">
              <tr class="border-b border-slate-200 text-left text-slate-600">
                <th class="px-4 py-2 font-medium whitespace-nowrap">Tipo</th>
                <th class="px-4 py-2 font-medium whitespace-nowrap">Código</th>
                <th class="px-4 py-2 font-medium min-w-[12rem]">Nombre</th>
                <th class="px-4 py-2 font-medium text-right whitespace-nowrap">Saldo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="(c, idx) in cuentasFiltradas"
                :key="`${c.Codigo}-${idx}`"
                class="hover:bg-slate-50/80"
              >
                <td class="px-4 py-1.5 text-slate-600 whitespace-nowrap">
                  {{ etiquetaTipo(c.Tipo) }}
                </td>
                <td class="px-4 py-1.5 font-mono text-xs text-slate-800 whitespace-nowrap">
                  {{ c.Codigo }}
                </td>
                <td class="px-4 py-1.5 text-slate-700 max-w-xl truncate" :title="nombreCuenta(c)">
                  {{ nombreCuenta(c) }}
                </td>
                <td
                  class="px-4 py-1.5 text-right font-mono tabular-nums"
                  :class="saldoNegativo(c) ? 'text-rose-700' : 'text-slate-900'"
                >
                  ${{ formatearDetalle(c.Saldo_Actual) }}
                </td>
              </tr>
            </tbody>
          </table>
          <p
            v-if="cuentasFiltradas.length === 0 && cuentas.length > 0"
            class="px-4 py-6 text-sm text-slate-500 text-center"
          >
            Ninguna cuenta coincide con la búsqueda.
          </p>
          <p
            v-if="cuentas.length === 0 && !errorCarga"
            class="px-4 py-6 text-sm text-slate-500 text-center"
          >
            Sin movimientos para mostrar.
          </p>
        </div>
        <div class="px-4 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
          Mostrando {{ cuentasFiltradas.length }} de {{ cuentas.length }} cuentas con saldo distinto de cero.
        </div>
      </div>

      <p class="text-xs text-slate-500 max-w-3xl">
        Nota: Para añadir periodos, ejecuta
        <code class="bg-slate-100 px-1 rounded">python script/extract_contabilidad_snapshot.py</code>
        con <code class="bg-slate-100 px-1 rounded">--fuente cwmovim|saldo_vista|ifrs</code>, fechas y
        <code class="bg-slate-100 px-1 rounded">--id</code> (p. ej.
        <code class="bg-slate-100 px-1 rounded">2025-01</code>). Batch mensual:
        <code class="bg-slate-100 px-1 rounded">script/snapshot_mensual_softland.ps1</code>.
        Documentación: <code class="bg-slate-100 px-1 rounded">public/docs/contabilidad_softland.md</code>.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { inferirCierreDesdeId, etiquetaMesCierre } from "../utils/cmfPeriodo.js";
import {
  MODO_MOVIMIENTO as MODO_MOV,
  MODO_SALDO_CIERRE as MODO_CIERRE,
  ORDEN_FUENTE,
  modoDesdeSnapshot,
  normaDesdeSnapshot,
  fuenteDesdeSnapshot,
  etiquetaModo,
} from "../utils/softlandContabilidad.js";

const props = defineProps({
  empresa: { type: String, required: true },
});

const contabilidadUrls = import.meta.glob("../assets/data/*/contabilidad.json", {
  query: "?url",
  import: "default",
  eager: true,
});
const historicoIndexUrls = import.meta.glob("../assets/data/*/historico/index.json", {
  query: "?url",
  import: "default",
  eager: true,
});
const historicoJsonUrls = import.meta.glob("../assets/data/*/historico/*.json", {
  query: "?url",
  import: "default",
  eager: true,
});

const FETCH_JSON = { cache: "no-store" };

const snapshots = ref([]);
const snapshotId = ref("live");
const cuentas = ref([]);
const meta = ref(null);
const errorCarga = ref("");
const filtroDetalle = ref("");

/** Alineado a extract_contabilidad / snapshot: movimiento en rango vs saldo acumulado hasta fecha. */
const modoSoftland = ref(MODO_CIERRE);

const tabModoActivo =
  "rounded-md px-2.5 py-1.5 text-xs font-medium bg-indigo-600 text-white shadow-sm disabled:opacity-45 disabled:cursor-not-allowed";
const tabModoIdle =
  "rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-white disabled:opacity-45 disabled:cursor-not-allowed";

function setModoSoftland(m) {
  if (modoSoftland.value === m) return;
  modoSoftland.value = m;
  if (!esUltimoExtracto.value) {
    sincronizarFiltrosTrasIndice();
    aplicarFiltroCmfASnapshot();
    cargarDatos();
  } else {
    cargarDatos();
  }
}

const esUltimoExtracto = ref(true);
const filtroAnio = ref(new Date().getFullYear());
const filtroMesCierre = ref(12);
/** @type {import('vue').Ref<'todos'|'nch'|'ifrs'>} */
const filtroNorma = ref("todos");
/** @type {import('vue').Ref<'todos'|'cwmovim'|'saldo_vista'|'ifrs'>} */
const filtroFuente = ref("todos");

/** Snapshots con id distinto de live y meta inferida desde id. */
const snapshotsEnriquecidos = computed(() => {
  return (snapshots.value || []).map((s) => {
    const inf = inferirCierreDesdeId(s.id);
    return {
      ...s,
      anio: inf?.anio ?? null,
      mesCierre: inf?.mesCierre ?? null,
      modoSoftland: modoDesdeSnapshot(s),
    };
  });
});

/** Snapshots del modo actual + norma/fuente (para filtros CMF). */
const snapshotsFiltradosModo = computed(() =>
  snapshotsEnriquecidos.value.filter((s) => {
    if (s.id === "live") return true;
    if (s.modoSoftland !== modoSoftland.value) return false;
    const n = normaDesdeSnapshot(s);
    const f = fuenteDesdeSnapshot(s);
    if (filtroNorma.value !== "todos" && n !== filtroNorma.value) return false;
    if (filtroFuente.value !== "todos" && f !== filtroFuente.value) return false;
    return true;
  })
);

/** Snapshots cuyo id no sigue 20XX-Qn (se eligen manualmente). */
const snapshotsSinInferir = computed(() =>
  snapshotsEnriquecidos.value.filter(
    (s) => s.id !== "live" && (s.anio == null || s.mesCierre == null)
  )
);

const añosDisponibles = computed(() => {
  const set = new Set();
  snapshotsFiltradosModo.value.forEach((s) => {
    if (s.id !== "live" && s.anio != null) set.add(s.anio);
  });
  const y = [...set].sort((a, b) => b - a);
  if (y.length === 0) return [new Date().getFullYear()];
  return y;
});

/** Meses 1–12 que existen en el índice para el año (mensual o trimestre como 3/6/9/12). */
const mesesDisponiblesParaAnio = computed(() => {
  const a = filtroAnio.value;
  const meses = new Set();
  snapshotsFiltradosModo.value.forEach((s) => {
    if (s.id !== "live" && s.anio === a && s.mesCierre != null) {
      meses.add(s.mesCierre);
    }
  });
  return [...meses].sort((x, y) => x - y);
});

function contabilidadUrlEmpresa(emp) {
  const key = Object.keys(contabilidadUrls).find((k) =>
    k.replace(/\\/g, "/").includes(`/${emp}/contabilidad.json`)
  );
  return key ? contabilidadUrls[key] : null;
}

function historicoIndexUrlEmpresa(emp) {
  const key = Object.keys(historicoIndexUrls).find((k) =>
    k.replace(/\\/g, "/").includes(`/${emp}/historico/index.json`)
  );
  return key ? historicoIndexUrls[key] : null;
}

function urlParaDatos(emp, archivo) {
  const baseName = archivo.replace(/^\.\.\//, "").split("/").pop();
  if (archivo === "../contabilidad.json" || baseName === "contabilidad.json") {
    const u = contabilidadUrlEmpresa(emp);
    if (u) return u;
    return null;
  }
  if (baseName === "index.json") return null;
  const key = Object.keys(historicoJsonUrls).find((k) => {
    const n = k.replace(/\\/g, "/");
    return n.includes(`/${emp}/historico/`) && n.endsWith("/" + baseName);
  });
  if (key) return historicoJsonUrls[key];
  return null;
}

/** Misma fecha (año/mes): prioriza cwmovim → vista saldos → IFRS. */
function candidatosMismaFecha(anio, mesCierre) {
  const list = snapshotsFiltradosModo.value.filter(
    (s) => s.id !== "live" && s.anio === anio && s.mesCierre === mesCierre
  );
  return list.sort((x, y) => {
    const ox = ORDEN_FUENTE[fuenteDesdeSnapshot(x)] ?? 9;
    const oy = ORDEN_FUENTE[fuenteDesdeSnapshot(y)] ?? 9;
    return ox - oy;
  });
}

function onCambioNormaFuente() {
  if (esUltimoExtracto.value) return;
  aplicarFiltroCmfASnapshot();
  cargarDatos();
}

function aplicarFiltroCmfASnapshot() {
  if (esUltimoExtracto.value) {
    snapshotId.value = "live";
    return;
  }
  const a = filtroAnio.value;
  const m = filtroMesCierre.value;
  const candidatos = candidatosMismaFecha(a, m);
  if (candidatos.length) {
    snapshotId.value = candidatos[0].id;
  }
}

function onCambioFiltroCmf() {
  aplicarFiltroCmfASnapshot();
  cargarDatos();
}

watch(filtroAnio, () => {
  if (esUltimoExtracto.value) return;
  const meses = mesesDisponiblesParaAnio.value;
  if (meses.length && !meses.includes(filtroMesCierre.value)) {
    filtroMesCierre.value = meses[meses.length - 1];
  }
  aplicarFiltroCmfASnapshot();
  cargarDatos();
});

watch(
  () => mesesDisponiblesParaAnio.value,
  (meses) => {
    if (!meses.length) return;
    if (!meses.includes(filtroMesCierre.value)) {
      filtroMesCierre.value = meses[meses.length - 1];
    }
  },
  { immediate: true }
);

watch(esUltimoExtracto, (ult) => {
  if (ult) {
    snapshotId.value = "live";
    cargarDatos();
  } else {
    if (añosDisponibles.value.length) {
      filtroAnio.value = añosDisponibles.value[0];
    }
    const meses = mesesDisponiblesParaAnio.value;
    if (meses.length) filtroMesCierre.value = meses[meses.length - 1];
    aplicarFiltroCmfASnapshot();
    if (
      snapshotId.value === "live" &&
      snapshotsSinInferir.value.length > 0
    ) {
      snapshotId.value = snapshotsSinInferir.value[0].id;
    }
    cargarDatos();
  }
});

watch(
  () => props.empresa,
  async () => {
    esUltimoExtracto.value = true;
    snapshotId.value = "live";
    await cargarIndice();
    sincronizarFiltrosTrasIndice();
    await cargarDatos();
  }
);

const esTipo = (c, t) => String(c.Tipo) === String(t);

const totalActivos = computed(() =>
  cuentas.value
    .filter((c) => esTipo(c, "1"))
    .reduce((a, c) => a + Number(c.Saldo_Actual ?? 0), 0)
);

const totalPasivos = computed(() =>
  Math.abs(
    cuentas.value
      .filter((c) => esTipo(c, "2"))
      .reduce((a, c) => a + Number(c.Saldo_Actual ?? 0), 0)
  )
);

const totalPatrimonio = computed(() =>
  Math.abs(
    cuentas.value
      .filter((c) => esTipo(c, "3"))
      .reduce((a, c) => a + Number(c.Saldo_Actual ?? 0), 0)
  )
);

const diferenciaCuadre = computed(() => {
  const act = totalActivos.value;
  const der = totalPasivos.value + totalPatrimonio.value;
  return act - der;
});

const cuadreOk = computed(() => {
  const tol = Math.max(1, Math.abs(totalActivos.value) * 0.001);
  return Math.abs(diferenciaCuadre.value) < tol;
});

const metaPeriodo = computed(() => {
  if (!meta.value) return "";
  const m = meta.value;
  let txt = "";
  if (m.fecha_desde && m.fecha_hasta) {
    txt = `Rango: ${m.fecha_desde} → ${m.fecha_hasta}`;
  } else if (m.fecha_hasta) {
    txt = `Saldo acumulado hasta ${m.fecha_hasta}`;
  }
  if (m.modo_softland) {
    const fd = m.fuente_datos || "cwmovim";
    const base =
      m.modo_softland === MODO_CIERRE ? "Saldo a fecha" : "Movimiento del periodo";
    txt += (txt ? " · " : "") + `${base} · ${fd}`;
    if (m.norma) txt += ` · norma ${String(m.norma).toUpperCase()}`;
    if (m.alcance && m.alcance !== "individual") txt += ` · ${m.alcance}`;
  }
  if (m.tablas_softland) txt += ` · ${m.tablas_softland}`;
  return txt;
});

const cuentasFiltradas = computed(() => {
  const q = filtroDetalle.value.trim().toLowerCase();
  let list = [...cuentas.value];
  if (q) {
    list = list.filter((c) => {
      const cod = String(c.Codigo ?? "").toLowerCase();
      const nom = String(c.Nombre ?? "").toLowerCase();
      return cod.includes(q) || nom.includes(q);
    });
  }
  list.sort((a, b) =>
    String(a.Codigo ?? "").localeCompare(String(b.Codigo ?? ""), "es", { numeric: true })
  );
  return list;
});

function formatear(v) {
  return new Intl.NumberFormat("es-CL").format(Math.round(Math.abs(Number(v) || 0)));
}

function formatearDetalle(v) {
  return new Intl.NumberFormat("es-CL").format(Math.round(Number(v) || 0));
}

function etiquetaTipo(tipo) {
  const m = { "1": "Activos", "2": "Pasivos", "3": "Patrimonio" };
  return m[String(tipo)] ?? `Tipo ${tipo}`;
}

function nombreCuenta(c) {
  return String(c.Nombre ?? "").trim();
}

function saldoNegativo(c) {
  return Number(c.Saldo_Actual ?? 0) < 0;
}

function sincronizarFiltrosTrasIndice() {
  const años = añosDisponibles.value;
  if (años.length && !años.includes(filtroAnio.value)) {
    filtroAnio.value = años[0];
  }
  const meses = mesesDisponiblesParaAnio.value;
  if (meses.length && !meses.includes(filtroMesCierre.value)) {
    filtroMesCierre.value = meses[meses.length - 1];
  }
}

async function cargarDatos() {
  errorCarga.value = "";
  meta.value = null;
  filtroDetalle.value = "";
  const emp = props.empresa;

  if (!esUltimoExtracto.value) {
    const a = filtroAnio.value;
    const m = filtroMesCierre.value;
    const cand = candidatosMismaFecha(a, m);
    const hitCmf = cand[0];
    if (hitCmf) {
      snapshotId.value = hitCmf.id;
    } else if (snapshotsSinInferir.value.length) {
      const ok = snapshots.value.find((s) => s.id === snapshotId.value && s.id !== "live");
      if (!ok) snapshotId.value = snapshotsSinInferir.value[0].id;
    } else {
      errorCarga.value =
        `No hay snapshot en modo «${etiquetaModo(modoSoftland.value)}» para ${String(m).padStart(2, "0")}/${a}. ` +
        `Ejecuta extract_contabilidad_snapshot.py con --modo movimiento o --modo cierre, o activa «Último extracto».`;
      cuentas.value = [];
      return;
    }
  }

  const snap = snapshots.value.find((s) => s.id === snapshotId.value);
  if (!snap) {
    errorCarga.value = "Snapshot no encontrado en index.json.";
    cuentas.value = [];
    return;
  }
  try {
    const url = urlParaDatos(emp, snap.archivo);
    if (!url) {
      errorCarga.value = `No hay contabilidad para la empresa "${emp}" o ruta de snapshot inválida.`;
      cuentas.value = [];
      return;
    }
    const res = await fetch(url, FETCH_JSON);
    if (!res.ok) {
      errorCarga.value = `No se pudo cargar ${snap.archivo} (${res.status}).`;
      cuentas.value = [];
      return;
    }
    const raw = await res.text();
    const trimmed = raw.trim();
    if (!trimmed) {
      const rutaHint = snap.archivo.startsWith("../")
        ? `src/assets/data/${emp}/${snap.archivo.replace(/^\.\.\//, "")}`
        : `src/assets/data/${emp}/historico/${snap.archivo}`;
      errorCarga.value =
        `El archivo "${snap.archivo}" está vacío. Ejecuta el extracto de contabilidad (pipeline) o revisa ${rutaHint}.`;
      cuentas.value = [];
      return;
    }
    let data;
    try {
      data = JSON.parse(trimmed);
    } catch (parseErr) {
      const msg =
        parseErr instanceof SyntaxError ? parseErr.message : String(parseErr);
      errorCarga.value =
        `JSON inválido o incompleto en "${snap.archivo}": ${msg}. ` +
        `Comprueba que el extracto haya terminado y el archivo no esté corrupto.`;
      cuentas.value = [];
      return;
    }
    if (Array.isArray(data)) {
      cuentas.value = data;
      meta.value = null;
    } else if (data.cuentas && Array.isArray(data.cuentas)) {
      cuentas.value = data.cuentas;
      meta.value = data.meta || null;
      if (esUltimoExtracto.value && meta.value?.modo_softland) {
        modoSoftland.value = meta.value.modo_softland;
      }
    } else {
      errorCarga.value = "Formato JSON no reconocido.";
      cuentas.value = [];
    }
  } catch (e) {
    errorCarga.value = `Error al cargar datos: ${e}`;
    cuentas.value = [];
  }
}

async function cargarIndice() {
  const idxUrl = historicoIndexUrlEmpresa(props.empresa);
  if (!idxUrl) {
    snapshots.value = [
      {
        id: "live",
        label: "Último extracto",
        archivo: "../contabilidad.json",
      },
    ];
    return;
  }
  try {
    const res = await fetch(idxUrl, FETCH_JSON);
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    snapshots.value = data.snapshots || [];
    if (snapshots.value.length && !snapshots.value.some((s) => s.id === snapshotId.value)) {
      snapshotId.value = snapshots.value[0].id;
    }
  } catch {
    snapshots.value = [
      {
        id: "live",
        label: "Último extracto",
        archivo: "../contabilidad.json",
      },
    ];
  }
}

onMounted(async () => {
  await cargarIndice();
  sincronizarFiltrosTrasIndice();
  await cargarDatos();
});
</script>
