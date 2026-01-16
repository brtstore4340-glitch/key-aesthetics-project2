[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

function Ensure-Dir([string]$Path) {
  if (-not (Test-Path $Path)) { New-Item -ItemType Directory -Path $Path | Out-Null }
}

function Run-And-Log([string]$Name, [string]$Cmd) {
  $ts = Get-Date -Format "yyyyMMdd_HHmmss"
  $logDir = ".\tools\logs"
  Ensure-Dir $logDir
  $logPath = Join-Path $logDir ($Name + ".log")

  "### $Name @ $ts" | Out-File -FilePath $logPath -Encoding utf8
  "CMD: $Cmd" | Out-File -FilePath $logPath -Append -Encoding utf8
  "PWD: $(Get-Location)" | Out-File -FilePath $logPath -Append -Encoding utf8
  "" | Out-File -FilePath $logPath -Append -Encoding utf8

  # Run via cmd.exe to capture stdout+stderr reliably
  cmd.exe /c "$Cmd 1>> `"$logPath`" 2>>&1"
  $exit = $LASTEXITCODE

  "" | Out-File -FilePath $logPath -Append -Encoding utf8
  "EXITCODE: $exit" | Out-File -FilePath $logPath -Append -Encoding utf8

  Write-Host ("- {0}: EXIT={1} LOG={2}" -f $Name, $exit, $logPath)
  return $exit
}

Ensure-Dir ".\tools\logs"

Write-Host "Collecting logs into .\tools\logs\" -ForegroundColor Cyan

# 1) Biome
Run-And-Log "biome-check" "npx -y @biomejs/biome check ."

# 2) Typecheck
Run-And-Log "typecheck-root" "npm run typecheck"

# 3) Build
Run-And-Log "build" "npm run build"

# 4) Audit
Run-And-Log "audit" "npm run audit"

Write-Host ""
Write-Host "Done. List logs:" -ForegroundColor Cyan
Write-Host "  Get-ChildItem .\tools\logs"
