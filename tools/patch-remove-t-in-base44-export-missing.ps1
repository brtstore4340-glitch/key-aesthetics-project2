# File: tools/patch-remove-t-in-base44-export-missing.ps1
# Purpose: Remove any PowerShell-interpreted `${t}` occurrences from tools/base44-export-missing.ps1
# This fixes: "The variable '$t' cannot be retrieved because it has not been set."

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

trap {
  try { Write-Host "[FATAL] $($_.Exception.Message)" -ForegroundColor Red } catch {}
  exit 1
}

function New-Utf8NoBomEncoding { [System.Text.UTF8Encoding]::new($false) }

function Ensure-Dir {
  param([Parameter(Mandatory=$true)][string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path)) { throw "Ensure-Dir: Path is empty" }
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Write-LogLine {
  param(
    [Parameter(Mandatory=$true)][string]$LogPath,
    [Parameter(Mandatory=$true)][string]$Message,
    [ValidateSet("INFO","WARN","FAIL","PASS")][string]$Level = "INFO"
  )
  $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss.fff")
  $line = "[$ts][$Level] $Message"
  Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8
  switch ($Level) {
    "INFO" { Write-Host $line -ForegroundColor Cyan }
    "WARN" { Write-Host $line -ForegroundColor Yellow }
    "FAIL" { Write-Host $line -ForegroundColor Red }
    "PASS" { Write-Host $line -ForegroundColor Green }
  }
}

function Get-RepoRoot {
  param([string]$StartDir)
  if ([string]::IsNullOrWhiteSpace($StartDir)) { $StartDir = (Get-Location).Path }
  $cur = Resolve-Path -LiteralPath $StartDir
  while ($true) {
    $candidate = Join-Path $cur.Path "client\src"
    if (Test-Path -LiteralPath $candidate) { return $cur.Path }
    $parent = Split-Path -Path $cur.Path -Parent
    if ($parent -eq $cur.Path -or [string]::IsNullOrWhiteSpace($parent)) { break }
    $cur = Resolve-Path -LiteralPath $parent
  }
  throw "หา RepoRoot ไม่เจอ (ต้องมี client\src)."
}

function Backup-File {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [Parameter(Mandatory=$true)][string]$BackupDir,
    [Parameter(Mandatory=$true)][string]$RepoRoot,
    [Parameter(Mandatory=$true)][string]$LogPath
  )
  if (-not (Test-Path -LiteralPath $FilePath)) { return }

  $rel = $FilePath
  if ($rel.ToLower().StartsWith($RepoRoot.ToLower())) {
    $rel = $rel.Substring($RepoRoot.Length).TrimStart("\","/")
  } else {
    $rel = Split-Path -Path $FilePath -Leaf
  }

  $dest = Join-Path $BackupDir $rel
  Ensure-Dir -Path (Split-Path -Path $dest -Parent)
  Copy-Item -LiteralPath $FilePath -Destination $dest -Force
  Write-LogLine -LogPath $LogPath -Level "INFO" -Message ("Backup: " + $rel)
}

# ---------------- MAIN ----------------
$repoRoot = Get-RepoRoot -StartDir (Get-Location).Path
$toolsDir = Join-Path $repoRoot "tools"
$logsDir  = Join-Path $toolsDir "logs"
Ensure-Dir -Path $toolsDir
Ensure-Dir -Path $logsDir

$logPath = Join-Path $logsDir ("patch_remove_t_" + (Get-Date).ToString("yyyyMMdd_HHmmss") + ".log")
Write-LogLine -LogPath $logPath -Level "INFO" -Message ("RepoRoot: " + $repoRoot)

$target = Join-Path $toolsDir "base44-export-missing.ps1"
if (-not (Test-Path -LiteralPath $target)) {
  Write-LogLine -LogPath $logPath -Level "FAIL" -Message ("Not found: " + $target)
  exit 2
}

$backupDir = Join-Path $toolsDir ("backup_patch_" + (Get-Date).ToString("yyyyMMdd_HHmmss"))
Ensure-Dir -Path $backupDir
[System.IO.File]::WriteAllText((Join-Path $toolsDir "LAST_BACKUP_DIR.txt"), $backupDir, (New-Utf8NoBomEncoding))
Write-LogLine -LogPath $logPath -Level "INFO" -Message ("BackupDir: " + $backupDir)

Backup-File -FilePath $target -BackupDir $backupDir -RepoRoot $repoRoot -LogPath $logPath

$content = Get-Content -LiteralPath $target -Raw -Encoding UTF8

# Remove any full lines that contain `${t}` (PowerShell tries to expand variable $t under StrictMode)
$beforeCount = ([regex]::Matches($content, '\$\{t\}')).Count
if ($beforeCount -le 0) {
  Write-LogLine -LogPath $logPath -Level "WARN" -Message "No `${t}` found. Nothing to remove."
  Write-LogLine -LogPath $logPath -Level "PASS" -Message "EXIT CODE: 0"
  exit 0
}

# Delete lines containing ${t}
$content2 = [regex]::Replace(
  $content,
  '(?m)^.*\$\{t\}.*\r?\n?',
  ''
)

$afterCount = ([regex]::Matches($content2, '\$\{t\}')).Count

# Write back UTF-8 no BOM
[System.IO.File]::WriteAllText($target, $content2, (New-Utf8NoBomEncoding))

Write-LogLine -LogPath $logPath -Level "INFO" -Message ("Found `${t}` occurrences before: " + $beforeCount)
Write-LogLine -LogPath $logPath -Level "INFO" -Message ("Remaining `${t}` occurrences after: " + $afterCount)

if ($afterCount -eq 0) {
  Write-LogLine -LogPath $logPath -Level "PASS" -Message "Removed `${t}` lines successfully."
  Write-LogLine -LogPath $logPath -Level "PASS" -Message "EXIT CODE: 0"
  exit 0
}

Write-LogLine -LogPath $logPath -Level "FAIL" -Message "Still found `${t}` after patch (unexpected)."
Write-LogLine -LogPath $logPath -Level "FAIL" -Message "EXIT CODE: 1"
exit 1
