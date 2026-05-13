<#
.SYNOPSIS
  Genera snapshots contables mensuales (modo movimiento + cierre) desde Softland.

.DESCRIPTION
  Ejecutar desde la RAIZ del repo dashboard-fidelmira (el script cambia el cwd solo).
  Requiere VPN si el SQL Server es remoto. Variables: SOFTLAND_SQL_SERVER, SOFTLAND_SQL_USER, SOFTLAND_SQL_PASSWORD

.EXAMPLE
  cd C:\ruta\dashboard-fidelmira
  powershell -ExecutionPolicy Bypass -File .\script\snapshot_mensual_softland.ps1 -Empresa FIDELMIRA -AnioDesde 2020
#>
param(
    [string]$Empresa = "FIDELMIRA",
    [int]$AnioDesde = 2020
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$hoy = Get-Date
$cursor = Get-Date -Year $AnioDesde -Month 1 -Day 1

while ($cursor -le $hoy) {
    $y = $cursor.Year
    $m = $cursor.Month
    $desde = Get-Date -Year $y -Month $m -Day 1
    $hasta = ($desde.AddMonths(1).AddDays(-1))
    if ($hasta -gt $hoy) { $hasta = $hoy }

    $id = "{0}-{1:D2}" -f $y, $m
    $ds = $desde.ToString("yyyy-MM-dd")
    $hs = $hasta.ToString("yyyy-MM-dd")

    Write-Host "=== $id  $ds .. $hs ===" -ForegroundColor Cyan
    python script/extract_contabilidad_snapshot.py $Empresa --desde $ds --hasta $hs --id $id --modo movimiento
    if ($LASTEXITCODE -ne 0) { Write-Warning "Fallo movimiento $id"; exit $LASTEXITCODE }
    python script/extract_contabilidad_snapshot.py $Empresa --desde $ds --hasta $hs --id $id --modo cierre
    if ($LASTEXITCODE -ne 0) { Write-Warning "Fallo cierre $id"; exit $LASTEXITCODE }

    $cursor = $cursor.AddMonths(1)
}

Write-Host "[OK] Batch mensual terminado." -ForegroundColor Green
