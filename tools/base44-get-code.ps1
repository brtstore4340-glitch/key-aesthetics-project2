# tools/base44-get-code.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

trap {
  try {
    Write-Host "[FAIL] $($_.Exception.Message)" -ForegroundColor Red
  } catch {}
  exit 1
}

function New-Dir([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Write-Log {
  param(
    [string]$Message,
    [ValidateSet("INFO","WARN","PASS","FAIL")][string]$Level = "INFO"
  )
  $color = @{
    INFO = "Cyan"
    WARN = "Yellow"
    PASS = "Green"
    FAIL = "Red"
  }
  $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  Write-Host "[$Level] $ts $Message" -ForegroundColor $color[$Level]
}

function Out-FileUtf8NoBom {
  param([string]$Path, [string]$Content)
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Backup-Path {
  param([string]$TargetPath, [string]$BackupRoot)
  if (-not (Test-Path -LiteralPath $TargetPath)) { return $null }
  $stamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
  $name = (Split-Path -Leaf $TargetPath)
  $dest = Join-Path $BackupRoot ("backup_{0}_{1}" -f $name, $stamp)
  Copy-Item -LiteralPath $TargetPath -Destination $dest -Recurse -Force
  return $dest
}

function Exec-Step {
  param(
    [string]$Name,
    [scriptblock]$Script,
    [string]$LogFile
  )
  $start = Get-Date
  Write-Log "STEP: $Name" "INFO"
  $exitCode = 0
  try {
    & $Script 2>&1 | Tee-Object -FilePath $LogFile -Append | Out-Null
    $exitCode = 0
    Write-Log "DONE: $Name (ExitCode=$exitCode) in $([int]((Get-Date)-$start).TotalSeconds)s" "PASS"
  } catch {
    $exitCode = 1
    Write-Log "ERROR: $Name (ExitCode=$exitCode) -> $($_.Exception.Message)" "FAIL"
    throw
  }
}

# ---------- CONFIG ----------
$RepoUrl    = $env:BASE44_GIT_REPO_URL
$ZipUrl     = $env:BASE44_ZIP_URL
$OutRoot    = $env:BASE44_OUT_DIR
if ([string]::IsNullOrWhiteSpace($OutRoot)) { $OutRoot = (Join-Path (Get-Location) "base44_export") }

$toolsDir = Join-Path (Get-Location) "tools"
$logsDir  = Join-Path $toolsDir "logs"
New-Dir $toolsDir
New-Dir $logsDir

$stamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$runLog = Join-Path $logsDir ("base44_get_code_{0}.log" -f $stamp)
$summary = Join-Path $logsDir "summary.txt"

New-Dir $OutRoot
$backupRoot = Join-Path $toolsDir ("backup_{0}" -f $stamp)
New-Dir $backupRoot

$lastBackupTxt = Join-Path $toolsDir "LAST_BACKUP_DIR.txt"
Out-FileUtf8NoBom -Path $lastBackupTxt -Content $backupRoot

Write-Log "OutputRoot = $OutRoot" "INFO"
Write-Log "BackupRoot = $backupRoot" "INFO"
Write-Log "LogFile    = $runLog" "INFO"

# Backup existing output folder contents (if any)
$existingBackup = Backup-Path -TargetPath $OutRoot -BackupRoot $backupRoot
if ($existingBackup) {
  Write-Log "Backed up existing output to: $existingBackup" "INFO"
}

# Decide mode
$mode = ""
if (-not [string]::IsNullOrWhiteSpace($RepoUrl)) { $mode = "GIT" }
elseif (-not [string]::IsNullOrWhiteSpace($ZipUrl)) { $mode = "ZIP" }

if ([string]::IsNullOrWhiteSpace($mode)) {
  Write-Log "No BASE44_GIT_REPO_URL or BASE44_ZIP_URL provided." "FAIL"
  Write-Log "Set one of these env vars, then re-run." "WARN"
  Write-Host ""
  Write-Host "Example (GitHub):" -ForegroundColor Yellow
  Write-Host '  $env:BASE44_GIT_REPO_URL="https://github.com/<org>/<repo>.git"' -ForegroundColor Yellow
  Write-Host '  .\tools\base44-get-code.ps1' -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Example (ZIP):" -ForegroundColor Yellow
  Write-Host '  $env:BASE44_ZIP_URL="https://..."' -ForegroundColor Yellow
  Write-Host '  .\tools\base44-get-code.ps1' -ForegroundColor Yellow
  exit 2
}

# Clean output root (fresh state)
Exec-Step -Name "Prepare output directory" -LogFile $runLog -Script {
  if (Test-Path -LiteralPath $OutRoot) {
    Get-ChildItem -LiteralPath $OutRoot -Force -ErrorAction Stop | Remove-Item -Recurse -Force -ErrorAction Stop
  }
  New-Dir $OutRoot
}

if ($mode -eq "GIT") {
  Exec-Step -Name "Clone from GitHub" -LogFile $runLog -Script {
    $git = (Get-Command git -ErrorAction SilentlyContinue)
    if (-not $git) { throw "git not found. Install Git for Windows and ensure it's in PATH." }

    $target = Join-Path $OutRoot "app"
    git clone $RepoUrl $target | Out-Null

    if (-not (Test-Path -LiteralPath $target)) { throw "Clone failed, target folder missing: $target" }
    Write-Log "Cloned to: $target" "PASS"
  }
}
elseif ($mode -eq "ZIP") {
  Exec-Step -Name "Download ZIP" -LogFile $runLog -Script {
    $zipPath = Join-Path $OutRoot "base44_project.zip"
    Invoke-WebRequest -Uri $ZipUrl -OutFile $zipPath -UseBasicParsing
    if (-not (Test-Path -LiteralPath $zipPath)) { throw "ZIP download failed: $zipPath" }
    Write-Log "ZIP saved: $zipPath" "PASS"
  }

  Exec-Step -Name "Extract ZIP" -LogFile $runLog -Script {
    $zipPath = Join-Path $OutRoot "base44_project.zip"
    $extractDir = Join-Path $OutRoot "app"
    New-Dir $extractDir
    Expand-Archive -LiteralPath $zipPath -DestinationPath $extractDir -Force
    Write-Log "Extracted to: $extractDir" "PASS"
  }
}

# Write summary
Exec-Step -Name "Write summary" -LogFile $runLog -Script {
  $lines = @(
    "BASE44 GET CODE SUMMARY",
    "Time: " + (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"),
    "Mode: $mode",
    "OutputRoot: $OutRoot",
    "BackupRoot: $backupRoot",
    "RunLog: $runLog"
  ) -join "`r`n"
  Out-FileUtf8NoBom -Path $summary -Content $lines
  Write-Log "Summary written: $summary" "PASS"
}

Write-Log "ALL DONE ✅ Your code is in: $OutRoot\app" "PASS"
exit 0
