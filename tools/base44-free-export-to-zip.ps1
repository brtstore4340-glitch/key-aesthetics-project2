Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

trap {
  try { Write-Host "[FAIL] $($_.Exception.Message)" -ForegroundColor Red } catch {}
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
    [ValidateSet("INFO","WARN","PASS","FAIL")][string]$Level="INFO"
  )
  $c = @{ INFO="Cyan"; WARN="Yellow"; PASS="Green"; FAIL="Red" }
  $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  Write-Host "[$Level] $ts $Message" -ForegroundColor $c[$Level]
}

function Out-FileUtf8NoBom {
  param([string]$Path, [string]$Content)
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

function Backup-Folder {
  param([string]$TargetFolder, [string]$BackupRoot)
  if (-not (Test-Path -LiteralPath $TargetFolder)) { return $null }
  $stamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
  $dest = Join-Path $BackupRoot ("backup_export_{0}" -f $stamp)
  Copy-Item -LiteralPath $TargetFolder -Destination $dest -Recurse -Force
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
  try {
    & $Script 2>&1 | Tee-Object -FilePath $LogFile -Append | Out-Null
    Write-Log "DONE: $Name (ExitCode=0) in $([int]((Get-Date)-$start).TotalSeconds)s" "PASS"
  } catch {
    Write-Log "ERROR: $Name (ExitCode=1) -> $($_.Exception.Message)" "FAIL"
    throw
  }
}

# ------------------ CONFIG ------------------
$root = Get-Location
$toolsDir = Join-Path $root "tools"
$logsDir  = Join-Path $toolsDir "logs"
New-Dir $toolsDir
New-Dir $logsDir

$stamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$runLog = Join-Path $logsDir ("base44_free_export_{0}.log" -f $stamp)
$summary = Join-Path $logsDir "summary.txt"

$backupRoot = Join-Path $toolsDir ("backup_{0}" -f $stamp)
New-Dir $backupRoot

$lastBackupTxt = Join-Path $toolsDir "LAST_BACKUP_DIR.txt"
Out-FileUtf8NoBom -Path $lastBackupTxt -Content $backupRoot

$exportDir = Join-Path $root "base44_export"
$zipPath   = Join-Path $root ("base44_export_{0}.zip" -f $stamp)

Write-Log "ExportDir = $exportDir" "INFO"
Write-Log "ZipPath   = $zipPath" "INFO"
Write-Log "LogFile   = $runLog" "INFO"

# ------------------ READ MANIFEST FROM CLIPBOARD ------------------
Exec-Step -Name "Read clipboard manifest" -LogFile $runLog -Script {
  $clip = Get-Clipboard -Raw
  if ([string]::IsNullOrWhiteSpace($clip)) {
    throw "Clipboard is empty. Copy the manifest into clipboard first."
  }
  if ($clip -notmatch "===FILE:") {
    throw "Clipboard doesn't look like a manifest. Need: ===FILE:path=== ... ===END==="
  }
  Set-Variable -Name "ManifestText" -Value $clip -Scope Script
  Write-Log "Clipboard manifest loaded (Length=$($clip.Length))" "PASS"
}

Exec-Step -Name "Backup old export folder (if exists)" -LogFile $runLog -Script {
  $b = Backup-Folder -TargetFolder $exportDir -BackupRoot $backupRoot
  if ($b) { Write-Log "Backup created: $b" "INFO" }
}

Exec-Step -Name "Prepare clean export folder" -LogFile $runLog -Script {
  if (Test-Path -LiteralPath $exportDir) {
    Remove-Item -LiteralPath $exportDir -Recurse -Force
  }
  New-Dir $exportDir
}

Exec-Step -Name "Write files from manifest" -LogFile $runLog -Script {
  $text = $Script:ManifestText
  $pattern = "(?ms)===FILE:(.+?)===\s*(.*?)\s*===END==="
  $m = [regex]::Matches($text, $pattern)
  if ($m.Count -eq 0) {
    throw "No file blocks found. Format must be: ===FILE:path=== ... ===END==="
  }

  $written = 0
  foreach ($match in $m) {
    $rel = $match.Groups[1].Value.Trim()
    $content = $match.Groups[2].Value

    if ([string]::IsNullOrWhiteSpace($rel)) { continue }
    $rel = $rel -replace "\\","/"
    $rel = $rel.TrimStart("/")

    $dest = Join-Path $exportDir ($rel -replace "/","\")
    $destDir = Split-Path -Parent $dest
    if ([string]::IsNullOrWhiteSpace($destDir)) { $destDir = $exportDir }
    New-Dir $destDir

    Out-FileUtf8NoBom -Path $dest -Content $content
    $written++
    Write-Log "Wrote: $rel" "INFO"
  }

  Write-Log "Total files written: $written" "PASS"
}

Exec-Step -Name "Create ZIP" -LogFile $runLog -Script {
  if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
  }
  Compress-Archive -Path (Join-Path $exportDir "*") -DestinationPath $zipPath -Force
  if (-not (Test-Path -LiteralPath $zipPath)) { throw "ZIP not created: $zipPath" }
  Write-Log "ZIP created: $zipPath" "PASS"
}

Exec-Step -Name "Write summary" -LogFile $runLog -Script {
  $lines = @(
    "BASE44 FREE EXPORT SUMMARY",
    "Time: " + (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"),
    "ExportDir: $exportDir",
    "ZipPath: $zipPath",
    "BackupRoot: $backupRoot",
    "RunLog: $runLog"
  ) -join "`r`n"
  Out-FileUtf8NoBom -Path $summary -Content $lines
  Write-Log "Summary written: $summary" "PASS"
}

Write-Log "ALL DONE ✅ ZIP ready: $zipPath" "PASS"
exit 0