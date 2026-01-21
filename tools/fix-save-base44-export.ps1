# =========================
# FIX: save-base44-export.ps1 (No nested here-string)
# SafeMode + Backup + Logs + UTF-8 no BOM
# =========================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

trap {
  try { Write-Host "[FAIL] $($_.Exception.Message)" -ForegroundColor Red } catch {}
  exit 1
}

function New-Utf8NoBomEncoding {
  return [System.Text.UTF8Encoding]::new($false)
}

function Ensure-Dir {
  param([Parameter(Mandatory=$true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Write-TextUtf8NoBom {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)][string]$Content
  )
  Ensure-Dir -Path (Split-Path -Parent $Path)
  [System.IO.File]::WriteAllText($Path, $Content, (New-Utf8NoBomEncoding))
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

function Find-RepoRoot {
  param([string]$StartDir)
  $dir = $StartDir
  while ($true) {
    $pkg = Join-Path $dir "package.json"
    if (Test-Path -LiteralPath $pkg) { return $dir }
    $parent = Split-Path -Parent $dir
    if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $dir) { break }
    $dir = $parent
  }
  return $StartDir
}

# -------------------------
# Build save-base44-export.ps1 content (no here-string inside)
# -------------------------
$saveLines = @(
  '# ========================='
  '# Base44 Export Saver (Clipboard -> Files)'
  '# Supports:'
  '#   1) TEXT blocks:'
  '#      FILE: page\AccountDashboard'
  '#      <code...>'
  '#   2) JSON: { "files": [ { "path": "...", "content": "..." } ] }'
  '# SafeMode + Backup + Logs + UTF-8 no BOM'
  '# ========================='
  ''
  'Set-StrictMode -Version Latest'
  '$ErrorActionPreference = "Stop"'
  ''
  'trap {'
  '  try { Write-Host "[FAIL] $($_.Exception.Message)" -ForegroundColor Red } catch {}'
  '  exit 1'
  '}'
  ''
  'function New-Utf8NoBomEncoding {'
  '  return [System.Text.UTF8Encoding]::new($false)'
  '}'
  ''
  'function Ensure-Dir {'
  '  param([Parameter(Mandatory=$true)][string]$Path)'
  '  if (-not (Test-Path -LiteralPath $Path)) {'
  '    New-Item -ItemType Directory -Path $Path -Force | Out-Null'
  '  }'
  '}'
  ''
  'function Write-TextUtf8NoBom {'
  '  param('
  '    [Parameter(Mandatory=$true)][string]$Path,'
  '    [Parameter(Mandatory=$true)][string]$Content'
  '  )'
  '  Ensure-Dir -Path (Split-Path -Parent $Path)'
  '  [System.IO.File]::WriteAllText($Path, $Content, (New-Utf8NoBomEncoding))'
  '}'
  ''
  'function Write-LogLine {'
  '  param('
  '    [Parameter(Mandatory=$true)][string]$LogPath,'
  '    [Parameter(Mandatory=$true)][string]$Message,'
  '    [ValidateSet("INFO","WARN","PASS","FAIL")][string]$Level = "INFO"'
  '  )'
  '  $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")'
  '  $line = "[$ts][$Level] $Message"'
  '  Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8'
  '  $color = @{ INFO="Cyan"; WARN="Yellow"; PASS="Green"; FAIL="Red" }[$Level]'
  '  Write-Host $line -ForegroundColor $color'
  '}'
  ''
  'function Normalize-RelPath {'
  '  param('
  '    [Parameter(Mandatory=$true)][string]$Raw,'
  '    [Parameter(Mandatory=$true)][string]$DefaultExt'
  '  )'
  '  $p = $Raw.Trim()'
  '  $p = $p.Trim("`"").Trim("' + "'" + '")'
  '  $p = $p.TrimStart("\").TrimStart("/")'
  '  $p = $p -replace "/", "\"'
  '  $leaf = Split-Path -Leaf $p'
  '  if ($leaf -notmatch "\.[a-zA-Z0-9]+$") {'
  '    $p = "$p$DefaultExt"'
  '  }'
  '  return $p'
  '}'
  ''
  'function Parse-ExportTextToFiles {'
  '  param([Parameter(Mandatory=$true)][string]$Text)'
  ''
  '  $items = New-Object System.Collections.Generic.List[object]'
  '  $t = $Text.Trim()'
  '  if ([string]::IsNullOrWhiteSpace($t)) { return $items }'
  ''
  '  # Try JSON'
  '  if ($t.StartsWith("{") -or $t.StartsWith("[")) {'
  '    try {'
  '      $obj = $t | ConvertFrom-Json -ErrorAction Stop'
  '      if ($null -ne $obj.files) {'
  '        foreach ($f in $obj.files) {'
  '          if ($null -ne $f.path -and $null -ne $f.content) {'
  '            $items.Add([pscustomobject]@{ path = [string]$f.path; content = [string]$f.content })'
  '          }'
  '        }'
  '        return $items'
  '      }'
  '      if ($obj -is [System.Collections.IEnumerable]) {'
  '        foreach ($f in $obj) {'
  '          if ($null -ne $f.path -and $null -ne $f.content) {'
  '            $items.Add([pscustomobject]@{ path = [string]$f.path; content = [string]$f.content })'
  '          }'
  '        }'
  '        if ($items.Count -gt 0) { return $items }'
  '      }'
  '    } catch {'
  '      # fallthrough'
  '    }'
  '  }'
  ''
  '  # TEXT blocks'
  '  $pattern = "(?ms)^\s*(?:FILE|Path)\s*:\s*(?<path>.+?)\s*$"'
  '  $m = [regex]::Matches($Text, $pattern)'
  '  if ($m.Count -eq 0) { return $items }'
  ''
  '  for ($i=0; $i -lt $m.Count; $i++) {'
  '    $start = $m[$i].Index + $m[$i].Length'
  '    $end = if ($i -lt ($m.Count-1)) { $m[$i+1].Index } else { $Text.Length }'
  '    $path = $m[$i].Groups["path"].Value.Trim()'
  '    $content = $Text.Substring($start, $end - $start).Trim("`r","`n")'
  '    $items.Add([pscustomobject]@{ path = $path; content = $content })'
  '  }'
  '  return $items'
  '}'
  ''
  '[CmdletBinding()]'
  'param('
  '  [string]$OutRoot = (Get-Location).Path,'
  '  [string]$DefaultExt = ".tsx"'
  ')'
  ''
  '$repoRoot = (Get-Location).Path'
  '$toolsDir = Join-Path $repoRoot "tools"'
  '$logsDir  = Join-Path $toolsDir "logs"'
  'Ensure-Dir -Path $toolsDir'
  'Ensure-Dir -Path $logsDir'
  ''
  '$stamp = (Get-Date).ToString("yyyyMMdd_HHmmss")'
  '$logPath = Join-Path $logsDir "base44_save_$stamp.log"'
  ''
  'Write-LogLine -LogPath $logPath -Level "INFO" -Message "OutRoot: $OutRoot"'
  'Write-LogLine -LogPath $logPath -Level "INFO" -Message "DefaultExt: $DefaultExt"'
  ''
  'if (-not (Test-Path -LiteralPath $OutRoot)) { throw "OutRoot not found: $OutRoot" }'
  ''
  '$clip = ""'
  'try { $clip = Get-Clipboard -Raw -TextFormatType Text } catch { $clip = "" }'
  'if ([string]::IsNullOrWhiteSpace($clip)) {'
  '  Write-LogLine -LogPath $logPath -Level "FAIL" -Message "Clipboard is empty"'
  '  exit 3'
  '}'
  ''
  '$files = Parse-ExportTextToFiles -Text $clip'
  'if ($files.Count -eq 0) {'
  '  Write-LogLine -LogPath $logPath -Level "FAIL" -Message "No files parsed from clipboard (format not recognized)"'
  '  exit 2'
  '}'
  ''
  '$backupRoot = Join-Path $toolsDir ("backup_base44save_" + $stamp)'
  'Ensure-Dir -Path $backupRoot'
  '[System.IO.File]::WriteAllText((Join-Path $toolsDir "LAST_BACKUP_DIR.txt"), $backupRoot, (New-Utf8NoBomEncoding))'
  ''
  '$saved = 0'
  '$skipped = 0'
  ''
  'foreach ($f in $files) {'
  '  $rawPath = [string]$f.path'
  '  $content = [string]$f.content'
  '  if ([string]::IsNullOrWhiteSpace($rawPath)) { $skipped++; continue }'
  ''
  '  $rel = Normalize-RelPath -Raw $rawPath -DefaultExt $DefaultExt'
  '  $dest = Join-Path $OutRoot $rel'
  ''
  '  if (Test-Path -LiteralPath $dest) {'
  '    $relBackup = $rel.TrimStart("\")'
  '    $bak = Join-Path $backupRoot $relBackup'
  '    Ensure-Dir -Path (Split-Path -Parent $bak)'
  '    Copy-Item -LiteralPath $dest -Destination $bak -Force'
  '    Write-LogLine -LogPath $logPath -Level "INFO" -Message "Backup: $dest -> $bak"'
  '  }'
  ''
  '  Write-TextUtf8NoBom -Path $dest -Content $content'
  '  Write-LogLine -LogPath $logPath -Level "PASS" -Message "Saved: $dest"'
  '  $saved++'
  '}'
  ''
  'Write-LogLine -LogPath $logPath -Level "INFO" -Message "Summary: saved=$saved skipped=$skipped total=$($files.Count)"'
  'Write-LogLine -LogPath $logPath -Level "PASS" -Message "DONE"'
  'exit 0'
)

$saveContent = ($saveLines -join "`r`n")

# -------------------------
# Write fixed script to tools\save-base44-export.ps1
# -------------------------
$cwd = (Get-Location).Path
$repoRoot = Find-RepoRoot -StartDir $cwd

$toolsDir = Join-Path $repoRoot "tools"
$logsDir  = Join-Path $toolsDir "logs"
Ensure-Dir -Path $toolsDir
Ensure-Dir -Path $logsDir

$stamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$logPath = Join-Path $logsDir "fix_save_base44_export_$stamp.log"

$backupRoot = Join-Path $toolsDir ("backup_fix_" + $stamp)
Ensure-Dir -Path $backupRoot
[System.IO.File]::WriteAllText((Join-Path $toolsDir "LAST_BACKUP_DIR.txt"), $backupRoot, (New-Utf8NoBomEncoding))

$target = Join-Path $toolsDir "save-base44-export.ps1"

if (Test-Path -LiteralPath $target) {
  $bak = Join-Path $backupRoot "tools\save-base44-export.ps1"
  Ensure-Dir -Path (Split-Path -Parent $bak)
  Copy-Item -LiteralPath $target -Destination $bak -Force
  Write-LogLine -LogPath $logPath -Level "INFO" -Message "Backup old -> $bak"
}

Write-TextUtf8NoBom -Path $target -Content $saveContent
Write-LogLine -LogPath $logPath -Level "PASS" -Message "Installed fixed -> $target"
Write-LogLine -LogPath $logPath -Level "INFO" -Message "Run: powershell -ExecutionPolicy Bypass -File .\tools\save-base44-export.ps1 -OutRoot `".\client\src`" -DefaultExt `".tsx`""
Write-Host "[PASS] Fixed save-base44-export.ps1 ready" -ForegroundColor Green
exit 0
