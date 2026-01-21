# File: tools/rebuild-base44-export-missing.ps1
# Purpose: Rebuild tools/base44-export-missing.ps1 to eliminate StrictMode crash from JS `${t}` interpolation
# Safe: backup + logs + UTF8 no BOM + LAST_BACKUP_DIR.txt

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

function Backup-FileIfExists {
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

$logPath = Join-Path $logsDir ("rebuild_base44_export_missing_" + (Get-Date).ToString("yyyyMMdd_HHmmss") + ".log")
Write-LogLine -LogPath $logPath -Level "INFO" -Message ("RepoRoot: " + $repoRoot)

$backupDir = Join-Path $toolsDir ("backup_rebuild_" + (Get-Date).ToString("yyyyMMdd_HHmmss"))
Ensure-Dir -Path $backupDir
[System.IO.File]::WriteAllText((Join-Path $toolsDir "LAST_BACKUP_DIR.txt"), $backupDir, (New-Utf8NoBomEncoding))
Write-LogLine -LogPath $logPath -Level "INFO" -Message ("BackupDir: " + $backupDir)

$outFile = Join-Path $toolsDir "base44-export-missing.ps1"
Backup-FileIfExists -FilePath $outFile -BackupDir $backupDir -RepoRoot $repoRoot -LogPath $logPath

# --- Rebuilt script content (SAFE: everything in @' '@ so NO PowerShell interpolation) ---
$rebuilt = @'
# File: tools/base44-export-missing.ps1
# Purpose:
# 1) Generate JS for Chrome Console to export ONLY files that are missing locally (client\src)
# 2) Save from Clipboard -> write into .\client\src\... with backup, utf8-no-bom, logs, LAST_BACKUP_DIR.txt
#
# Critical fix:
# - JS is stored in SINGLE-QUOTED here-string @' ... '@ to prevent StrictMode failures from `${t}`

param(
  [ValidateSet("GenerateJSMissing","SaveClipboard","All")]
  [string]$Action = "All"
)

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

function New-BackupDir {
  param([Parameter(Mandatory=$true)][string]$ToolsDir,[Parameter(Mandatory=$true)][string]$LogPath)
  $stamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
  $backupDir = Join-Path $ToolsDir ("backup_missing_" + $stamp)
  Ensure-Dir -Path $backupDir
  $last = Join-Path $ToolsDir "LAST_BACKUP_DIR.txt"
  [System.IO.File]::WriteAllText($last, $backupDir, (New-Utf8NoBomEncoding))
  Write-LogLine -LogPath $LogPath -Level "INFO" -Message ("BackupDir: " + $backupDir)
  return $backupDir
}

function Backup-FileIfExists {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [Parameter(Mandatory=$true)][string]$RepoRoot,
    [Parameter(Mandatory=$true)][string]$BackupDir,
    [Parameter(Mandatory=$true)][string]$LogPath
  )
  if (Test-Path -LiteralPath $FilePath) {
    $relative = $FilePath
    if ($relative.ToLower().StartsWith($RepoRoot.ToLower())) {
      $relative = $relative.Substring($RepoRoot.Length).TrimStart("\","/")
    } else {
      $relative = Split-Path -Path $FilePath -Leaf
    }
    $dest = Join-Path $BackupDir $relative
    Ensure-Dir -Path (Split-Path -Path $dest -Parent)
    Copy-Item -LiteralPath $FilePath -Destination $dest -Force
    Write-LogLine -LogPath $LogPath -Level "INFO" -Message ("Backup: " + $relative)
  }
}

function Write-FileUtf8NoBom {
  param([Parameter(Mandatory=$true)][string]$FilePath,[Parameter(Mandatory=$true)][string]$Content)
  [System.IO.File]::WriteAllText($FilePath, $Content, ([System.Text.UTF8Encoding]::new($false)))
}

function Normalize-RelPathToClientSrc {
  param([Parameter(Mandatory=$true)][string]$RawPath)

  $p = ($RawPath + "").Trim()
  $p = $p -replace "`r",""
  $p = $p -replace "^\s*FILE:\s*",""
  $p = $p.Trim()
  $p = $p -replace "\\","/"
  $p = $p.TrimStart("/")

  $lower = $p.ToLower()
  if ($lower.StartsWith("client/src/")) { $p = $p.Substring(11) }
  elseif ($lower.StartsWith("src/")) { $p = $p.Substring(4) }

  $leaf = [System.IO.Path]::GetFileName($p)
  if (-not ($leaf -match "\.[A-Za-z0-9]+$")) { $p = $p + ".tsx" }

  $p = $p -replace "/","\"
  return $p
}

function Test-RelPathSafe {
  param([Parameter(Mandatory=$true)][string]$RelWinPath)

  if ([string]::IsNullOrWhiteSpace($RelWinPath)) { return $false }
  $low = $RelWinPath.ToLower()

  if ($RelWinPath.Contains("<") -or $RelWinPath.Contains(">")) { return $false }
  if ($low.Contains("http://") -or $low.Contains("https://")) { return $false }
  if ($low.Contains("iframe") -or $low.Contains("script")) { return $false }
  if ($RelWinPath -match '[<>:"|?*]') { return $false }
  if ($RelWinPath.Contains("..")) { return $false }

  if ($RelWinPath -notmatch '^(Pages|Components|Entities)\\') { return $false }
  return $true
}

function Parse-ClipboardFileBlocks {
  param([Parameter(Mandatory=$true)][string]$Text)
  $pattern = '(?ms)^\s*FILE:\s*(?<path>.+?)\s*\r?\n(?<code>.*?)(?=^\s*FILE:\s*|\z)'
  $m = [regex]::Matches($Text, $pattern)

  $items = New-Object System.Collections.Generic.List[object]
  foreach ($x in $m) {
    $path = $x.Groups["path"].Value.Trim()
    $code = $x.Groups["code"].Value
    $code = $code -replace "(\r?\n)+\z","`r`n"
    if ([string]::IsNullOrWhiteSpace($path)) { continue }
    $items.Add([pscustomobject]@{ Path = $path; Code = $code })
  }
  return ,$items
}

function Save-BlocksToClientSrc {
  param(
    [Parameter(Mandatory=$true)][System.Collections.IEnumerable]$Items,
    [Parameter(Mandatory=$true)][string]$RepoRoot,
    [Parameter(Mandatory=$true)][string]$BackupDir,
    [Parameter(Mandatory=$true)][string]$LogPath
  )

  $clientSrc = Join-Path $RepoRoot "client\src"
  if (-not (Test-Path -LiteralPath $clientSrc)) { throw "client\src not found: $clientSrc" }

  $written = 0
  $skipped = 0

  foreach ($it in $Items) {
    $rel = Normalize-RelPathToClientSrc -RawPath $it.Path
    if (-not (Test-RelPathSafe -RelWinPath $rel)) {
      $skipped++
      $preview = ($it.Path + "").Trim()
      if ($preview.Length -gt 120) { $preview = $preview.Substring(0,120) + "..." }
      Write-LogLine -LogPath $LogPath -Level "WARN" -Message ("Skip invalid FILE path: " + $preview)
      continue
    }

    $dest = Join-Path $clientSrc $rel
    Ensure-Dir -Path (Split-Path -Path $dest -Parent)

    Backup-FileIfExists -FilePath $dest -RepoRoot $RepoRoot -BackupDir $BackupDir -LogPath $LogPath
    [System.IO.File]::WriteAllText($dest, $it.Code, ([System.Text.UTF8Encoding]::new($false)))
    Write-LogLine -LogPath $LogPath -Level "PASS" -Message ("Wrote: client\src\" + $rel)
    $written++
  }

  Write-LogLine -LogPath $LogPath -Level "INFO" -Message ("Skipped invalid blocks: " + $skipped)
  if ($written -le 0) {
    Write-LogLine -LogPath $LogPath -Level "FAIL" -Message "No files written (all FILE paths invalid)."
    exit 6
  }

  Write-LogLine -LogPath $LogPath -Level "PASS" -Message ("DONE. Files written: " + $written)
}

function Save-FromClipboard {
  param(
    [Parameter(Mandatory=$true)][string]$RepoRoot,
    [Parameter(Mandatory=$true)][string]$BackupDir,
    [Parameter(Mandatory=$true)][string]$LogPath
  )

  $clip = Get-Clipboard -Raw
  if ([string]::IsNullOrWhiteSpace($clip)) {
    Write-LogLine -LogPath $LogPath -Level "FAIL" -Message "Clipboard is empty."
    exit 2
  }

  if ($clip -notmatch "(?m)^\s*FILE:\s*") {
    Write-LogLine -LogPath $LogPath -Level "FAIL" -Message "Clipboard has no 'FILE:' blocks."
    $headLen = [Math]::Min(250, $clip.Length)
    Write-LogLine -LogPath $LogPath -Level "INFO" -Message ("Clipboard head(250): " + ($clip.Substring(0, $headLen) -replace "`r",""))
    exit 3
  }

  $items = Parse-ClipboardFileBlocks -Text $clip
  if (-not $items -or $items.Count -eq 0) {
    Write-LogLine -LogPath $LogPath -Level "FAIL" -Message "ParseClipboard returned 0 items."
    exit 4
  }

  Write-LogLine -LogPath $LogPath -Level "INFO" -Message ("Found FILE blocks: " + $items.Count)
  Save-BlocksToClientSrc -Items $items -RepoRoot $RepoRoot -BackupDir $BackupDir -LogPath $LogPath
}

# -------------------------
# RAW TARGET LIST (full list)
# -------------------------
$RAW_TARGETS = @(
"\Pages\AccountingDashboard",
"\Pages\AccountingOrders",
"\Pages\AdminCategories",
"\Pages\AdminDashboard",
"\Pages\AdminOrders",
"\Pages\AdminProducts",
"\Pages\AdminUsers",
"\Pages\CreateOrder",
"\Pages\StaffDashboard",
"\Pages\StaffOrders",
"\Pages\StaffSelection",
"\Components\UserNotRegisteredError",
"\Components\ui\avatar",
"\Components\ui\aspect-ratio",
"\Components\ui\alert",
"\Components\ui\dropdown-menu",
"\Components\ui\sonner",
"\Components\ui\toast",
"\Components\ui\command",
"\Components\ui\pagination",
"\Components\ui\textarea",
"\Components\ui\radio-group",
"\Components\ui\switch",
"\Components\ui\menubar",
"\Components\ui\card",
"\Components\ui\label",
"\Components\ui\input",
"\Components\ui\badge",
"\Components\ui\resizable",
"\Components\ui\tooltip",
"\Components\ui\checkbox",
"\Components\ui\table",
"\Components\ui\dialog",
"\Components\ui\progress",
"\Components\ui\input-otp",
"\Components\ui\popover",
"\Components\ui\hover-card",
"\Components\ui\breadcrumb",
"\Components\ui\calendar",
"\Components\ui\toggle-group",
"\Components\ui\use-toast",
"\Components\ui\slider",
"\Components\ui\sidebar",
"\Components\ui\chart",
"\Components\ui\carousel",
"\Components\ui\tabs",
"\Components\ui\sheet",
"\Components\ui\scroll-area",
"\Components\ui\drawer",
"\Components\ui\button",
"\Components\ui\collapsible",
"\Components\ui\toaster",
"\Components\ui\navigation-menu",
"\Components\ui\alert-dialog",
"\Components\ui\select",
"\Components\ui\separator",
"\Components\ui\context-menu",
"\Components\ui\skeleton",
"\Components\ui\form",
"\Components\ui\toggle",
"\Components\ui\accordion",
"\Components\ui\FloatingParticles",
"\Components\ui\GlassButton",
"\Components\ui\GlassCard",
"\Components\ui\GlassInput",
"\Components\ui\GlassUpload",
"\Components\auth\PinPad",
"\Components\auth\UserGrid",
"\Components\layout\DashboardLayout",
"\Entities\ProductCategory",
"\Entities\Product",
"\Entities\Order"
)

function Normalize-TargetToRelTsx {
  param([Parameter(Mandatory=$true)][string]$Raw)
  $t = ($Raw + "").Trim()
  if ([string]::IsNullOrWhiteSpace($t)) { return "" }
  $t = $t -replace "/","\"
  $t = $t.TrimStart("\")
  $leaf = Split-Path -Path $t -Leaf
  if ($leaf -notmatch '\.[A-Za-z0-9]+$') { $t = $t + ".tsx" }
  return $t
}

function Build-MissingTargets {
  param([Parameter(Mandatory=$true)][string]$RepoRoot,[Parameter(Mandatory=$true)][string]$LogPath)

  $clientSrc = Join-Path $RepoRoot "client\src"
  if (-not (Test-Path -LiteralPath $clientSrc)) { throw "client\src not found: $clientSrc" }

  $existing = @{}
  Get-ChildItem -LiteralPath $clientSrc -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    $rel = $_.FullName.Substring($clientSrc.Length).TrimStart("\","/")
    $existing[$rel.ToLower()] = $true
  }

  $missing = New-Object System.Collections.Generic.List[string]
  foreach ($r in $RAW_TARGETS) {
    $relTsx = Normalize-TargetToRelTsx -Raw $r
    if ([string]::IsNullOrWhiteSpace($relTsx)) { continue }
    if (-not $existing.ContainsKey($relTsx.ToLower())) {
      $missing.Add("\" + ($relTsx -replace "\.tsx$",""))
    }
  }

  $seen = @{}
  $uniq = New-Object System.Collections.Generic.List[string]
  foreach ($m in $missing) {
    if (-not $seen.ContainsKey($m)) { $seen[$m] = $true; $uniq.Add($m) }
  }

  Write-LogLine -LogPath $LogPath -Level "INFO" -Message ("Targets missing: " + $uniq.Count)
  return ,$uniq
}

function Generate-ChromeJsMissing {
  param(
    [Parameter(Mandatory=$true)][string]$OutJsPath,
    [Parameter(Mandatory=$true)][string]$RepoRoot,
    [Parameter(Mandatory=$true)][string]$LogPath
  )

  $missing = Build-MissingTargets -RepoRoot $RepoRoot -LogPath $LogPath

  $missingTxt = ($missing | ForEach-Object { $_ }) -join "`r`n"
  $missingListPath = Join-Path (Split-Path -Path $OutJsPath -Parent) "missing_targets.txt"
  Write-FileUtf8NoBom -FilePath $missingListPath -Content $missingTxt
  Write-LogLine -LogPath $LogPath -Level "PASS" -Message ("Wrote missing list: tools\missing_targets.txt")

  $jsArrayLines = $missing | ForEach-Object {
    $s = $_.Replace("\","\\").Replace('"','\"')
    '    "' + $s + '"'
  }
  $jsTargets = $jsArrayLines -join ",`n"

  $js = @'
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const now = () => Date.now();

  const TARGETS_RAW = [
__TARGETS__
  ];

  const uniq = (arr) => Array.from(new Set(arr));

  function normalizeTarget(p) {
    let t = (p || "").trim();
    if (!t) return "";
    t = t.replace(/\\/g, "/");
    t = t.replace(/^\/+/, "");
    return t;
  }

  function candidatePaths(t) {
    const out = [];
    const hasExt = /\.[A-Za-z0-9]+$/.test(t);
    if (hasExt) { out.push(t); return uniq(out); }
    out.push(t);
    out.push(`${t}.tsx`);
    out.push(`${t}.ts`);
    out.push(`${t}.jsx`);
    out.push(`${t}.js`);
    out.push(`${t}/index.tsx`);
    out.push(`${t}/index.ts`);
    out.push(`${t}/index.jsx`);
    out.push(`${t}/index.js`);
    return uniq(out);
  }

  async function copyToClipboard(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch { return false; }
    }
  }

  function getMonaco() {
    const m = window.monaco;
    if (!m || !m.editor || !m.editor.getModels) return null;
    return m;
  }

  function pickBestModel(monaco, hintPath) {
    const models = monaco.editor.getModels();
    if (!models || !models.length) return null;

    const lastSeg = (hintPath || "").split("/").pop() || "";
    if (lastSeg) {
      const hit = models.find(md => {
        try {
          const uri = md.uri ? (md.uri.path || md.uri.toString()) : "";
          return uri && uri.toLowerCase().includes(lastSeg.toLowerCase());
        } catch { return false; }
      });
      if (hit) return hit;
    }

    const sorted = models.slice().sort((a,b) => {
      const al = a.getValueLength ? a.getValueLength() : (a.getValue()?.length||0);
      const bl = b.getValueLength ? b.getValueLength() : (b.getValue()?.length||0);
      return bl - al;
    });
    return sorted[0] || models[0];
  }

  function normalizePathFromBreadcrumbText(text) {
    if (!text) return "";
    let x = (text || "").replace(/\s+/g, " ").trim();
    x = x.replace(/\s*\/\s*/g, "/");
    x = x.replace(/^\//, "").replace(/\/$/, "");
    if (!x) return "";
    if (!/^(Pages|Components|Entities)\//i.test(x)) return "";
    const parts = x.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "";
    if (!/\.[A-Za-z0-9]+$/.test(last)) parts[parts.length - 1] = last + ".tsx";
    const joined = parts.join("/");
    return joined;
  }

  async function getStableBreadcrumbPath(timeoutMs = 8000, stableMs = 550) {
    const t0 = now();
    let last = "";
    let lastChangeAt = now();

    while (now() - t0 < timeoutMs) {
      const nodes = Array.from(document.querySelectorAll('[class*="breadcrumb" i], [data-testid*="breadcrumb" i], [aria-label*="breadcrumb" i]'));
      let best = "";
      for (const el of nodes) {
        const p = normalizePathFromBreadcrumbText(el.innerText || "");
        if (p) { best = p; break; }
      }
      if (best && best !== last) {
        last = best;
        lastChangeAt = now();
      }
      if (last && (now() - lastChangeAt) >= stableMs) return last;
      await sleep(120);
    }
    return "";
  }

  function focusMonacoEditorBestEffort() {
    const el = document.querySelector(".monaco-editor") || document.querySelector("textarea.inputarea");
    if (el && el.focus) { try { el.focus(); } catch {} }
  }

  function fireKey(el, type, key, code, ctrl=false) {
    const evt = new KeyboardEvent(type, { key, code, ctrlKey: ctrl, bubbles: true });
    el.dispatchEvent(evt);
  }

  async function openQuickOpenAndType(pathText) {
    focusMonacoEditorBestEffort();
    await sleep(40);
    fireKey(document, "keydown", "Control", "ControlLeft", true);
    fireKey(document, "keydown", "p", "KeyP", true);
    fireKey(document, "keyup", "p", "KeyP", true);
    fireKey(document, "keyup", "Control", "ControlLeft", false);
    await sleep(180);

    const inp = document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")
      ? document.activeElement
      : Array.from(document.querySelectorAll("input, textarea")).find(x => {
          const r = x.getBoundingClientRect();
          return r.width > 120 && r.height > 18 && r.top >= 0 && r.top < window.innerHeight;
        });

    if (!inp) return false;

    try {
      inp.focus();
      inp.value = pathText;
      inp.dispatchEvent(new Event("input", { bubbles: true }));
    } catch { return false; }

    await sleep(120);
    fireKey(document, "keydown", "Enter", "Enter", false);
    fireKey(document, "keyup", "Enter", "Enter", false);
    await sleep(280);
    return true;
  }

  async function tryOpenOneTarget(targetNormalized) {
    const tries = candidatePaths(targetNormalized);
    for (const p of tries) {
      const ok = await openQuickOpenAndType(p);
      if (!ok) continue;

      const crumb = await getStableBreadcrumbPath(6000, 450);
      if (!crumb) continue;
      if (!/^(Pages|Components|Entities)\//i.test(crumb)) continue;

      return { opened: true, crumb, tried: p };
    }
    return { opened: false, crumb: "", tried: tries[0] || "" };
  }

  console.log("[Base44Missing] START");
  const monaco = getMonaco();
  if (!monaco) { console.log("[Base44Missing][FAIL] Monaco missing."); return; }

  const targets = TARGETS_RAW.map(normalizeTarget).filter(Boolean);
  console.log("[Base44Missing] Targets missing:", targets.length);

  const seen = new Set();
  const blocks = [];
  const failed = [];

  let n = 0;

  for (const t of targets) {
    n++;
    const res = await tryOpenOneTarget(t);
    if (!res.opened) {
      failed.push(t);
      console.log(`[Base44Missing][SKIP] (${n}/${targets.length}) open failed:`, t);
      continue;
    }

    const breadcrumbPath = res.crumb;

    if (seen.has(breadcrumbPath)) {
      console.log(`[Base44Missing][DUP] (${n}/${targets.length})`, breadcrumbPath);
      continue;
    }

    const model = pickBestModel(monaco, breadcrumbPath);
    if (!model || !model.getValue) {
      failed.push(t);
      console.log(`[Base44Missing][SKIP] (${n}/${targets.length}) model missing:`, breadcrumbPath);
      continue;
    }

    const code = model.getValue();
    if (!code || !code.trim()) {
      failed.push(t);
      console.log(`[Base44Missing][SKIP] (${n}/${targets.length}) code empty:`, breadcrumbPath);
      continue;
    }

    seen.add(breadcrumbPath);
    blocks.push(`FILE: ${breadcrumbPath}\n${code}\n`);
    console.log(`[Base44Missing][OK] (${n}/${targets.length})`, breadcrumbPath);
    await sleep(90);
  }

  console.log("[Base44Missing] DONE total exported:", blocks.length);
  console.log("[Base44Missing] FAILED:", failed.length);
  if (failed.length) console.log("[Base44Missing] Failed list:", failed);

  const payload = blocks.join("\n");
  if (!payload || !payload.trim()) {
    console.log("[Base44Missing][FAIL] No payload produced.");
    return;
  }

  const okClip = await copyToClipboard(payload);
  console.log("[Base44Missing] Clipboard:", okClip ? "OK" : "FAILED");
  console.log("[Base44Missing] Payload chars:", payload.length);
  console.log("[Base44Missing] NEXT: PowerShell -Action SaveClipboard");
})();
'@

  $js = $js.Replace("__TARGETS__", "`n" + $jsTargets + "`n")

  Ensure-Dir -Path (Split-Path -Path $OutJsPath -Parent)
  Write-FileUtf8NoBom -FilePath $OutJsPath -Content $js
  Write-LogLine -LogPath $LogPath -Level "PASS" -Message ("Generated JS(MISSING): " + $OutJsPath)
}

# ---------------------------
# MAIN
# ---------------------------
$repoRoot = Get-RepoRoot -StartDir (Get-Location).Path
$toolsDir = Join-Path $repoRoot "tools"
$logsDir  = Join-Path $toolsDir "logs"
Ensure-Dir -Path $toolsDir
Ensure-Dir -Path $logsDir

$logPath = Join-Path $logsDir ("base44_export_missing_" + (Get-Date).ToString("yyyyMMdd_HHmmss") + ".log")
Write-LogLine -LogPath $logPath -Level "INFO" -Message ("RepoRoot: " + $repoRoot)
Write-LogLine -LogPath $logPath -Level "INFO" -Message ("Action: " + $Action)

$backupDir = New-BackupDir -ToolsDir $toolsDir -LogPath $logPath
$jsMissingOut = Join-Path $toolsDir "PASTE_THIS_IN_CHROME_CONSOLE_MISSING.js"

try {
  if ($Action -eq "All" -or $Action -eq "GenerateJSMissing") {
    Generate-ChromeJsMissing -OutJsPath $jsMissingOut -RepoRoot $repoRoot -LogPath $logPath
    Write-LogLine -LogPath $logPath -Level "INFO" -Message "NEXT: Paste tools\PASTE_THIS_IN_CHROME_CONSOLE_MISSING.js in Chrome Console"
  }

  if ($Action -eq "All" -or $Action -eq "SaveClipboard") {
    Save-FromClipboard -RepoRoot $repoRoot -BackupDir $backupDir -LogPath $logPath
  }

  Write-LogLine -LogPath $logPath -Level "PASS" -Message "EXIT CODE: 0"
  exit 0
}
catch {
  Write-LogLine -LogPath $logPath -Level "FAIL" -Message ("Exception: " + $_.Exception.Message)
  Write-LogLine -LogPath $logPath -Level "FAIL" -Message "EXIT CODE: 1"
  exit 1
}
'@

[System.IO.File]::WriteAllText($outFile, $rebuilt, (New-Utf8NoBomEncoding))
Write-LogLine -LogPath $logPath -Level "PASS" -Message "Rebuilt tools/base44-export-missing.ps1 successfully."
Write-LogLine -LogPath $logPath -Level "PASS" -Message "EXIT CODE: 0"
exit 0
