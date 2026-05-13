<template>
  <div class="min-h-screen bg-slate-50 p-6 md:p-8">
    <header class="mb-6">
      <h1 class="text-2xl font-bold text-slate-900">
        Matriz completa Softland
      </h1>
      <p class="text-sm text-slate-600 mt-1">
        Cuentas y montos 100% desde snapshots de Softland por periodo.
      </p>
    </header>

    <div
      class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex flex-wrap gap-3 items-end mb-5"
    >
      <div class="flex flex-col gap-1">
        <label class="text-[11px] font-semibold uppercase text-slate-500"
          >Año</label
        >
        <select
          v-model.number="filtroAnio"
          class="border border-slate-300 rounded-md px-2 py-1 text-xs bg-white"
        >
          <option v-for="a in aniosDisponibles" :key="a" :value="a">
            {{ a }}
          </option>
        </select>
      </div>
      <span class="text-xs text-slate-500 pb-1">
        Modo preferido:
        {{ preferirMovimiento ? "Movimiento del periodo" : "Saldo a fecha" }}
      </span>
    </div>

    <div
      v-if="cargando"
      class="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
    >
      Cargando matriz desde snapshots...
    </div>
    <div
      v-else-if="error"
      class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
    >
      {{ error }}
    </div>
    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs uppercase text-slate-500 font-semibold">Cuentas</p>
          <p class="text-2xl font-bold text-slate-900 mt-1">
            {{ cuentasMapeadas.length }}
          </p>
        </div>
        <div class="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm">
          <p class="text-xs uppercase text-indigo-700 font-semibold">
            Total anual
          </p>
          <p class="text-2xl font-bold text-slate-900 mt-1">
            ${{ formatCLP(totalAnual) }}
          </p>
        </div>
        <div
          class="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm"
        >
          <p class="text-xs uppercase text-emerald-700 font-semibold">
            Periodos cargados
          </p>
          <p class="text-2xl font-bold text-slate-900 mt-1">
            {{ mesesConDatos }}/12
          </p>
        </div>
      </div>

      <div
        class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div class="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 class="text-sm font-semibold text-slate-800">
            Matriz de cuentas Softland {{ filtroAnio }}
          </h2>
        </div>
        <div class="overflow-auto max-h-[75vh]">
          <table class="min-w-[1200px] w-full text-xs">
            <thead class="sticky top-0 z-10 bg-slate-100">
              <tr class="border-b border-slate-300 text-slate-700">
                <th class="px-3 py-2 text-left font-semibold min-w-[10rem]">
                  Código Softland
                </th>
                <th class="px-3 py-2 text-left font-semibold min-w-[24rem]">
                  Nombre cuenta
                </th>
                <th
                  v-for="m in 12"
                  :key="m"
                  class="px-2 py-2 text-right font-semibold min-w-[6.5rem]"
                >
                  {{ mesNombre(m - 1) }}
                </th>
                <th class="px-3 py-2 text-right font-semibold min-w-[7rem]">
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-for="grupo in gruposContables" :key="grupo.key">
                <tr :class="`border-y ${grupo.colorHeader}`">
                  <td
                    class="px-3 py-1.5 font-semibold text-slate-800"
                    colspan="15"
                  >
                    {{ grupo.label }}
                  </td>
                </tr>
                <template
                  v-for="subitem in grupo.subitems"
                  :key="`${grupo.key}-${subitem.key}`"
                >
                  <tr class="bg-slate-50 border-b border-slate-200">
                    <td
                      class="px-3 py-1.5 font-semibold text-slate-700"
                      colspan="15"
                    >
                      {{ subitem.label }}
                    </td>
                  </tr>
                  <template
                    v-for="cuenta in subitem.cuentas"
                    :key="`${grupo.key}-${subitem.key}-${cuenta.codigo}`"
                  >
                    <tr
                      class="border-b border-slate-100 cursor-pointer hover:bg-indigo-50/30"
                      @click="
                        toggleCuenta(
                          cuentaKey(grupo.key, subitem.key, cuenta.codigo)
                        )
                      "
                    >
                      <td class="px-3 py-1.5 font-mono text-slate-700">
                        <span class="inline-flex items-center gap-1">
                          <span class="text-slate-500">{{
                            abierta(
                              cuentaKey(grupo.key, subitem.key, cuenta.codigo)
                            )
                              ? "▾"
                              : "▸"
                          }}</span>
                          {{ cuenta.codigo }}
                        </span>
                      </td>
                      <td class="px-3 py-1.5 text-slate-700">
                        {{ cuenta.nombre }}
                      </td>
                      <td
                        v-for="(v, idx) in cuenta.mensual"
                        :key="`${cuenta.codigo}-${idx}`"
                        class="px-2 py-1.5 text-right font-mono"
                        :class="v < 0 ? 'text-rose-700' : 'text-slate-800'"
                      >
                        {{ formatCLPContable(v) }}
                      </td>
                      <td
                        class="px-3 py-1.5 text-right font-mono font-medium"
                        :class="
                          cuenta.total < 0 ? 'text-rose-700' : 'text-slate-900'
                        "
                      >
                        {{ formatCLPContable(cuenta.total) }}
                      </td>
                    </tr>
                    <tr
                      v-if="
                        abierta(
                          cuentaKey(grupo.key, subitem.key, cuenta.codigo)
                        )
                      "
                      class="bg-slate-50 border-b border-slate-200"
                    >
                      <td class="px-2 py-2" colspan="15">
                        <div class="overflow-x-auto">
                          <table class="min-w-[980px] w-full text-[11px]">
                            <thead>
                              <tr
                                class="text-slate-600 border-b border-slate-200"
                              >
                                <th class="px-2 py-1 text-left min-w-[8rem]">
                                  Centro
                                </th>
                                <th class="px-2 py-1 text-left min-w-[16rem]">
                                  Detalle
                                </th>
                                <th
                                  v-for="m in 12"
                                  :key="`cch-${cuenta.codigo}-${m}`"
                                  class="px-2 py-1 text-right"
                                >
                                  {{ mesNombre(m - 1) }}
                                </th>
                                <th class="px-2 py-1 text-right">TOTAL</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr
                                v-for="cc in cuenta.centros"
                                :key="`${cuenta.codigo}-${cc.codigo}`"
                                class="border-b border-slate-100"
                              >
                                <td class="px-2 py-1 font-mono text-slate-700">
                                  {{ cc.codigo }}
                                </td>
                                <td class="px-2 py-1 text-slate-700">
                                  {{ cc.nombre }}
                                </td>
                                <td
                                  v-for="(v, idx) in cc.mensual"
                                  :key="`cc-${cuenta.codigo}-${cc.codigo}-${idx}`"
                                  class="px-2 py-1 text-right font-mono"
                                  :class="
                                    v < 0 ? 'text-rose-700' : 'text-slate-800'
                                  "
                                >
                                  {{ formatCLPContable(v) }}
                                </td>
                                <td
                                  class="px-2 py-1 text-right font-mono font-medium"
                                  :class="
                                    cc.total < 0
                                      ? 'text-rose-700'
                                      : 'text-slate-900'
                                  "
                                >
                                  {{ formatCLPContable(cc.total) }}
                                </td>
                              </tr>
                              <tr v-if="!cuenta.centros.length">
                                <td
                                  colspan="14"
                                  class="px-2 py-2 text-center text-slate-500"
                                >
                                  Sin centros de costo informados para esta
                                  cuenta.
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  </template>
                  <tr class="bg-slate-50/80 border-b border-slate-300">
                    <td
                      class="px-3 py-2 font-semibold text-slate-800"
                      colspan="2"
                    >
                      Subtotal {{ subitem.label }}
                    </td>
                    <td
                      v-for="(v, idx) in subitem.subtotalMensual"
                      :key="`sub-${grupo.key}-${subitem.key}-${idx}`"
                      class="px-2 py-2 text-right font-semibold font-mono"
                      :class="v < 0 ? 'text-rose-700' : 'text-slate-900'"
                    >
                      {{ formatCLPContable(v) }}
                    </td>
                    <td
                      class="px-3 py-2 text-right font-semibold font-mono"
                      :class="
                        subitem.total < 0 ? 'text-rose-700' : 'text-slate-900'
                      "
                    >
                      {{ formatCLPContable(subitem.total) }}
                    </td>
                  </tr>
                </template>
                <tr :class="`border-b ${grupo.colorSubtotal}`">
                  <td
                    class="px-3 py-2 font-semibold text-slate-800"
                    colspan="2"
                  >
                    Subtotal {{ grupo.label }}
                  </td>
                  <td
                    v-for="(v, idx) in grupo.subtotalMensual"
                    :key="`sub-${grupo.key}-${idx}`"
                    class="px-2 py-2 text-right font-semibold font-mono"
                    :class="v < 0 ? 'text-rose-700' : 'text-slate-900'"
                  >
                    {{ formatCLPContable(v) }}
                  </td>
                  <td
                    class="px-3 py-2 text-right font-semibold font-mono"
                    :class="
                      grupo.total < 0 ? 'text-rose-700' : 'text-slate-900'
                    "
                  >
                    {{ formatCLPContable(grupo.total) }}
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import mapeoCuentas from "../assets/config/mapeo_cuentas.json";

const props = defineProps({
  empresa: { type: String, required: true },
});

const historicoIndexUrls = import.meta.glob(
  "../assets/data/*/historico/index.json",
  {
    query: "?url",
    import: "default",
    eager: true,
  }
);
const historicoJsonUrls = import.meta.glob(
  "../assets/data/*/historico/*.json",
  {
    query: "?url",
    import: "default",
    eager: true,
  }
);

const snapshots = ref([]);
const filtroAnio = ref(new Date().getFullYear());
const cuentasMatriz = ref([]);
const cargando = ref(false);
const error = ref("");
const cuentasAbiertas = ref({});
const preferirMovimiento = true;

function formatCLP(v) {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(
    Math.round(Number(v || 0))
  );
}

function formatCLPContable(v) {
  const n = Math.round(Number(v || 0));
  const abs = new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 0,
  }).format(Math.abs(n));
  return n < 0 ? `(${abs})` : abs;
}

function mesNombre(idx) {
  const m = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ];
  return m[idx] || "";
}

const BLOQUES_EXCEL = [
  {
    key: "ingreso_explotacion",
    label: "Ingreso de Explotacion",
    colorHeader: "bg-emerald-200 border-emerald-400",
    colorSubtotal: "bg-emerald-100 border-emerald-300",
    test: (c) => c.startsWith("4-1-"),
  },
  {
    key: "ingreso_financiero",
    label: "Ingresos Financieros",
    colorHeader: "bg-cyan-200 border-cyan-400",
    colorSubtotal: "bg-cyan-100 border-cyan-300",
    test: (c) => c.startsWith("4-2-"),
  },
  {
    key: "gasto_adm_ventas",
    label: "Gastos de Administracion y Ventas",
    colorHeader: "bg-amber-200 border-amber-400",
    colorSubtotal: "bg-amber-100 border-amber-300",
    test: (c) => c.startsWith("5-"),
  },
  {
    key: "otros_resultados",
    label: "Otros Resultados",
    colorHeader: "bg-violet-200 border-violet-400",
    colorSubtotal: "bg-violet-100 border-violet-300",
    test: (c) =>
      !c.startsWith("4-1-") &&
      !c.startsWith("4-2-") &&
      !c.startsWith("5-") &&
      !c.startsWith("3-1-"),
  },
];

function bloquePorCategoria(categoria) {
  const cat = String(categoria || "").trim();
  return (
    BLOQUES_EXCEL.find((b) => b.key === cat) ||
    BLOQUES_EXCEL[BLOQUES_EXCEL.length - 1]
  );
}

function textoTitulo(v) {
  return String(v || "")
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function historicoIndexUrlEmpresa(emp) {
  const key = Object.keys(historicoIndexUrls).find((k) =>
    k.replace(/\\/g, "/").includes(`/${emp}/historico/index.json`)
  );
  return key ? historicoIndexUrls[key] : null;
}

function urlParaSnapshot(emp, archivo) {
  const base = String(archivo || "")
    .split("/")
    .pop();
  if (!base) return null;
  const key = Object.keys(historicoJsonUrls).find((k) => {
    const n = k.replace(/\\/g, "/");
    return n.includes(`/${emp}/historico/`) && n.endsWith(`/${base}`);
  });
  return key ? historicoJsonUrls[key] : null;
}

function prioridadSnapshot(s) {
  const id = String(s?.id || "").toLowerCase();
  const modo = String(s?.modo_softland || "").toLowerCase();
  if (preferirMovimiento) {
    if (id.endsWith("-mov") || modo.includes("movimiento")) return 0;
    if (id.endsWith("-cpb")) return 1;
    if (id.endsWith("-cie") || modo.includes("saldo")) return 2;
  } else {
    if (id.endsWith("-cie") || modo.includes("saldo")) return 0;
    if (id.endsWith("-mov") || modo.includes("movimiento")) return 1;
  }
  return 9;
}

const snapshotsAnio = computed(() =>
  (snapshots.value || [])
    .map((s) => {
      const m = String(s.id || "").match(/^(\d{4})-(\d{2})/);
      return {
        ...s,
        anio: m ? Number(m[1]) : null,
        mes: m ? Number(m[2]) : null,
      };
    })
    .filter((s) => s.anio === filtroAnio.value && s.mes != null)
);

const aniosDisponibles = computed(() => {
  const set = new Set(
    (snapshots.value || [])
      .map((s) => String(s.id || "").match(/^(\d{4})-(\d{2})/))
      .filter(Boolean)
      .map((m) => Number(m[1]))
  );
  const arr = [...set].sort((a, b) => b - a);
  return arr.length ? arr : [new Date().getFullYear()];
});

const empresaMapping = computed(
  () => mapeoCuentas?.empresas?.[props.empresa] || null
);
const cuentasMapeadas = computed(() => {
  const mapa = empresaMapping.value?.cuentas || {};
  const rows = [];
  for (const c of cuentasMatriz.value || []) {
    const cfg = mapa?.[c.codigo];
    if (!cfg) continue;
    rows.push({
      ...c,
      categoria: String(cfg.categoria || "otros_resultados"),
      subitem: String(cfg.subitem || "sin_subitem"),
      orden: Number(cfg.orden ?? Number.MAX_SAFE_INTEGER),
    });
  }
  return rows.sort((a, b) => {
    if (a.orden !== b.orden) return a.orden - b.orden;
    return a.codigo.localeCompare(b.codigo, "es", { numeric: true });
  });
});
const mesesConDatos = computed(
  () =>
    new Set(
      (cuentasMapeadas.value || []).flatMap((c) =>
        c.mensual
          .map((v, i) => (Math.abs(v) > 0 ? i : null))
          .filter((x) => x != null)
      )
    ).size
);
const totalAnual = computed(() =>
  (cuentasMapeadas.value || []).reduce((a, c) => a + Number(c.total || 0), 0)
);
const gruposContables = computed(() => {
  const catMap = new Map();
  for (const c of cuentasMapeadas.value || []) {
    const bloque = bloquePorCategoria(c.categoria);
    if (!catMap.has(c.categoria)) {
      catMap.set(c.categoria, {
        key: c.categoria,
        label: bloque?.label || textoTitulo(c.categoria),
        colorHeader: bloque?.colorHeader || "bg-slate-200 border-slate-300",
        colorSubtotal: bloque?.colorSubtotal || "bg-slate-100 border-slate-300",
        subitemMap: new Map(),
        subtotalMensual: Array(12).fill(0),
        total: 0,
      });
    }
    const cat = catMap.get(c.categoria);
    const subKey = c.subitem || "sin_subitem";
    if (!cat.subitemMap.has(subKey)) {
      cat.subitemMap.set(subKey, {
        key: subKey,
        label: textoTitulo(subKey),
        cuentas: [],
        subtotalMensual: Array(12).fill(0),
        total: 0,
      });
    }
    const sub = cat.subitemMap.get(subKey);
    sub.cuentas.push(c);
    c.mensual.forEach((v, idx) => {
      const n = Number(v || 0);
      sub.subtotalMensual[idx] += n;
      cat.subtotalMensual[idx] += n;
    });
    sub.total += Number(c.total || 0);
    cat.total += Number(c.total || 0);
  }
  const orden = Object.fromEntries(BLOQUES_EXCEL.map((b, idx) => [b.key, idx]));
  return [...catMap.values()]
    .sort((a, b) => (orden[a.key] ?? 999) - (orden[b.key] ?? 999))
    .map((cat) => ({
      ...cat,
      subitems: [...cat.subitemMap.values()]
        .map((sub) => ({
          ...sub,
          cuentas: [...sub.cuentas].sort((x, y) => {
            if (x.orden !== y.orden) return x.orden - y.orden;
            return x.codigo.localeCompare(y.codigo, "es", { numeric: true });
          }),
        }))
        .sort((a, b) => {
          const ao = Math.min(...a.cuentas.map((x) => x.orden));
          const bo = Math.min(...b.cuentas.map((x) => x.orden));
          return ao - bo;
        }),
    }));
});

async function cargarIndice() {
  const idxUrl = historicoIndexUrlEmpresa(props.empresa);
  if (!idxUrl) {
    snapshots.value = [];
    return;
  }
  try {
    const res = await fetch(idxUrl, { cache: "no-store" });
    const data = await res.json();
    snapshots.value = Array.isArray(data?.snapshots) ? data.snapshots : [];
  } catch {
    snapshots.value = [];
  }
}

async function cargarMatrizAnual() {
  error.value = "";
  cargando.value = true;
  try {
    const byMonth = new Map();
    for (const s of snapshotsAnio.value) {
      const current = byMonth.get(s.mes);
      if (!current || prioridadSnapshot(s) < prioridadSnapshot(current)) {
        byMonth.set(s.mes, s);
      }
    }

    const accountMap = new Map();

    for (let mes = 1; mes <= 12; mes += 1) {
      const snap = byMonth.get(mes);
      if (!snap) continue;
      const url = urlParaSnapshot(props.empresa, snap.archivo);
      if (!url) continue;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      const cuentas = Array.isArray(data?.cuentas) ? data.cuentas : [];
      for (const c of cuentas) {
        const codigo = String(c?.Codigo || "").trim();
        if (!codigo) continue;
        const nombre = String(c?.Nombre || "").trim();
        if (!accountMap.has(codigo)) {
          accountMap.set(codigo, {
            codigo,
            nombre,
            mensual: Array(12).fill(0),
            centrosMap: new Map(),
          });
        }
        const acc = accountMap.get(codigo);
        acc.mensual[mes - 1] = Number(c?.Saldo_Actual || 0);

        const centros = Array.isArray(c?.centros) ? c.centros : [];
        for (const cc of centros) {
          const cck = String(cc?.codigo || "").trim() || "N/A";
          if (!acc.centrosMap.has(cck)) {
            acc.centrosMap.set(cck, {
              codigo: cck,
              nombre: String(cc?.nombre || cck),
              mensual: Array(12).fill(0),
            });
          }
          const ccrec = acc.centrosMap.get(cck);
          ccrec.mensual[mes - 1] += Number(cc?.saldo || 0);
        }
      }
    }

    const rows = [...accountMap.values()]
      .map((a) => {
        const centros = [...a.centrosMap.values()]
          .map((cc) => ({
            ...cc,
            total: cc.mensual.reduce((x, y) => x + y, 0),
          }))
          .sort((x, y) => Math.abs(y.total) - Math.abs(x.total));
        return {
          codigo: a.codigo,
          nombre: a.nombre,
          mensual: a.mensual,
          total: a.mensual.reduce((x, y) => x + y, 0),
          centros,
        };
      })
      .sort((x, y) =>
        x.codigo.localeCompare(y.codigo, "es", { numeric: true })
      );

    cuentasMatriz.value = rows;
  } catch (e) {
    error.value = `No se pudo construir la matriz: ${e}`;
    cuentasMatriz.value = [];
  } finally {
    cargando.value = false;
  }
}

watch(
  () => props.empresa,
  async () => {
    await cargarIndice();
    filtroAnio.value = aniosDisponibles.value[0];
    await cargarMatrizAnual();
  }
);

watch(filtroAnio, cargarMatrizAnual);

onMounted(async () => {
  await cargarIndice();
  filtroAnio.value = aniosDisponibles.value[0];
  await cargarMatrizAnual();
});

function toggleCuenta(key) {
  cuentasAbiertas.value[key] = !cuentasAbiertas.value[key];
}

function abierta(key) {
  return Boolean(cuentasAbiertas.value[key]);
}

function cuentaKey(cat, sub, codigo) {
  return `${cat}::${sub}::${codigo}`;
}
</script>
