# File: tools/patch-base44-export-missing-fix.ps1
# Fix: Prevent PowerShell from interpolating JS template literals like `${t}` inside here-string
# by switching JS template to single-quoted here-string and injecting targets via placeholder.

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
  param([Parameter(Mandatory=$true)][string]$FilePath,[Parameter(Mandatory=$true)][string]$BackupDir,[Parameter(Mandatory=$true)][string]$RepoRoot,[Parameter(Mandatory=$true)][string]$LogPath)
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

$repoRoot = Get-RepoRoot -StartDir (Get-Location).Path
$toolsDir = Join-Path $repoRoot "tools"
$logsDir  = Join-Path $toolsDir "logs"
Ensure-Dir -Path $toolsDir
Ensure-Dir -Path $logsDir

$logPath = Join-Path $logsDir ("patch_base44_export_missing_fix_" + (Get-Date).ToString("yyyyMMdd_HHmmss") + ".log")
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

# 1) Replace JS targets injection section to use placeholder
# Expect: const TARGETS_RAW = [
#         $jsTargets
#       ];
# We'll convert to: const TARGETS_RAW = [ __TARGETS__ ];
$content2 = $content -replace '(?s)const TARGETS_RAW\s*=\s*\[\s*\r?\n\s*\$jsTargets\s*\r?\n\s*\]\s*;', 'const TARGETS_RAW = [__TARGETS__];'

# 2) Switch $js here-string from double-quoted to single-quoted: $js = @"  ... "@  -> $js = @' ... '@
# Replace start marker: $js = @"  -> $js = @'
$content2 = $content2 -replace '(\$js\s*=\s*)@"', '$1@'''

# Replace end marker: "^"@`n  Ensure-Dir ..." (closing of the big JS string) to "'@"
# We'll target the first occurrence of a line that is exactly "@ (with optional spaces) after the JS block.
# Safer: replace the first occurrence of a line: ^"\@\s*$  to '@'
# but only AFTER we switched start marker.
$lines = $content2 -split "`r?`n"
$foundStart = $false
$fixedEnd = $false

for ($i=0; $i -lt $lines.Count; $i++) {
  if (-not $foundStart -and $lines[$i] -match '^\s*\$js\s*=\s*@''\s*$') {
    $foundStart = $true
    continue
  }
  if ($foundStart -and -not $fixedEnd -and $lines[$i] -match '^\s*"\@\s*$') {
    $lines[$i] = "'@"
    $fixedEnd = $true
    break
  }
}

if (-not $foundStart) {
  Write-LogLine -LogPath $logPath -Level "FAIL" -Message "Could not find JS here-string start marker to patch."
  exit 3
}
if (-not $fixedEnd) {
  Write-LogLine -LogPath $logPath -Level "FAIL" -Message "Could not find JS here-string terminator to patch."
  exit 4
}

$content2 = ($lines -join "`r`n")

# 3) After JS string creation, ensure we inject targets with Replace
# Add:
#   $js = $js.Replace("__TARGETS__", "`n$jsTargets`n")
# right before writing file
if ($content2 -notmatch '\$js\s*=\s*\$js\.Replace\("__TARGETS__"') {
  $inject = @'
  $js = $js.Replace("__TARGETS__", "`n" + $jsTargets + "`n")
'@

  # Insert before: Ensure-Dir -Path (Split-Path -Path $OutJsPath -Parent)
  $content2 = $content2 -replace '(?m)^\s*Ensure-Dir\s+-Path\s+\(Split-Path\s+-Path\s+\$OutJsPath\s+-Parent\)\s*$', ($inject + "`r`n  Ensure-Dir -Path (Split-Path -Path $OutJsPath -Parent)")
}

# 4) Validate we no longer risk $t interpolation in PowerShell side
if ($content2 -match '\$\{t\}') {
  # This string is inside single-quoted JS now, it's OK. We just warn.
  Write-LogLine -LogPath $logPath -Level "INFO" -Message "JS template literal `${t}` is present (expected) and now safe (single-quoted here-string)."
}

# Write back (UTF-8 no BOM)
[System.IO.File]::WriteAllText($target, $content2, (New-Utf8NoBomEncoding))

Write-LogLine -LogPath $logPath -Level "PASS" -Message "Patched tools/base44-export-missing.ps1 successfully."
Write-LogLine -LogPath $logPath -Level "PASS" -Message "EXIT CODE: 0"
exit 0
