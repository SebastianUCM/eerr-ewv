const MESES = [
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

const SECCIONES = [
  { key: "ingreso_explotacion", label: "Ingreso de Explotacion", test: (c) => c.startsWith("4-1-") },
  { key: "ingreso_financiero", label: "Ingresos Financieros", test: (c) => c.startsWith("4-2-") },
  { key: "gasto_adm_ventas", label: "Gastos de Administracion y Ventas", test: (c) => c.startsWith("5-")},
  //{ key: "gasto_adm_ventas", label: "Gastos de Administracion y Ventas", test: (c) => c.startsWith("5-") || c.startsWith("3-1-") },
  { key: "otros_resultados", label: "Otros Resultados", test: (c) => !c.startsWith("4-1-") && !c.startsWith("4-2-") && !c.startsWith("5-") && !c.startsWith("3-1-") },
];

function avg(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function median(nums) {
  if (!nums.length) return 0;
  const arr = [...nums].sort((a, b) => a - b);
  const m = Math.floor(arr.length / 2);
  return arr.length % 2 === 0 ? (arr[m - 1] + arr[m]) / 2 : arr[m];
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function monthlySeriesSoftland(saldoActual = 0, mesBaseIndex = 0) {
  const arr = Array(12).fill(0);
  arr[Math.min(11, Math.max(0, mesBaseIndex))] = Number(saldoActual || 0);
  return arr;
}

function proyectarDesdeSaldo(saldoActual = 0, mesBaseIndex = 0) {
  const proy = Array(12).fill(0);
  let base = Number(saldoActual || 0);
  for (let i = 0; i < 12; i += 1) {
    if (i < mesBaseIndex) continue;
    proy[i] = base;
    base *= 1.01;
  }
  return proy;
}

function normalizarCentros(cuenta, mesBaseIndex, proyBase) {
  const centros = Array.isArray(cuenta?.centros) ? cuenta.centros : [];
  if (!centros.length) {
    return [
      {
        codigo: "N/A",
        nombre: "Sin centro de costo informado",
        real: [...cuenta.real],
        proyeccion: [...proyBase],
      },
    ];
  }
  const sumaPesos = centros.reduce(
    (a, cc) => a + Math.abs(Number(cc?.saldo ?? 0)),
    0
  );
  return centros.map((cc) => {
    let real = Array(12).fill(0);
    if (sumaPesos > 0) {
      const peso = Math.abs(Number(cc?.saldo ?? 0)) / sumaPesos;
      real[mesBaseIndex] = (cuenta.real?.[mesBaseIndex] || 0) * peso;
    }
    const base = real[mesBaseIndex] || 0;
    const proyeccion = Array(12)
      .fill(0)
      .map((_, i) => (i < mesBaseIndex ? 0 : base * Math.pow(1.01, i - mesBaseIndex)));
    return {
      codigo: String(cc.codigo || "N/A"),
      nombre: String(cc.nombre || "Centro de costo"),
      real,
      proyeccion,
    };
  });
}

function normalizarTexto(v) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseNombreCuenta(nombre) {
  const txt = String(nombre || "").trim();
  const m = txt.match(/^(\d+(?:-\d+)+)\s+(.*)$/);
  if (!m) return { codigoLargo: null, descripcion: txt };
  return { codigoLargo: m[1], descripcion: m[2] };
}

function categoriaPorCodigo(codigo) {
  const c = String(codigo || "");
  if (c.startsWith("4-")) return "ingresos";
  if (c.startsWith("5-")) return "costos";
  if (c.startsWith("6-")) return "gastos";
  if (c.startsWith("3-")) return "gastos";
  return "otros";
}

export function construirEeffProyeccion(
  dataset,
  anioBase = "2025",
  lookupSoftland = {}
) {
  const yearData = dataset?.anios?.[anioBase];
  if (!yearData) return null;
  const mesBaseIndex = Number(lookupSoftland?.mesBaseIndex ?? 0);

  const real = {
    ingresos: Array(12).fill(0),
    costos: Array(12).fill(0),
    gastos: Array(12).fill(0),
    otros: Array(12).fill(0),
  };
  const proy = {
    ingresos: Array(12).fill(0),
    costos: Array(12).fill(0),
    gastos: Array(12).fill(0),
    otros: Array(12).fill(0),
  };

  const detalle = (yearData.cuentas || []).map((cuenta) => {
    const codigo = String(cuenta.codigo || "");
    const { codigoLargo, descripcion } = parseNombreCuenta(cuenta.nombre);
    const descNorm = normalizarTexto(descripcion || cuenta.nombre);
    const cuentaSoftland =
      lookupSoftland?.byCodigo?.[codigo] ||
      (codigoLargo ? lookupSoftland?.byCodigo?.[codigoLargo] : null) ||
      lookupSoftland?.byNombre?.[descNorm] ||
      null;
    const codigoSoftland = String(cuentaSoftland?.codigo || codigoLargo || codigo);
    const centrosEncontrados =
      cuentaSoftland?.centros ||
      cuenta.centros;
    const saldoSoftland = Number(cuentaSoftland?.saldoActual ?? 0);
    const realSerie = monthlySeriesSoftland(saldoSoftland, mesBaseIndex);
    const proySerie = proyectarDesdeSaldo(saldoSoftland, mesBaseIndex);
    const cuentaConCentros = {
      ...cuenta,
      real: realSerie,
      centros: Array.isArray(centrosEncontrados)
        ? centrosEncontrados
        : cuenta.centros,
    };
    const centros = normalizarCentros(cuentaConCentros, mesBaseIndex, proySerie);
    const seccion =
      SECCIONES.find((s) => s.test(codigo))?.key ?? "otros_resultados";
    return {
      codigo,
      codigoSoftland,
      nombre: String(cuenta.nombre || "").trim(),
      seccion,
      real: realSerie,
      proyeccion: proySerie,
      totalReal: realSerie.reduce((a, b) => a + b, 0),
      totalProyeccion: proySerie.reduce((a, b) => a + b, 0),
      centros: centros.map((cc) => ({
        ...cc,
        totalReal: cc.real.reduce((a, b) => a + b, 0),
        totalProyeccion: cc.proyeccion.reduce((a, b) => a + b, 0),
      })),
    };
  });

  for (const item of detalle) {
    const cat = categoriaPorCodigo(item.codigo);
    for (let i = 0; i < 12; i += 1) {
      real[cat][i] += item.real[i] || 0;
      proy[cat][i] += item.proyeccion[i] || 0;
    }
  }

  const total = (obj) => obj.ingresos + obj.costos + obj.gastos + obj.otros;
  const rows = MESES.map((mes, i) => {
    const realMes = {
      ingresos: real.ingresos[i],
      costos: real.costos[i],
      gastos: real.gastos[i],
      otros: real.otros[i],
    };
    const proyMes = {
      ingresos: proy.ingresos[i],
      costos: proy.costos[i],
      gastos: proy.gastos[i],
      otros: proy.otros[i],
    };
    return {
      mes,
      real: realMes,
      proyeccion: proyMes,
      resultadoReal: total(realMes),
      resultadoProyeccion: total(proyMes),
    };
  });

  const resumen = rows.reduce(
    (acc, r) => {
      acc.real += r.resultadoReal;
      acc.proyeccion += r.resultadoProyeccion;
      return acc;
    },
    { real: 0, proyeccion: 0 }
  );

  const secciones = SECCIONES.map((sec) => {
    const cuentas = detalle.filter((d) => d.seccion === sec.key);
    const subtotalRealMensual = Array(12).fill(0);
    const subtotalProyMensual = Array(12).fill(0);
    for (const c of cuentas) {
      for (let i = 0; i < 12; i += 1) {
        subtotalRealMensual[i] += c.real[i] || 0;
        subtotalProyMensual[i] += c.proyeccion[i] || 0;
      }
    }
    return {
      key: sec.key,
      label: sec.label,
      cuentas,
      subtotalRealMensual,
      subtotalProyMensual,
      subtotalReal: subtotalRealMensual.reduce((a, b) => a + b, 0),
      subtotalProyeccion: subtotalProyMensual.reduce((a, b) => a + b, 0),
    };
  }).filter((s) => s.cuentas.length > 0);

  return {
    anioBase,
    anioProyeccion: String(Number(anioBase) + 1),
    meses: MESES,
    rows,
    resumen,
    secciones,
  };
}

export function formatCLP(v) {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(
    Math.round(Number(v || 0))
  );
}

export function formatCLPContable(v) {
  const n = Math.round(Number(v || 0));
  const abs = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(
    Math.abs(n)
  );
  if (n < 0) return `(${abs})`;
  return abs;
}
