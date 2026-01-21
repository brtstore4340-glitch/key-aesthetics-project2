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

function Write-Utf8NoBomFile {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)][string]$Content
  )
  $enc = New-Utf8NoBomEncoding
  [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

function Backup-File {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [Parameter(Mandatory=$true)][string]$BackupDir
  )
  if (Test-Path -LiteralPath $FilePath) {
    Ensure-Dir -Path $BackupDir
    $stamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
    $name = [System.IO.Path]::GetFileName($FilePath)
    $bak  = Join-Path $BackupDir ("$name.bak_$stamp")
    Copy-Item -LiteralPath $FilePath -Destination $bak -Force
    return $bak
  }
  return $null
}

# ---------------------------
# INSTALLER START
# ---------------------------
$root = (Get-Location).Path
$tools = Join-Path $root "tools"
$logs  = Join-Path $tools "logs"
Ensure-Dir $tools
Ensure-Dir $logs

$stamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$backupDir = Join-Path $tools ("backup_install_{0}" -f $stamp)
Ensure-Dir $backupDir
Write-Utf8NoBomFile -Path (Join-Path $tools "LAST_BACKUP_DIR.txt") -Content $backupDir

$targetGet = Join-Path $tools "base44-get-innertext.ps1"
$targetSave = Join-Path $tools "save-base44-export.ps1"

$bak1 = Backup-File -FilePath $targetGet -BackupDir $backupDir
$bak2 = Backup-File -FilePath $targetSave -BackupDir $backupDir

if ($bak1) { Write-Host "[INFO] Backup -> $bak1" -ForegroundColor Cyan }
if ($bak2) { Write-Host "[INFO] Backup -> $bak2" -ForegroundColor Cyan }

# ---------------------------
# 1) base44-get-innertext.ps1
# ---------------------------
$getInnerText = @'
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

function Main {
  Ensure-Dir -Path "tools"
  Ensure-Dir -Path "tools\logs"

  $runStamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
  $logPath  = Join-Path "tools\logs" ("base44-get-innertext_{0}.log" -f $runStamp)

  Write-LogLine -LogPath $logPath -Level "INFO" -Message "Generate JS snippet for Base44 (Monaco -> Clipboard Export)"

  # JS: extract visible file path + monaco text + format "FILE: <path>\n\n<code>"
  $js = @'
// Base44 Monaco Extractor (Clipboard Export)
// 1) Copy FILE name (left tree + breadcrumb)
// 2) Copy Monaco editor text
// 3) Put to clipboard as:
//    FILE: Pages/AccountingDashboard
//
//    <full code...>
(() => {
  const pickText = (el) => (el && (el.innerText || el.textContent || '')).trim();

  // Try breadcrumb: "Pages / AccountingDashboard"
  const crumb = Array.from(document.querySelectorAll('span'))
    .map(s => pickText(s))
    .filter(Boolean)
    .join(' ');

  // Better: use visible breadcrumb area
  const header = document.querySelector('div[class*="flex items-center gap"]');
  let pageName = '';
  if (header) pageName = pickText(header);

  // Try: last breadcrumb token from "Pages / X"
  if (pageName.includes('/')) {
    const parts = pageName.split('/').map(x => x.trim()).filter(Boolean);
    pageName = parts[parts.length - 1] || pageName;
  } else {
    // fallback: find the selected file in left tree (aria-selected or highlighted)
    const selected = document.querySelector('[aria-selected="true"]') || document.querySelector('.bg-slate-100,.bg-gray-100');
    const t = pickText(selected);
    if (t && t.length < 120) pageName = t;
  }

  if (!pageName) pageName = 'UnknownFile';

  // Monaco model text
  const model = window.monaco?.editor?.getModels?.()?.[0];
  const code = model?.getValue?.() ?? '';

  const out =
`FILE: Pages/${pageName}

${code}`.trim();

  navigator.clipboard.writeText(out).then(() => {
    console.log('[PASS] Copied export to clipboard:', `Pages/${pageName}`);
  }).catch((e) => {
    console.error('[FAIL] Clipboard error:', e);
    console.log(out);
  });
})();
'@

  $jsPath = Join-Path "tools" "PASTE_THIS_IN_CHROME_CONSOLE.js"
  $enc = New-Utf8NoBomEncoding
  [System.IO.File]::WriteAllText($jsPath, $js, $enc)

  Set-Clipboard -Value $js
  Write-LogLine -LogPath $logPath -Level "PASS" -Message "Copied JS snippet to clipboard"
  Write-Host "Paste in Chrome DevTools Console (Ctrl+V then Enter)" -ForegroundColor Yellow
  Write-Host "Saved file: $((Resolve-Path -LiteralPath $jsPath).Path)" -ForegroundColor Cyan
  Write-Host "Log: $((Resolve-Path -LiteralPath $logPath).Path)" -ForegroundColor DarkGray
  exit 0
}

Main
'@

Write-Utf8NoBomFile -Path $targetGet -Content $getInnerText

# ---------------------------
# 2) save-base44-export.ps1
# ---------------------------
$saveExport = @'
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
    [Parameter(Mandatory=$true)][string]$LogPath
    [Parameter(Mandatory=$true)][string]$Message
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
    [Parameter(Mandatory=$true)][string]$FilePath
    [Parameter(Mandatory=$true)][string]$BackupDir
    [Parameter(Mandatory=$true)][string]$LogPath
  )
  if (Test-Path -LiteralPath $FilePath) {
    Ensure-Dir -Path $BackupDir
    $name = [System.IO.Path]::GetFileName($FilePath)
    $stamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
    $bak = Join-Path $BackupDir ("$name.bak_$stamp")
    Copy-Item -LiteralPath $FilePath -Destination $bak -Force
    Write-LogLine -LogPath $LogPath -Level "INFO" -Message "Backup created: $bak"
  } else {
    Write-LogLine -LogPath $LogPath -Level "INFO" -Message "No existing file to backup: $FilePath"
  }
}

function Normalize-RelPath {
  param([Parameter(Mandatory=$true)][string]$Rel)
  $p = $Rel.Trim()
  $p = $p.TrimStart('\','/')
  $p = $p -replace '/', '\'
  $segments = $p.Split('\') | Where-Object { $_ -and $_.Trim() -ne "" }
  $safe = foreach ($s in $segments) { ($s -replace '[<>:"|?*]', '_') }
  ($safe -join '\')
}

function Parse-ExportText {
  param([Parameter(Mandatory=$true)][string]$Text)

  $m = [regex]::Match($Text, '(?im)^\s*FILE\s*:\s*(.+?)\s*$')
  if (-not $m.Success) {
    throw "Cannot find 'FILE:' line. Example: FILE: Pages/AccountingDashboard"
  }

  $fileRel = $m.Groups[1].Value.Trim()

  # body starts after FILE line (next newline)
  $lines = $Text -split "`r?`n"
  $start = 0
  for ($i=0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^\s*FILE\s*:') { $start = $i + 1; break }
  }
  $body = ($lines[$start..($lines.Count-1)] -join "`r`n").TrimStart()

  [pscustomobject]@{ FileRel = $fileRel; Body = $body }
}

function Main {
  param(
    [string]$OutRoot = (Get-Location).Path
    [string]$DefaultExt = ".tsx"
    [string]$InputPath = ""
  )

  Ensure-Dir -Path "tools"
  Ensure-Dir -Path "tools\logs"

  $runStamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
  $logPath  = Join-Path "tools\logs" ("base44_save_{0}.log" -f $runStamp)

  Write-LogLine -LogPath $logPath -Level "INFO" -Message "Starting Base44 Export Saver"
  Write-LogLine -LogPath $logPath -Level "INFO" -Message "OutRoot = $OutRoot"
  Write-LogLine -LogPath $logPath -Level "INFO" -Message "DefaultExt = $DefaultExt"

  $raw = $null
  if ($InputPath -and (Test-Path -LiteralPath $InputPath)) {
    Write-LogLine -LogPath $logPath -Level "INFO" -Message "Reading from InputPath: $InputPath"
    $raw = Get-Content -LiteralPath $InputPath -Raw -ErrorAction Stop
  } else {
    Write-LogLine -LogPath $logPath -Level "INFO" -Message "Reading from Clipboard"
    $raw = Get-Clipboard -Raw
  }

  if (-not $raw -or $raw.Trim().Length -lt 10) {
    throw "Input is empty/too short. Copy export text first."
  }

  $parsed = Parse-ExportText -Text $raw
  $rel = Normalize-RelPath -Rel $parsed.FileRel

  $ext = [System.IO.Path]::GetExtension($rel)
  if ([string]::IsNullOrWhiteSpace($ext)) { $rel = $rel + $DefaultExt }

  $outRootFull = (Resolve-Path -LiteralPath $OutRoot).Path
  $outFile = Join-Path $outRootFull $rel
  $outDir  = Split-Path -Parent $outFile

  Write-LogLine -LogPath $logPath -Level "INFO" -Message "Target file: $outFile"
  Ensure-Dir -Path $outDir

  $backupDir = Join-Path $outRootFull ("tools\backup_{0}" -f $runStamp)
  Backup-IfExists -FilePath $outFile -BackupDir $backupDir -LogPath $logPath

  $lastBackupTxt = Join-Path $outRootFull "tools\LAST_BACKUP_DIR.txt"
  $enc = New-Utf8NoBomEncoding
  [System.IO.File]::WriteAllText($lastBackupTxt, $backupDir, $enc)
  Write-LogLine -LogPath $logPath -Level "INFO" -Message "Updated tools/LAST_BACKUP_DIR.txt -> $backupDir"

  [System.IO.File]::WriteAllText($outFile, $parsed.Body, $enc)
  Write-LogLine -LogPath $logPath -Level "PASS" -Message "Saved OK: $outFile"
  Write-LogLine -LogPath $logPath -Level "INFO" -Message "Done."
  exit 0
}

param(
  [string]$OutRoot = (Get-Location).Path
  [string]$DefaultExt = ".tsx"
  [string]$InputPath = ""
)

Main -OutRoot $OutRoot -DefaultExt $DefaultExt -InputPath $InputPath
'@

Write-Utf8NoBomFile -Path $targetSave -Content $saveExport

Write-Host "[PASS] Installed scripts (fixed comma-param + removed $0)" -ForegroundColor Green
Write-Host "  - $targetGet" -ForegroundColor Cyan
Write-Host "  - $targetSave" -ForegroundColor Cyan
Write-Host "[INFO] Backup dir: $backupDir" -ForegroundColor DarkGray
exit 0
