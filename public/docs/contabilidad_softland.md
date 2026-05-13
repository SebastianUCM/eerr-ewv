# Contabilidad Softland — diccionario y extracción

Este proyecto lee **solo con `SELECT`** tablas/vistas reales de Softland. Los nombres siguen el diccionario estándar (p. ej. `cwmovim`, `cwpctas`, `CW_vsnpSaldoCuenta`, `CW_vsnpSalCtaIFRS`).

## Variables de entorno

| Variable | Uso |
|----------|-----|
| `SOFTLAND_SQL_SERVER` | Servidor SQL |
| `SOFTLAND_SQL_USER` / `SOFTLAND_SQL_PASSWORD` | Credenciales |
| `SOFTLAND_SCHEMA` | Esquema (por defecto `softland`). Si tus objetos están en `dbo`, usa `SOFTLAND_SCHEMA=dbo`. |
| `SOFTLAND_TABLE_PREFIX` | Opcional. Prefijo de tres partes para `cwmovim` / `cwpctas` en la consulta por periodo contable (equivalente a lo que en Snowflake sería `BACKUP_EMPRESAS.FIDELMIRA.CWMOVIM`). Ejemplo: `BACKUP_EMPRESAS.FIDELMIRA`. |

### Equivalencia con la consulta “tipo Snowflake”

Si en Snowflake agregas `CWMOVIM` con `CpbAno` / `CpbMes` y `MovDebe - MovHaber`, en SQL Server el script usa la misma lógica en **`--fuente cwmovim_cpb`** o como **fallback automático** cuando `--fuente ifrs` no puede leer `CW_vsnpSalCtaIFRS`.

- Eso **no sustituye** un mapeo IFRS contable real; es el **neto del periodo** por cuenta en movimientos.
- Para tablas bajo otro nombre calificado, define `SOFTLAND_TABLE_PREFIX` antes de ejecutar el extracto.

## Scripts

### `script/extract_contabilidad.py`

Genera `src/assets/data/<EMPRESA>/contabilidad.json` (último extracto / pipeline).

- **`--fuente cwmovim`** (default): movimientos desde `cwmovim` + plan `cwpctas`.  
  - `--modo cierre`: saldo acumulado hasta `--hasta` (o hoy).  
  - `--modo movimiento`: variación entre `--desde` y `--hasta`.
- **`--fuente saldo_vista`**: foto de saldos desde la vista **`CW_vsnpSaldoCuenta`** (año/mes según `--hasta`).
- **`--fuente ifrs`**: saldos IFRS desde **`CW_vsnpSalCtaIFRS`**.

Metadatos en JSON: `fuente_datos`, `norma` (`nch` / `ifrs`), `alcance` (`individual` / `consolidado`), `tablas_softland`.

### `script/extract_contabilidad_snapshot.py`

Guarda JSON en `historico/` y registra entradas en `historico/index.json`.

| Argumento | Descripción |
|-----------|-------------|
| `--fuente cwmovim` | Igual que arriba; `--modo movimiento \| cierre` |
| `--fuente saldo_vista` | Vista local de saldos |
| `--fuente ifrs` | Vista IFRS |
| `--norma` / `--alcance` | Metadatos para el dashboard |

Los IDs públicos en el índice incluyen sufijo: `-mov`, `-cie`, `-sv`, `-ifrs` (p. ej. `2025-03-ifrs`).

### `script/sql_softland_contabilidad.py`

Plantillas SQL con **fallback**: prueba columnas `Ano`/`Mes` y luego `CpbAno`/`CpbMes` si la primera variante falla. Si ninguna coincide con tu instalación, ejecuta en SQL Server:

```sql
SELECT TOP 5 * FROM softland.CW_vsnpSaldoCuenta;
SELECT TOP 5 * FROM softland.CW_vsnpSalCtaIFRS;
```

y ajusta las consultas en ese archivo.

## Dashboard (EEFF)

La vista **Estados financieros** filtra snapshots por:

- **Modo Softland**: movimiento del periodo vs saldo a fecha (solo aplica a `cwmovim`; vistas IFRS/saldo van como saldo).
- **Norma**: NCH vs IFRS (metadato o sufijo `-ifrs`).
- **Fuente**: `cwmovim`, vista de saldos o IFRS.

Si hay varios snapshots para el mismo año/mes, el auto-seleccionado prioriza: `cwmovim` → `saldo_vista` → `ifrs`. Puedes fijar uno concreto en **Snapshot (avanzado)**.

## Consolidado vs individual

El campo `alcance` en el JSON es **metadato**. Si en tu BD el consolidado usa otra vista o empresa, amplía `sql_softland_contabilidad.py` y el script de extracto según la documentación Softland de tu versión.
