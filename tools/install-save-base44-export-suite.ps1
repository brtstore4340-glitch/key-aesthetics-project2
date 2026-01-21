@'
# =========================
# Repair/Install Base44 Export Suite (PS5-safe)
# - tools\base44-export-to-clipboard.ps1
# - tools\save-base44-export.ps1
# Always Backup + Logs
# =========================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

trap {
  try { Write-Host "[FAIL] $($_.Exception.Message)" -ForegroundColor Red } catch {}
  exit 1
}

function New-Utf8NoBomEncoding { New-Object System.Text.UTF8Encoding($false) }

function Ensure-Dir {
  param([Parameter(Mandatory=$true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Write-TextUtf8NoBom {
  param([Parameter(Mandatory=$true)][string]$Path,[Parameter(Mandatory=$true)][string]$Text)
  $enc = New-Utf8NoBomEncoding
  [System.IO.File]::WriteAllText($Path, $Text, $enc)
}

function Backup-IfExists {
  param([Parameter(Mandatory=$true)][string]$Path,[Parameter(Mandatory=$true)][string]$BackupDir)
  if (Test-Path -LiteralPath $Path) {
    $leaf = Split-Path -Leaf $Path
    $ts = Get-Date -Format "yyyyMMdd_HHmmss"
    $bak = Join-Path $BackupDir ("{0}.bak_{1}" -f $leaf, $ts)
    Copy-Item -LiteralPath $Path -Destination $bak -Force
    return $bak
  }
  return $null
}

# --- dirs ---
$root    = (Get-Location).Path
$tools   = Join-Path $root "tools"
$logsDir = Join-Path $tools "logs"
Ensure-Dir $tools
Ensure-Dir $logsDir

$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$logPath = Join-Path $logsDir ("base44_suite_repair_{0}.log" -f $ts)

function Log {
  param([string]$Msg,[ValidateSet("INFO","WARN","PASS","FAIL")][string]$Level="INFO")
  $t = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  $line = "[$t][$Level] $Msg"
  Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8
  $c = @{INFO="Cyan";WARN="Yellow";PASS="Green";FAIL="Red"}[$Level]
  Write-Host $line -ForegroundColor $c
}

# --- backup dir ---
$backupDir = Join-Path $tools ("backup_{0}" -f $ts)
Ensure-Dir $backupDir
Set-Content -LiteralPath (Join-Path $tools "LAST_BACKUP_DIR.txt") -Value $backupDir -Encoding UTF8

Log ("RepoRoot: {0}" -f $root) "INFO"
Log ("BackupDir: {0}" -f $backupDir) "INFO"

# =========================
# 1) base44-export-to-clipboard.ps1
# =========================
$exportPs1 = Join-Path $tools "base44-export-to-clipboard.ps1"
$bak1 = Backup-IfExists -Path $exportPs1 -BackupDir $backupDir
if ($bak1) { Log ("Backup old base44-export-to-clipboard.ps1 -> {0}" -f $bak1) "INFO" }

$exportContent = @'
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

trap {
  try { Write-Host "[FAIL] $($_.Exception.Message)" -ForegroundColor Red } catch {}
  exit 1
}

function New-Utf8NoBomEncoding { New-Object System.Text.UTF8Encoding($false) }
function Ensure-Dir { param([string]$Path) if (-not (Test-Path -LiteralPath $Path)) { New-Item -ItemType Directory -Path $Path -Force | Out-Null } }
function Write-TextUtf8NoBom { param([string]$Path,[string]$Text) $enc=New-Utf8NoBomEncoding; [System.IO.File]::WriteAllText($Path,$Text,$enc) }

$root    = (Get-Location).Path
$tools   = Join-Path $root "tools"
$logsDir = Join-Path $tools "logs"
Ensure-Dir $tools
Ensure-Dir $logsDir

$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$logPath = Join-Path $logsDir ("base44_export_js_{0}.log" -f $ts)
$jsFile  = Join-Path $tools  "PASTE_THIS_IN_CHROME_CONSOLE__BASE44_EXPORT.js"

function Log { param([string]$Msg,[ValidateSet("INFO","WARN","PASS","FAIL")][string]$Level="INFO")
  $t=(Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  $line="[$t][$Level] $Msg"
  Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8
  $c=@{INFO="Cyan";WARN="Yellow";PASS="Green";FAIL="Red"}[$Level]
  Write-Host $line -ForegroundColor $c
}

$js = @'
(() => {
  const log = (...a) => console.log("[base44-export]", ...a);

  const getBreadcrumbSegments = () => {
    // try to detect breadcrumb "Pages / X" or "Components / UI / X"
    const headers = Array.from(document.querySelectorAll("div"))
      .filter(d => {
        const t = (d.textContent || "").trim();
        return t.includes("Pages") || t.includes("Components");
      });

    const pick = headers.sort((a,b)=> (b.textContent||"").length - (a.textContent||"").length)[0];
    if (!pick) return [];

    const spans = Array.from(pick.querySelectorAll("span"))
      .map(s => (s.textContent || "").trim())
      .filter(Boolean)
      .filter(t => t !== "/");

    const out = [];
    for (const s of spans) {
      if (!out.length || out[out.length-1] !== s) out.push(s);
    }
    return out;
  };

  const buildRelPath = (segs) => {
    if (!segs || !segs.length) return null;
    const root = (segs[0] || "").toLowerCase();
    const rest = segs.slice(1).filter(Boolean);
    if (!rest.length) return null;

    if (root.includes("page")) return "page\\" + rest.join("\\");
    if (root.includes("component")) return "components\\" + rest.join("\\");
    return rest.join("\\");
  };

  const getMonacoText = () => {
    const models = window.monaco?.editor?.getModels?.();
    if (!models || !models.length) return "";
    let best = models[0];
    for (const m of models) {
      const v = m.getValue?.() || "";
      if (v.length > (best.getValue?.() || "").length) best = m;
    }
    return best.getValue?.() || "";
  };

  const guessNameFromCode = (code) => {
    const m1 = /export\s+default\s+function\s+([A-Za-z0-9_]+)\s*\(/i.exec(code);
    if (m1 && m1[1]) return m1[1];
    const m2 = /function\s+([A-Za-z0-9_]+)\s*\(/i.exec(code);
    if (m2 && m2[1]) return m2[1];
    return null;
  };

  const main = async () => {
    const segs = getBreadcrumbSegments();
    let rel = buildRelPath(segs);

    const code = getMonacoText();
    if (!code.trim()) {
      log("❌ No code found in Monaco models.");
      return;
    }

    if (!rel) {
      const guess = guessNameFromCode(code);
      rel = guess ? `page\\${guess}` : "unknown\\file";
      log("⚠️ Breadcrumb not found. Using fallback:", rel);
    }

    const payload = `FILE: ${rel}\n${code}\n`;
    await navigator.clipboard.writeText(payload);

    log("✅ Copied 1 files to clipboard");
    log("Export preview (first 5):", payload.split("\n").slice(0, 5));
    log("Next step: run PowerShell .\\tools\\save-base44-export.ps1 to write file.");
  };

  main().catch(e => console.error("[base44-export] fatal:", e));
})();
'@

Write-TextUtf8NoBom -Path $jsFile -Text $js

try {
  Set-Clipboard -Value $js
  Log "Copied JS snippet to clipboard (paste in Chrome Console now)" "PASS"
} catch {
  Log ("Set-Clipboard failed. Use file: {0}" -f $jsFile) "WARN"
}

Log ("Saved JS file: {0}" -f $jsFile) "INFO"
Write-Host ""
Write-Host "[PASS] Step 1 OK -> Open Chrome DevTools Console -> Ctrl+V -> Enter" -ForegroundColor Green
Write-Host ("JS File: {0}" -f $jsFile) -ForegroundColor Cyan
Write-Host ("Log: {0}" -f $logPath) -ForegroundColor Cyan
'@

Write-TextUtf8NoBom -Path $exportPs1 -Text $exportContent
Log ("Installed -> {0}" -f $exportPs1) "PASS"

# =========================
# 2) save-base44-export.ps1  (NO ??)
# =========================
$savePs1 = Join-Path $tools "save-base44-export.ps1"
$bak2 = Backup-IfExists -Path $savePs1 -BackupDir $backupDir
if ($bak2) { Log ("Backup old save-base44-export.ps1 -> {0}" -f $bak2) "INFO" }

$saveContent = @'
param(
  [string]$OutRoot,
  [string]$DefaultExt
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

trap {
  try { Write-Host "[FAIL] $($_.Exception.Message)" -ForegroundColor Red } catch {}
  exit 1
}

function New-Utf8NoBomEncoding { New-Object System.Text.UTF8Encoding($false) }
function Ensure-Dir { param([string]$Path) if (-not (Test-Path -LiteralPath $Path)) { New-Item -ItemType Directory -Path $Path -Force | Out-Null } }

function Write-LogLine {
  param([string]$LogPath,[string]$Message,[ValidateSet("INFO","WARN","PASS","FAIL")][string]$Level)
  $ts=(Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  $line="[$ts][$Level] $Message"
  Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8
  $c=@{INFO="Cyan";WARN="Yellow";PASS="Green";FAIL="Red"}[$Level]
  Write-Host $line -ForegroundColor $c
}

function Write-FileUtf8NoBom {
  param([string]$Path,[string]$Content)
  $enc = New-Utf8NoBomEncoding
  [System.IO.File]::WriteAllText($Path,$Content,$enc)
}

function Normalize-RelPath {
  param([string]$Rel,[string]$DefaultExt)

  $p = ""
  if ($null -ne $Rel) { $p = [string]$Rel }
  $p = $p.Trim()

  $p = $p -replace '^FILE:\s*',''
  $p = $p.Trim()
  if (-not $p) { return $null }

  $p = $p -replace '/','\'
  $p = $p -replace '^[\\\/]+',''
  $p = $p -replace '\.\.(\\|/)', ''
  $p = $p -replace '[:\*\?"<>\|]', '_'

  if ($p -notmatch '\.[A-Za-z0-9]+$') { $p = $p + $DefaultExt }
  return $p
}

function Guess-NameFromCode {
  param([string]$Code)
  if (-not $Code) { return $null }

  $m = [regex]::Match($Code,'export\s+default\s+function\s+([A-Za-z0-9_]+)\s*\(','IgnoreCase')
  if ($m.Success) { return $m.Groups[1].Value }

  $m2 = [regex]::Match($Code,'function\s+([A-Za-z0-9_]+)\s*\(','IgnoreCase')
  if ($m2.Success) { return $m2.Groups[1].Value }

  return $null
}

function Parse-ClipboardExport {
  param([string]$Text)

  $lines = $Text -split "`r?`n"
  $items = New-Object System.Collections.Generic.List[object]

  $currentPath = $null
  $buf = New-Object System.Collections.Generic.List[string]

  function Flush {
    if ($null -ne $currentPath) {
      $items.Add([pscustomobject]@{ RelPath=$currentPath; Content=($buf -join "`r`n") }) | Out-Null
    }
    $buf.Clear()
  }

  foreach ($line in $lines) {
    if ($line -match '^\s*FILE:\s*(.+?)\s*$') {
      Flush
      $currentPath = ("{0}" -f $Matches[1]).Trim()
      continue
    }
    $buf.Add($line) | Out-Null
  }

  Flush
  return ,$items.ToArray()
}

# defaults
if (-not $OutRoot) { $OutRoot = (Join-Path (Get-Location).Path "client\src") }
if (-not $DefaultExt) { $DefaultExt = ".tsx" }

$root    = (Get-Location).Path
$tools   = Join-Path $root "tools"
$logsDir = Join-Path $tools "logs"
Ensure-Dir $tools
Ensure-Dir $logsDir

$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$logPath = Join-Path $logsDir ("base44_save_{0}.log" -f $ts)

Write-LogLine -LogPath $logPath -Message ("OutRoot: {0}" -f $OutRoot) -Level "INFO"
Write-LogLine -LogPath $logPath -Message ("DefaultExt: {0}" -f $DefaultExt) -Level "INFO"

Ensure-Dir $OutRoot

$backupDir = Join-Path $tools ("backup_{0}" -f $ts)
Ensure-Dir $backupDir
Set-Content -LiteralPath (Join-Path $tools "LAST_BACKUP_DIR.txt") -Value $backupDir -Encoding UTF8

$clip = Get-Clipboard -Raw
if (-not $clip -or -not $clip.Trim()) {
  Write-LogLine -LogPath $logPath -Message "Clipboard empty. Run Chrome export JS first." -Level "FAIL"
  throw "Clipboard empty"
}

$items = Parse-ClipboardExport -Text $clip
if ($null -eq $items) { $items = @() }
if ($items -isnot [System.Array]) { $items = @($items) }

Write-LogLine -LogPath $logPath -Message ("Parsed blocks: {0}" -f $items.Length) -Level "INFO"
if ($items.Length -eq 0) { throw "No FILE: blocks found" }

$written = 0
$skipped = 0

foreach ($it in $items) {
  $rawRel  = [string]$it.RelPath
  $content = [string]$it.Content

  if ($rawRel -match '^\d+$') {
    $guess = Guess-NameFromCode -Code $content
    if ($guess) {
      $rawRel = "page\$guess"
      Write-LogLine -LogPath $logPath -Message ("Guessed filename -> {0}" -f $rawRel) -Level "WARN"
    } else {
      $rawRel = "unknown\file_$rawRel"
      Write-LogLine -LogPath $logPath -Message ("FILE numeric, guess failed -> {0}" -f $rawRel) -Level "WARN"
    }
  }

  $rel = Normalize-RelPath -Rel $rawRel -DefaultExt $DefaultExt
  if (-not $rel) {
    Write-LogLine -LogPath $logPath -Message ("SKIP invalid FILE: {0}" -f $rawRel) -Level "WARN"
    $skipped++
    continue
  }

  if (-not $content.Trim()) {
    Write-LogLine -LogPath $logPath -Message ("SKIP empty content: {0}" -f $rel) -Level "WARN"
    $skipped++
    continue
  }

  $dest = Join-Path $OutRoot $rel
  Ensure-Dir (Split-Path -Parent $dest)

  if (Test-Path -LiteralPath $dest) {
    $bak = Join-Path $backupDir (Split-Path -Leaf $dest)
    Copy-Item -LiteralPath $dest -Destination $bak -Force
    Write-LogLine -LogPath $logPath -Message ("Backup existing -> {0}" -f $bak) -Level "INFO"
  }

  Write-FileUtf8NoBom -Path $dest -Content $content
  Write-LogLine -LogPath $logPath -Message ("Wrote: {0}" -f $dest) -Level "PASS"
  $written++
}

Write-LogLine -LogPath $logPath -Message ("DONE. Written={0}, Skipped={1}, BackupDir={2}" -f $written, $skipped, $backupDir) -Level "PASS"
Write-Host ("Log: {0}" -f $logPath) -ForegroundColor Cyan
'@

Write-TextUtf8NoBom -Path $savePs1 -Text $saveContent
Log ("Installed -> {0}" -f $savePs1) "PASS"

Log "DONE. Suite installed successfully." "PASS"
Write-Host ""
Write-Host "[PASS] Base44 export suite installed." -ForegroundColor Green
Write-Host ("- {0}" -f $exportPs1) -ForegroundColor Cyan
Write-Host ("- {0}" -f $savePs1) -ForegroundColor Cyan
Write-Host ("Log: {0}" -f $logPath) -ForegroundColor Cyan
'@ | Set-Content -LiteralPath ".\tools\repair-base44-export-suite.ps1" -Encoding UTF8

powershell -ExecutionPolicy Bypass -File .\tools\repair-base44-export-suite.ps1
