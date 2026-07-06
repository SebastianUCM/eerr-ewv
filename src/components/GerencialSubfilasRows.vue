<template>
  <template v-for="sub in subfilas" :key="clave(sub)">
    <tr
      class="border-b border-slate-100 bg-slate-50/40 hover:bg-indigo-50/20 transition-colors"
      :class="sub.expandible || sub.tieneCuentas ? 'cursor-pointer' : ''"
      @click.stop="onRowClick(sub)"
    >
      <td
        class="py-2 font-medium text-slate-700 sticky left-0 z-[5] bg-slate-50/70 border-r border-slate-100 leading-snug"
        :class="paddingClass"
      >
        <span v-if="sub.expandible || sub.tieneCuentas" class="inline-flex items-center gap-2">
          <span class="text-indigo-500 text-lg leading-none w-4">{{
            filaAbierta(sub) ? "▾" : "▸"
          }}</span>
          <span>{{ sub.label }}</span>
        </span>
        <span v-else>{{ sub.label }}</span>
      </td>
      <td
        v-for="emp in empresas"
        :key="clave(sub) + emp"
        class="px-3 py-2 text-right font-mono text-slate-600"
        :class="(sub.valoresPorEmpresa[emp] || 0) < 0 ? 'text-rose-500' : ''"
      >
        {{ formatCLPContable(sub.valoresPorEmpresa[emp]) }}
      </td>
      <td
        class="px-4 py-2 text-right font-mono font-semibold bg-slate-100/40 border-l border-slate-100 text-slate-700"
        :class="(sub.acumulado || 0) < 0 ? 'text-rose-600' : ''"
      >
        {{ formatCLPContable(sub.acumulado) }}
      </td>
    </tr>

    <GerencialSubfilasRows
      v-if="sub.expandible && sub.subfilas?.length && abiertas[clave(sub)]"
      :subfilas="sub.subfilas"
      :empresas="empresas"
      :depth="depth + 1"
      :path-prefix="`${clave(sub)}/`"
      :abiertas="abiertas"
      :format-c-l-p-contable="formatCLPContable"
      @toggle="emit('toggle', $event)"
    />

    <GerencialCuentasRows
      v-if="sub.tieneCuentas && abiertas[claveCuentas(sub)]"
      :cuentas="sub.cuentas"
      :empresas="empresas"
      :depth="depth"
      :path-prefix="`${claveCuentas(sub)}/`"
      :abiertas="abiertas"
      :format-c-l-p-contable="formatCLPContable"
      @toggle="emit('toggle', $event)"
    />
  </template>
</template>

<script setup>
import { computed } from "vue";
import GerencialSubfilasRows from "./GerencialSubfilasRows.vue";
import GerencialCuentasRows from "./GerencialCuentasRows.vue";

const props = defineProps({
  subfilas: { type: Array, required: true },
  empresas: { type: Array, required: true },
  depth: { type: Number, default: 1 },
  pathPrefix: { type: String, default: "" },
  abiertas: { type: Object, required: true },
  formatCLPContable: { type: Function, required: true },
});

const emit = defineEmits(["toggle"]);

const paddingClass = computed(() => {
  if (props.depth <= 1) return "px-4 pl-10";
  if (props.depth === 2) return "px-4 pl-14";
  return "px-4 pl-[4.5rem]";
});

function clave(sub) {
  return `${props.pathPrefix}${sub.key}`;
}

function claveCuentas(sub) {
  return `${clave(sub)}|cuentas`;
}

function filaAbierta(sub) {
  if (sub.expandible) return props.abiertas[clave(sub)];
  if (sub.tieneCuentas) return props.abiertas[claveCuentas(sub)];
  return false;
}

function onRowClick(sub) {
  if (sub.expandible) emit("toggle", clave(sub));
  else if (sub.tieneCuentas) emit("toggle", claveCuentas(sub));
}
</script>
