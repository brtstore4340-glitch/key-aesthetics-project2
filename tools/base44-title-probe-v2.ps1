# ============================================
# Base44 Title Probe v2 (Breadcrumb-only)
# - Fix wrong title from sidebar
# - Copy JS to clipboard + save file
# - SafeMode + Logs + UTF-8 no BOM
# ============================================

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

function Write-FileUtf8NoBom {
  param([Parameter(Mandatory=$true)][string]$Path,[Parameter(Mandatory=$true)][string]$Text)
  $enc = New-Utf8NoBomEncoding
  [System.IO.File]::WriteAllText($Path, $Text, $enc)
}

function Backup-IfExists {
  param([Parameter(Mandatory=$true)][string]$Path)
  if (Test-Path -LiteralPath $Path) {
    $ts = Get-Date -Format "yyyyMMdd_HHmmss"
    $bak = "$Path.bak_$ts"
    Copy-Item -LiteralPath $Path -Destination $bak -Force
    return $bak
  }
  return $null
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
  $c = @{INFO="Cyan";WARN="Yellow";PASS="Green";FAIL="Red"}[$Level]
  Write-Host $line -ForegroundColor $c
}

$root    = (Get-Location).Path
$tools   = Join-Path $root "tools"
$logsDir = Join-Path $tools "logs"
Ensure-Dir $tools
Ensure-Dir $logsDir

$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$logPath = Join-Path $logsDir ("base44_title_probe_v2_{0}.log" -f $ts)
$jsFile  = Join-Path $tools  "PASTE_THIS_IN_CHROME_CONSOLE__TITLE_PROBE_v2.js"

Write-LogLine -LogPath $logPath -Message ("RepoRoot: {0}" -f $root) -Level "INFO"
Write-LogLine -LogPath $logPath -Message ("JSFile: {0}" -f $jsFile) -Level "INFO"

$bak = Backup-IfExists -Path $jsFile
if ($bak) { Write-LogLine -LogPath $logPath -Message ("Backup JS -> {0}" -f $bak) -Level "INFO" }

# ---- JS: Breadcrumb-only title resolver ----
$js = @"
(() => {
  const TIMEOUT_MS = 30000;
  const INTERVAL_MS = 200;
  const STABLE_MS = 700;

  const log = (...a) => console.log("[base44-title-v2]", ...a);

  const clean = (s) => (s || "")
    .replace(/\\s+/g, " ")
    .replace(/[\\u200B-\\u200D\\uFEFF]/g, "")
    .trim();

  // ✅ ONLY Breadcrumb: "Pages / AdminProducts" (NOT sidebar list)
  const getBreadcrumbTitle = () => {
    // Find blocks that contain "Pages" or "Components" and then take the last "text-neutral-900"
    const blocks = Array.from(document.querySelectorAll("div"))
      .filter(d => d.querySelector && (
        (d.querySelector("span") && clean(d.innerText || "").includes("Pages")) ||
        (d.querySelector("span") && clean(d.innerText || "").includes("Components"))
      ));

    // Use XPath to be strict: a div containing span "Pages" -> get span.text-neutral-900
    const pickByKeyword = (keyword) => {
      try {
        const xp = `//div[.//span[normalize-space(.)='${keyword}']]//span[contains(@class,'text-neutral-900')]`;
        const snap = document.evaluate(xp, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        if (!snap || snap.snapshotLength < 1) return "";
        const last = snap.snapshotItem(snap.snapshotLength - 1);
        return clean(last ? (last.innerText || last.textContent || "") : "");
      } catch (e) {
        return "";
      }
    };

    const t1 = pickByKeyword("Pages");
    if (t1) return t1;

    const t2 = pickByKeyword("Components");
    if (t2) return t2;

    // fallback (still breadcrumb-ish): top bar often has span.text-neutral-900 near "Pages /"
    const topCandidates = Array.from(document.querySelectorAll("span.text-neutral-900"))
      .map(el => clean(el.innerText || el.textContent))
      .filter(Boolean);

    // try to pick the one that is NOT "Upgrade", NOT "Publish"
    const bad = new Set(["Upgrade", "Publish", "Dashboard", "Preview"]);
    const good = topCandidates.filter(x => !bad.has(x) && x.length <= 60);

    return good.length ? good[0] : "";
  };

  const stableWait = async () => {
    const end = Date.now() + TIMEOUT_MS;
    let last = "";
    let lastChange = Date.now();

    while (Date.now() < end) {
      const v = getBreadcrumbTitle();
      if (v && v !== last) {
        last = v;
        lastChange = Date.now();
        log("change:", v);
      }
      if (last && (Date.now() - lastChange) >= STABLE_MS) return last;
      await new Promise(r => setTimeout(r, INTERVAL_MS));
    }
    return null;
  };

  const main = async () => {
    log("start wait breadcrumb title...");
    const result = await stableWait();

    if (!result) {
      log("❌ Timeout: breadcrumb title empty");
      log("debug: span.text-neutral-900 count =", document.querySelectorAll("span.text-neutral-900").length);
      return null;
    }

    log("✅ title:", result);
    return result;
  };

  return main();
})();
"@

Write-FileUtf8NoBom -Path $jsFile -Text $js

try {
  Set-Clipboard -Value $js
  Write-LogLine -LogPath $logPath -Message "Copied JS v2 to clipboard (paste into Chrome Console now)" -Level "PASS"
} catch {
  Write-LogLine -LogPath $logPath -Message ("Set-Clipboard failed. Use file: {0}" -f $jsFile) -Level "WARN"
}

Write-LogLine -LogPath $logPath -Message ("Saved: {0}" -f $jsFile) -Level "INFO"

Write-Host ""
Write-Host "[PASS] Next step:" -ForegroundColor Green
Write-Host "1) Open Chrome DevTools -> Console" -ForegroundColor Cyan
Write-Host "2) Ctrl+V then Enter" -ForegroundColor Cyan
Write-Host ("JSFile: {0}" -f $jsFile) -ForegroundColor Cyan
Write-Host ("Log: {0}" -f $logPath) -ForegroundColor Cyan
