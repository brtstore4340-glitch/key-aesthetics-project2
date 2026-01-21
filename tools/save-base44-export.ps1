# =========================
# Base44 Export Saver (Clipboard -> Files)
# Format expected from Chrome Console export:
#   FILE: page\AccountingDashboard
#   <code...>
#   FILE: components\ui\Avatar
#   <code...>
# =========================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

trap {
  try { Write-Host "[FAIL] $($_.Exception.Message)" -ForegroundColor Red } catch {}
  exit 1
}

function New-Utf8NoBomEncoding { [System.Text.UTF8Encoding]::new($false) }

function Ensure-Dir {
  param([Parameter(Mandatory=$true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Write-LogLine {
  param(
    [Parameter(Mandatory=$true)][string]$LogPath,
    [Parameter(Mandatory=$true)][string]$Message,
    [ValidateSet("INFO","WARN","PASS","FAIL")][string]$Level = "INFO"
  )
  $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  $line = "[$ts][$Level] $Message"
  Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8
  $color = @{ INFO="Cyan"; WARN="Yellow"; PASS="Green"; FAIL="Red" }[$Level]
  Write-Host $line -ForegroundColor $color
}

function Backup-IfExists {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)][string]$BackupDir
  )
  if (Test-Path -LiteralPath $Path) {
    $name = Split-Path -Leaf $Path
    $dest = Join-Path $BackupDir $name
    Copy-Item -LiteralPath $Path -Destination $dest -Force
    return $dest
  }
  return $null
}

function Write-FileUtf8NoBom {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)][string]$Content
  )
  $enc = New-Utf8NoBomEncoding
  [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

function Normalize-RelPath {
  param(
    [Parameter(Mandatory=$true)][string]$Rel,
    [Parameter(Mandatory=$true)][string]$DefaultExt
  )

  $p = ($Rel ?? "").Trim()
  $p = $p -replace '^FILE:\s*',''
  $p = $p.Trim()

  if (-not $p) { $p = "unknown\file_" + (Get-Date -Format "yyyyMMdd_HHmmss") }

  $p = $p -replace '/','\'
  $p = $p -replace '^[\\\/]+',''
  $p = $p -replace '\.\.(\\|/)', ''     # prevent path traversal
  $p = $p -replace '[:\*\?"<>\|]', '_'  # illegal chars
  $p = $p -replace '\s+$',''

  # ensure extension
  if ($p -notmatch '\.[A-Za-z0-9]+$') {
    $p = $p + $DefaultExt
  }

  return $p
}

function Parse-ClipboardExport {
  param([Parameter(Mandatory=$true)][string]$Text)

  # Returns array of PSCustomObject { RelPath, Content }
  $lines = $Text -split "`r?`n"
  $items = New-Object System.Collections.Generic.List[object]

  $currentPath = $null
  $buf = New-Object System.Collections.Generic.List[string]

  function Flush-Current {
    if ($null -ne $currentPath) {
      $content = ($buf -join "`r`n")
      $items.Add([pscustomobject]@{ RelPath = $currentPath; Content = $content }) | Out-Null
    }
    $buf.Clear()
  }

  foreach ($line in $lines) {
    if ($line -match '^\s*FILE:\s*(.+?)\s*$') {
      Flush-Current
      $currentPath = ("{0}" -f $Matches[1]).Trim()
      continue
    }
    $buf.Add($line) | Out-Null
  }

  Flush-Current

  return ,$items.ToArray()
}

param(
  [string]$OutRoot = (Join-Path (Get-Location).Path "client\src"),
  [string]$DefaultExt = ".tsx"
)

$repoRoot = (Get-Location).Path
$toolsDir = Join-Path $repoRoot "tools"
$logsDir  = Join-Path $toolsDir "logs"
Ensure-Dir $toolsDir
Ensure-Dir $logsDir

$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$logPath = Join-Path $logsDir ("base44_save_{0}.log" -f $ts)

Write-LogLine -LogPath $logPath -Message ("OutRoot: {0}" -f $OutRoot) -Level INFO
Write-LogLine -LogPath $logPath -Message ("DefaultExt: {0}" -f $DefaultExt) -Level INFO

Ensure-Dir $OutRoot

# Backup dir per run
$backupDir = Join-Path $toolsDir ("backup_{0}" -f $ts)
Ensure-Dir $backupDir
$lastBackupTxt = Join-Path $toolsDir "LAST_BACKUP_DIR.txt"
Set-Content -LiteralPath $lastBackupTxt -Value $backupDir -Encoding UTF8

$clip = Get-Clipboard -Raw
if (-not $clip -or -not $clip.Trim()) {
  Write-LogLine -LogPath $logPath -Message "Clipboard empty. Run Chrome export JS first." -Level FAIL
  throw "Clipboard empty"
}

# Parse
$items = Parse-ClipboardExport -Text $clip

# Make sure it's an array
if ($null -eq $items) { $items = @() }
if ($items -isnot [System.Array]) { $items = @($items) }

Write-LogLine -LogPath $logPath -Message ("Parsed blocks: {0}" -f $items.Length) -Level INFO

if ($items.Length -eq 0) {
  Write-LogLine -LogPath $logPath -Message "No FILE: blocks found. Clipboard format mismatch." -Level FAIL
  throw "No FILE: blocks found"
}

$written = 0
$skipped = 0

foreach ($it in $items) {
  $rawRel = [string]$it.RelPath
  $content = [string]$it.Content

  $rel = Normalize-RelPath -Rel $rawRel -DefaultExt $DefaultExt
  $dest = Join-Path $OutRoot $rel

  $destDir = Split-Path -Parent $dest
  Ensure-Dir $destDir

  # if content is empty, skip (but log)
  if (-not $content.Trim()) {
    Write-LogLine -LogPath $logPath -Message ("SKIP empty content: {0}" -f $rel) -Level WARN
    $skipped++
    continue
  }

  $bak = Backup-IfExists -Path $dest -BackupDir $backupDir
  if ($bak) {
    Write-LogLine -LogPath $logPath -Message ("Backup: {0} -> {1}" -f $rel, $bak) -Level INFO
  }

  Write-FileUtf8NoBom -Path $dest -Content $content
  Write-LogLine -LogPath $logPath -Message ("Wrote: {0}" -f $dest) -Level PASS
  $written++
}

Write-LogLine -LogPath $logPath -Message ("DONE. Written={0}, Skipped={1}, BackupDir={2}" -f $written, $skipped, $backupDir) -Level PASS
Write-Host "Log: $logPath" -ForegroundColor Cyan
