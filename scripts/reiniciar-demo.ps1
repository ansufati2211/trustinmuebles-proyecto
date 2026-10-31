# Deja la demo como recién instalada: detiene el backend y la interfaz de este proyecto, borra la base local y revisa el puerto.
# Borra los datos de trustinmuebles-backend/data (la carpeta no se versiona): casos captados, solicitudes e informes emitidos.
#
# Uso, desde la raíz del proyecto:
#   powershell -ExecutionPolicy Bypass -File scripts\reiniciar-demo.ps1
$ErrorActionPreference = "Stop"

$raiz = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$backend = Join-Path $raiz "trustinmuebles-backend"
$interfaz = Join-Path $raiz "trustinmuebles"
$hayProblemas = $false

# Solo las carpetas de ejecución, no toda la raíz: el editor y sus extensiones también mencionan la raíz en su línea de comandos.
# Maven escribe la ruta sin «\» final; el límite de nombre evita que coincida una carpeta hermana como trustinmuebles-backend-copia.
function Es-DelProyecto($proceso) {
    if (-not $proceso.CommandLine) { return $false }
    $linea = $proceso.CommandLine.Replace("/", "\")
    $carpeta = if ($proceso.Name -eq "java.exe") { $backend } else { $interfaz }
    return $linea -match ([regex]::Escape($carpeta) + '(?![\w.-])')
}

function Buscar-Procesos {
    $todos = @(Get-CimInstance Win32_Process -Filter "Name = 'java.exe' OR Name = 'node.exe'")
    $delProyecto = @($todos | Where-Object { Es-DelProyecto $_ })
    # spring-boot:run lanza la aplicación con el classpath en un archivo temporal: su línea de comandos no trae la ruta del
    # proyecto, así que se reconoce por ser hija de un proceso ya identificado.
    do {
        $ids = @($delProyecto | ForEach-Object { $_.ProcessId })
        $hijos = @($todos | Where-Object { ($ids -contains $_.ParentProcessId) -and ($ids -notcontains $_.ProcessId) })
        $delProyecto += $hijos
    } while ($hijos.Count -gt 0)
    return $delProyecto
}

Write-Host "`n1. Procesos java y node de este proyecto"
$procesos = @(Buscar-Procesos)
if ($procesos.Count -eq 0) {
    Write-Host "   No hay ninguno."
}
foreach ($p in $procesos) {
    Write-Host "   Deteniendo $($p.Name) (PID $($p.ProcessId))"
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}
# H2 suelta el archivo cuando el proceso termina del todo. Se espera por PID: sin Maven, su hija ya no se reconoce.
$restantes = @()
if ($procesos.Count -gt 0) {
    $ids = @($procesos | ForEach-Object { $_.ProcessId })
    for ($i = 0; $i -lt 20; $i++) {
        $restantes = @(Get-Process -Id $ids -ErrorAction SilentlyContinue)
        if ($restantes.Count -eq 0) { break }
        Start-Sleep -Milliseconds 500
    }
}

Write-Host "`n2. Base de datos local"
$data = [IO.Path]::GetFullPath((Join-Path $backend "data"))
Write-Host "   Ruta completa: $data"
if (-not $data.EndsWith("\trustinmuebles-backend\data", [StringComparison]::OrdinalIgnoreCase)) {
    Write-Host "   No se borra: la ruta no termina en trustinmuebles-backend\data." -ForegroundColor Red
    $hayProblemas = $true
} elseif ($restantes.Count -gt 0) {
    Write-Host "   No se borra: siguen activos los PID $(($restantes | ForEach-Object { $_.Id }) -join ', ')." -ForegroundColor Red
    $hayProblemas = $true
} elseif (-not (Test-Path -LiteralPath $data)) {
    Write-Host "   La carpeta no existe: no hay nada que borrar."
} else {
    try {
        # Remove-Item -Recurse de PowerShell 5.1 puede fallar con archivos sincronizados por OneDrive.
        [IO.Directory]::Delete($data, $true)
        Write-Host "   Carpeta borrada."
    } catch {
        Write-Host "   No se pudo borrar: $($_.Exception.Message)" -ForegroundColor Red
        $hayProblemas = $true
    }
}

Write-Host "`n3. Puerto 8080"
$conexiones = @(Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue)
if ($conexiones.Count -eq 0) {
    Write-Host "   Libre."
} else {
    $hayProblemas = $true
    Write-Host "   Ocupado. El backend no podrá arrancar hasta liberarlo:" -ForegroundColor Red
    foreach ($idProceso in @($conexiones | ForEach-Object { $_.OwningProcess } | Sort-Object -Unique)) {
        $dueno = Get-CimInstance Win32_Process -Filter "ProcessId = $idProceso"
        $ruta = if ($dueno.ExecutablePath) { $dueno.ExecutablePath } else { "ruta no disponible" }
        Write-Host "   PID $idProceso : $($dueno.Name) ($ruta)"
        foreach ($s in @(Get-CimInstance Win32_Service -Filter "ProcessId = $idProceso")) {
            Write-Host "   Servicio: $($s.Name) ($($s.DisplayName))"
        }
    }
}

Write-Host "`n4. Para arrancar, cada comando en su propia terminal"
Write-Host "   Backend:"
Write-Host "   cd `"$backend`"; `$env:APP_SEED_PASSWORD = 'elige-una-clave-de-prueba'; .\mvnw.cmd spring-boot:run"
Write-Host "   Interfaz:"
Write-Host "   cd `"$interfaz`"; npx pnpm@9 dev"

if ($hayProblemas) {
    Write-Host "`nEl reinicio quedó incompleto: revisa los mensajes en rojo." -ForegroundColor Red
    exit 1
}
Write-Host "`nListo. La base se crea de nuevo al arrancar el backend."
