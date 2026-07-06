<template>
  <template v-for="cuenta in cuentas" :key="cuenta.key">
    <tr
      class="border-b border-slate-100 cursor-pointer hover:bg-indigo-50/30 transition-colors bg-slate-50/50"
      @click.stop="emit('toggle', claveCuenta(cuenta))"
    >
      <td
        class="py-1.5 font-medium text-slate-700 sticky left-0 z-[5] bg-slate-50/70 border-r border-slate-100"
        :class="paddingCuentaClass"
      >
        <span class="inline-flex items-center gap-2">
          <span class="text-slate-400 text-lg leading-none w-4">{{
            abiertas[claveCuenta(cuenta)] ? "▾" : "▸"
          }}</span>
          <span class="text-indigo-600 font-mono">{{ cuenta.codigo }}</span>
          <span class="truncate max-w-[14rem]">{{ cuenta.nombre }}</span>
        </span>
      </td>
      <td
        v-for="emp in empresas"
        :key="claveCuenta(cuenta) + emp"
        class="px-3 py-1.5 text-right font-mono text-slate-600 text-[11px]"
        :class="(cuenta.valoresPorEmpresa[emp] || 0) < 0 ? 'text-rose-500' : ''"
      >
        {{ formatCLPContable(cuenta.valoresPorEmpresa[emp]) }}
      </td>
      <td
        class="px-4 py-1.5 text-right font-mono font-semibold bg-slate-100/50 text-[11px] border-l border-slate-100"
        :class="(cuenta.acumulado || 0) < 0 ? 'text-rose-600' : 'text-slate-700'"
      >
        {{ formatCLPContable(cuenta.acumulado) }}
      </td>
    </tr>

    <template v-if="abiertas[claveCuenta(cuenta)]">
      <tr
        v-for="cc in cuenta.centros"
        :key="claveCuenta(cuenta) + '-cc-' + cc.key"
        class="border-b border-slate-50 hover:bg-slate-100 transition-colors bg-white"
      >
        <td
          class="py-1 text-slate-500 text-[11px] sticky left-0 z-[5] bg-white border-r border-slate-100"
          :class="paddingCentroClass"
        >
          <span class="inline-flex items-center gap-1.5">
            <span class="w-1 h-1 rounded-full bg-slate-300"></span>
            <span class="font-mono text-slate-400">{{ cc.codigo === "000" ? "" : cc.codigo }}</span>
            <span class="truncate max-w-[12rem]">{{ cc.codigo === "000" ? "Sin Centro de Costo" : cc.nombre }}</span>
          </span>
        </td>
        <td
          v-for="emp in empresas"
          :key="claveCuenta(cuenta) + '-cc-' + cc.key + emp"
          class="px-3 py-1 text-right font-mono text-slate-400 text-[11px]"
          :class="(cc.valoresPorEmpresa[emp] || 0) < 0 ? 'text-rose-400' : ''"
        >
          {{ formatCLPContable(cc.valoresPorEmpresa[emp]) }}
        </td>
        <td
          class="px-4 py-1 text-right font-mono font-medium text-slate-500 bg-white text-[11px] border-l border-slate-100"
          :class="(cc.acumulado || 0) < 0 ? 'text-rose-500' : ''"
        >
          {{ formatCLPContable(cc.acumulado) }}
        </td>
      </tr>
    </template>
  </template>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  cuentas: { type: Array, required: true },
  empresas: { type: Array, required: true },
  depth: { type: Number, default: 1 },
  pathPrefix: { type: String, required: true },
  abiertas: { type: Object, required: true },
  formatCLPContable: { type: Function, required: true },
});

const emit = defineEmits(["toggle"]);

const paddingCuentaClass = computed(() => {
  if (props.depth <= 1) return "px-4 pl-14";
  if (props.depth === 2) return "px-4 pl-[4.5rem]";
  return "px-4 pl-[5.5rem]";
});

const paddingCentroClass = computed(() => {
  if (props.depth <= 1) return "px-4 pl-[5.5rem]";
  if (props.depth === 2) return "px-4 pl-[6.5rem]";
  return "px-4 pl-[7.5rem]";
});

function claveCuenta(cuenta) {
  return `${props.pathPrefix}${cuenta.key}`;
}
</script>
