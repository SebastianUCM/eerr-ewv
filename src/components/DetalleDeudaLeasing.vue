<template>
  <div class="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-800">
    <header class="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0 flex-1">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">
          Detalle deuda — Leasing
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          Cada contrato muestra la obligación clasificada en <strong>corto</strong> y <strong>largo</strong> plazo,
          institución financiera y avance de cuotas (pagadas vs total).
          <span class="font-medium text-slate-600">— {{ empresa }}</span>
        </p>
        <p
          v-if="payload.meta?.nota"
          class="mt-2 max-w-3xl rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100"
        >
          {{ payload.meta.nota }}
        </p>
      </div>

      <div class="flex w-full min-w-[14rem] flex-col gap-1.5 lg:w-auto lg:shrink-0">
        <label
          for="acumulado-hasta"
          class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
        >
          Acumulado a
        </label>
        <div class="relative">
          <select
            id="acumulado-hasta"
            v-model="periodoAcumulado"
            class="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option
              v-for="opt in payload.opcionesAcumulado"
              :key="opt.periodo"
              :value="opt.periodo"
            >
              {{ opt.etiqueta }}
            </option>
          </select>
          <span
            class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
              <path
                fill-rule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clip-rule="evenodd"
              />
            </svg>
          </span>
        </div>
        <p class="text-[11px] text-slate-400">
          Montos al cierre del mes seleccionado (mock).
        </p>
      </div>
    </header>

    <!-- KPIs: deuda (saldos insolutos) -->
    <section class="mb-6" aria-label="Resumen de deuda por plazo">
      <h2 class="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        Deuda — saldo insoluto al corte
      </h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50/90 to-white p-5 shadow-sm dark:border-amber-900/40 dark:from-amber-950/30">
          <p class="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200">
            Deuda corto plazo
          </p>
          <p class="mt-2 font-mono text-xl font-bold text-amber-950 dark:text-amber-50">
            {{ formatCLP(totales.deudaCortoPlazo) }}
          </p>
          <p class="mt-1 text-[11px] text-amber-800/80 dark:text-amber-200/80">
            Parte corriente (clasificación IFRS)
          </p>
        </div>
        <div class="rounded-2xl border border-violet-200/90 bg-gradient-to-b from-violet-50/90 to-white p-5 shadow-sm dark:border-violet-900/40 dark:from-violet-950/30">
          <p class="text-[11px] font-bold uppercase tracking-wider text-violet-800 dark:text-violet-200">
            Deuda largo plazo
          </p>
          <p class="mt-2 font-mono text-xl font-bold text-violet-950 dark:text-violet-50">
            {{ formatCLP(totales.deudaLargoPlazo) }}
          </p>
          <p class="mt-1 text-[11px] text-violet-800/80 dark:text-violet-200/80">
            Parte no corriente
          </p>
        </div>
        <div
          class="rounded-2xl border-2 border-indigo-300/90 bg-gradient-to-b from-indigo-50 to-white p-5 shadow-md ring-1 ring-indigo-200/50 dark:border-indigo-700 dark:from-indigo-950/40 dark:ring-indigo-900/50"
        >
          <p class="text-[11px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-200">
            Deuda total
          </p>
          <p class="mt-2 font-mono text-2xl font-bold text-indigo-950 dark:text-white">
            {{ formatCLP(totales.deudaTotal) }}
          </p>
          <p class="mt-1 text-[11px] text-indigo-800/80 dark:text-indigo-200/80">
            Corto + largo plazo
          </p>
        </div>
      </div>
    </section>

    <!-- KPIs: otros -->
    <section class="mb-8" aria-label="Otros indicadores">
      <h2 class="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        Otros indicadores
      </h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Contratos
          </p>
          <p class="mt-2 text-2xl font-bold text-slate-900">
            {{ payload.creditos.length }}
          </p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Pagado acumulado total
          </p>
          <p class="mt-2 font-mono text-xl font-bold text-emerald-800">
            {{ formatCLP(totales.pagadoAcumulado) }}
          </p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Cuotas mensuales (c. + l.p.)
          </p>
          <p class="mt-2 font-mono text-xl font-bold text-slate-900">
            {{ formatCLP(totales.cuotasMensuales) }}
          </p>
        </div>
      </div>
    </section>

    <!-- Lista de créditos -->
    <div class="space-y-6">
      <div
        v-for="(c, idx) in payload.creditos"
        :key="c.id"
        class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
      >
        <div
          class="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5"
        >
          <div class="flex min-w-0 items-start gap-3">
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200/80 text-sm font-bold text-slate-600"
            >
              {{ idx + 1 }}
            </span>
            <div class="min-w-0">
              <p class="font-mono text-xs font-semibold text-indigo-600">{{ c.id }}</p>
              <h2 class="text-base font-semibold leading-snug text-slate-900">
                {{ c.nombre }}
              </h2>
              <p class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                <span class="inline-flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 text-slate-400" aria-hidden="true">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                  </svg>
                  {{ c.institucion }}
                </span>
                <span class="text-slate-300">·</span>
                <span class="font-semibold text-slate-800" :title="tituloCuotas(c)">
                  {{ textoCuotas(c) }}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div v-if="snapshotCredito(c)" class="divide-y divide-slate-100">
          <div
            v-for="bloque in bloquesPlazo"
            :key="bloque.key"
            class="px-4 py-4 sm:px-5"
          >
            <h3
              class="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide"
              :class="bloque.key === 'cortoPlazo' ? 'text-amber-800' : 'text-violet-800'"
            >
              <span
                class="h-2 w-2 rounded-full"
                :class="bloque.key === 'cortoPlazo' ? 'bg-amber-500' : 'bg-violet-500'"
              />
              {{ bloque.label }}
            </h3>
            <dl class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <div>
                <dt class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Cuota
                </dt>
                <dd class="mt-1 font-mono text-sm font-semibold text-slate-900">
                  {{ formatCLP(snapshotCredito(c)[bloque.key].cuota) }}
                </dd>
              </div>
              <div>
                <dt class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Pagado acum.
                </dt>
                <dd class="mt-1 font-mono text-sm font-semibold text-emerald-800">
                  {{ formatCLP(snapshotCredito(c)[bloque.key].pagadoAcumulado) }}
                </dd>
              </div>
              <div>
                <dt class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Capital acum.
                </dt>
                <dd class="mt-1 font-mono text-sm text-slate-800">
                  {{ formatCLP(snapshotCredito(c)[bloque.key].capitalAcumulado) }}
                </dd>
              </div>
              <div>
                <dt class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Interés acum.
                </dt>
                <dd class="mt-1 font-mono text-sm text-amber-900">
                  {{ formatCLP(snapshotCredito(c)[bloque.key].interesAcumulado) }}
                </dd>
              </div>
              <div class="col-span-2 sm:col-span-1">
                <dt class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Saldo insoluto
                </dt>
                <dd class="mt-1 font-mono text-base font-bold text-indigo-900">
                  {{ formatCLP(snapshotCredito(c)[bloque.key].saldoInsoluto) }}
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <div
          v-else
          class="px-4 py-6 text-center text-sm text-slate-500 sm:px-5"
        >
          Sin movimiento registrado para «{{ etiquetaPeriodoSeleccionado }}».
        </div>
      </div>
    </div>

    <p class="mt-8 text-center text-xs text-slate-400">
      Actualizado (mock): {{ payload.meta.actualizado }} · Fuente: {{ payload.meta.fuente }} · Moneda:
      {{ payload.meta.moneda }}
    </p>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { getDetalleDeudaLeasing } from "../utils/detalleDeudaLeasing.js";

const props = defineProps({
  empresa: { type: String, default: "FIDELMIRA" },
});

const formatCLP = (v) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(Number(v || 0)));

const payload = computed(() => getDetalleDeudaLeasing(props.empresa));

const periodoAcumulado = ref("2026-04");

const bloquesPlazo = [
  { key: "cortoPlazo", label: "Corto plazo (corriente)" },
  { key: "largoPlazo", label: "Largo plazo (no corriente)" },
];

function snapshotCredito(c) {
  return c.porPeriodo?.[periodoAcumulado.value] ?? null;
}

/** Ej. "12 de 36 cuotas" según corte "Acumulado a" */
function textoCuotas(c) {
  const v = snapshotCredito(c);
  const total = Number(c.numeroCuotas);
  const pagadas = v?.cuotasPagadas;
  if (pagadas != null && Number.isFinite(total) && total > 0) {
    return `${pagadas} de ${total} cuotas`;
  }
  if (Number.isFinite(total) && total > 0) return `${total} cuotas`;
  return "—";
}

function tituloCuotas(c) {
  const v = snapshotCredito(c);
  if (v?.cuotasPagadas != null && c.numeroCuotas != null) {
    return `Cuotas pagadas al corte: ${v.cuotasPagadas} de ${c.numeroCuotas}`;
  }
  return "Cuotas del contrato";
}

const etiquetaPeriodoSeleccionado = computed(() => {
  const o = payload.value.opcionesAcumulado?.find(
    (x) => x.periodo === periodoAcumulado.value
  );
  return o?.etiqueta ?? periodoAcumulado.value;
});

const totales = computed(() => {
  let deudaCortoPlazo = 0;
  let deudaLargoPlazo = 0;
  let pagadoAcumulado = 0;
  let cuotasMensuales = 0;
  for (const c of payload.value.creditos || []) {
    const v = snapshotCredito(c);
    if (!v) continue;
    deudaCortoPlazo += Number(v.cortoPlazo?.saldoInsoluto || 0);
    deudaLargoPlazo += Number(v.largoPlazo?.saldoInsoluto || 0);
    pagadoAcumulado +=
      Number(v.cortoPlazo?.pagadoAcumulado || 0) +
      Number(v.largoPlazo?.pagadoAcumulado || 0);
    cuotasMensuales +=
      Number(v.cortoPlazo?.cuota || 0) + Number(v.largoPlazo?.cuota || 0);
  }
  const deudaTotal = deudaCortoPlazo + deudaLargoPlazo;
  return {
    deudaCortoPlazo,
    deudaLargoPlazo,
    deudaTotal,
    pagadoAcumulado,
    cuotasMensuales,
  };
});
</script>
