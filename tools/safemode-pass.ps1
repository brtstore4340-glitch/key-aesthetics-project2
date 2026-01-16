# tools/safemode-pass.ps1
# SafeMode Pass Runner (single file):
# - backup always + tools/LAST_BACKUP_DIR.txt
# - script-safe here-strings (avoid ParserError)
# - logs always + summary always
# - Fast gate: biome check + typecheck; then full (build+audit+test) if pass
# - audit non-blocking default; -StrictAudit makes it blocking

[CmdletBinding()]
param(
  [switch]$Fast,
  [switch]$OnlyFast,
  [switch]$StrictAudit,
  [switch]$SkipAudit,
  [switch]$NoPatches,
  [switch]$Install
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $PSBoundParameters.ContainsKey('Fast') -and -not $PSBoundParameters.ContainsKey('OnlyFast')) {
  $Fast = $true
}

function New-Directory([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Write-FileUtf8NoBom([string]$Path, [string]$Content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Ensure-LogFile([string]$Path, [string]$Header) {
  $dir = Split-Path -Parent $Path
  if ($dir) { New-Directory $dir }
  if (-not (Test-Path -LiteralPath $Path)) {
    Write-FileUtf8NoBom -Path $Path -Content $Header
  } else {
    Add-Content -LiteralPath $Path -Value "`r`n$Header"
  }
}

function Tee-Line([string]$LogPath, [string]$Line) {
  $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss.fff")
  $msg = "[$ts] $Line"
  Write-Host $msg
  Add-Content -LiteralPath $LogPath -Value $msg
}

function Find-RepoRoot([string]$StartDir) {
  $dir = Resolve-Path -LiteralPath $StartDir
  while ($true) {
    $pkg = Join-Path $dir "package.json"
    if (Test-Path -LiteralPath $pkg) { return $dir }
    $parent = Split-Path -Parent $dir
    if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $dir) { break }
    $dir = $parent
  }
  throw "Cannot find repo root (package.json) starting from '$StartDir'"
}

function Read-PackageScripts([string]$RepoRoot) {
  $pkgPath = Join-Path $RepoRoot "package.json"
  $raw = Get-Content -LiteralPath $pkgPath -Raw
  $json = $raw | ConvertFrom-Json
  $scripts = @{}
  if ($json.scripts) {
    foreach ($p in $json.scripts.PSObject.Properties) {
      $scripts[$p.Name] = [string]$p.Value
    }
  }
  return $scripts
}

function Resolve-NpmScriptName([hashtable]$Scripts, [string[]]$Candidates) {
  foreach ($c in $Candidates) {
    if ($Scripts.ContainsKey($c)) { return $c }
  }
  return $null
}

function Backup-Files {
  param(
    [Parameter(Mandatory)][string]$RepoRoot,
    [Parameter(Mandatory)][string]$BackupDir,
    [Parameter(Mandatory)][string[]]$RelativePaths
  )

  foreach ($rel in $RelativePaths) {
    $src = Join-Path $RepoRoot $rel
    if (-not (Test-Path -LiteralPath $src)) { continue }
    $dst = Join-Path $BackupDir $rel
    $dstDir = Split-Path -Parent $dst
    if ($dstDir) { New-Directory $dstDir }
    Copy-Item -LiteralPath $src -Destination $dst -Force
  }
}

function Replace-InFile {
  param(
    [Parameter(Mandatory)][string]$Path,
    [Parameter(Mandatory)][string]$LogPath,
    [Parameter(Mandatory)][hashtable[]]$Replacements
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    Tee-Line $LogPath "SKIP (missing): $Path"
    return $false
  }

  $raw = Get-Content -LiteralPath $Path -Raw
  $orig = $raw
  foreach ($r in $Replacements) {
    $raw = [regex]::Replace($raw, [string]$r.Pattern, [string]$r.Replacement)
  }

  if ($raw -ne $orig) {
    Write-FileUtf8NoBom -Path $Path -Content $raw
    Tee-Line $LogPath "UPDATED: $Path"
    return $true
  }

  Tee-Line $LogPath "NOCHANGE: $Path"
  return $false
}

function Invoke-Step {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][string]$LogPath,
    [Parameter(Mandatory)][ScriptBlock]$Action
  )

  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  Tee-Line $LogPath "=== BEGIN: $Name ==="
  $exitCode = 0
  $ok = $true
  try {
    & $Action 2>&1 | Tee-Object -FilePath $LogPath -Append | Out-Host
    if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) {
      $exitCode = [int]$LASTEXITCODE
      $ok = $false
      Tee-Line $LogPath "Step '$Name' finished with exit code $exitCode"
    } else {
      Tee-Line $LogPath "Step '$Name' finished OK"
    }
  } catch {
    $ok = $false
    $exitCode = 999
    $err = ($_ | Out-String).TrimEnd()
    Tee-Line $LogPath "Step '$Name' threw an exception:"
    Add-Content -LiteralPath $LogPath -Value $err
  } finally {
    $sw.Stop()
    Tee-Line $LogPath ("=== END: {0} (Duration: {1:0.00}s) ===" -f $Name, $sw.Elapsed.TotalSeconds)
  }

  return [pscustomobject]@{
    Name     = $Name
    Ok       = $ok
    ExitCode = $exitCode
    Seconds  = [math]::Round($sw.Elapsed.TotalSeconds, 2)
  }
}

function Try-Patch-BiomeIgnore {
  param(
    [Parameter(Mandatory)][string]$RepoRoot,
    [Parameter(Mandatory)][string]$LogPath
  )

  $biomePath = Join-Path $RepoRoot "biome.json"
  if (-not (Test-Path -LiteralPath $biomePath)) {
    Tee-Line $LogPath "biome.json not found -> skip ignore patch"
    return $false
  }

  $raw = Get-Content -LiteralPath $biomePath -Raw
  try {
    $obj = $raw | ConvertFrom-Json
  } catch {
    Tee-Line $LogPath "biome.json not strict JSON -> skip ignore patch"
    return $false
  }

  if (-not $obj.files) { $obj | Add-Member -NotePropertyName files -NotePropertyValue (@{}) }
  if (-not $obj.files.ignore) { $obj.files | Add-Member -NotePropertyName ignore -NotePropertyValue (@()) }

  $ignore = @($obj.files.ignore)
  $want = @("tools/backup_*/**", "tools/logs/**")

  $changed = $false
  foreach ($w in $want) {
    if ($ignore -notcontains $w) {
      $ignore += $w
      $changed = $true
    }
  }

  if ($changed) {
    $obj.files.ignore = $ignore
    $out = $obj | ConvertTo-Json -Depth 64
    Write-FileUtf8NoBom -Path $biomePath -Content ($out + "`r`n")
    Tee-Line $LogPath "Patched biome.json ignores: tools/backup_*/** + tools/logs/**"
  } else {
    Tee-Line $LogPath "biome.json ignores already OK"
  }

  return $changed
}

function Apply-Known-CodePatches {
  param(
    [Parameter(Mandatory)][string]$RepoRoot,
    [Parameter(Mandatory)][string]$LogPath
  )

  $changed = $false

  # Node.js protocol imports
  $changed = (Replace-InFile -Path (Join-Path $RepoRoot "vite.config.ts") -LogPath $LogPath -Replacements @(
    @{ Pattern = 'from\s+"path";'; Replacement = 'from "node:path";' }
  )) -or $changed

  $changed = (Replace-InFile -Path (Join-Path $RepoRoot "shared/server/vite.ts") -LogPath $LogPath -Replacements @(
    @{ Pattern = 'from\s+"fs";';   Replacement = 'from "node:fs";' },
    @{ Pattern = 'from\s+"http";'; Replacement = 'from "node:http";' },
    @{ Pattern = 'from\s+"path";'; Replacement = 'from "node:path";' }
  )) -or $changed

  # Buttons must have explicit type
  $sidebarPath = Join-Path $RepoRoot "client/src/components/Sidebar.tsx"
  if (Test-Path -LiteralPath $sidebarPath) {
    $raw = Get-Content -LiteralPath $sidebarPath -Raw
    $orig = $raw
    $raw = [regex]::Replace($raw, '<button(?![^>]*\btype=)', '<button type="button"')
    if ($raw -ne $orig) {
      Write-FileUtf8NoBom -Path $sidebarPath -Content $raw
      Tee-Line $LogPath "UPDATED: $sidebarPath (added type=""button"" where missing)"
      $changed = $true
    } else {
      Tee-Line $LogPath "NOCHANGE: $sidebarPath"
    }
  } else {
    Tee-Line $LogPath "SKIP (missing): $sidebarPath"
  }

  # shared/server/storage.ts: remove obvious Biome blockers (best-effort safe rewrites)
  $storagePath = Join-Path $RepoRoot "shared/server/storage.ts"
  if (Test-Path -LiteralPath $storagePath) {
    $raw = Get-Content -LiteralPath $storagePath -Raw
    $orig = $raw

    # any -> unknown for callbacks
    $raw = [regex]::Replace($raw, 'callback:\s*\(err\?:\s*any(\s*,\s*session\?:\s*session\.SessionData\s*\|\s*null)?\)\s*=>', 'callback: (err?: unknown$1) =>')
    $raw = [regex]::Replace($raw, 'callback\?:\s*\(err\?:\s*any\)\s*=>', 'callback?: (err?: unknown) =>')

    # updateOrder signatures any -> Partial<InsertOrder>
    $raw = [regex]::Replace($raw, 'updateOrder\(\s*id:\s*number\s*,\s*(order|updates):\s*any\s*\)', 'updateOrder(id: number, updates: Partial<InsertOrder>)')
    $raw = [regex]::Replace($raw, 'async\s+updateOrder\(\s*id:\s*number\s*,\s*(order|updates):\s*any\s*\)', 'async updateOrder(id: number, updates: Partial<InsertOrder>)')

    # (value as any).toDate -> typed, and forEach -> for..of (only for that known key list)
    $raw = [regex]::Replace($raw, '\(value as any\)\.toDate\(\)', '(value as { toDate: () => Date }).toDate()')
    $raw = [regex]::Replace($raw, '\(value as any\)\.toDate', '(value as { toDate?: unknown }).toDate')

    $raw = [regex]::Replace(
      $raw,
      '\["createdAt",\s*"updatedAt",\s*"verifiedAt"\]\.forEach\(\(key\)\s*=>\s*\{',
      'for (const key of ["createdAt", "updatedAt", "verifiedAt"] as const) {'
    )
    $raw = [regex]::Replace($raw, '\}\);\s*(\r?\n)', "}`$1")

    # Non-null assertions -> explicit checks (target exact patterns)
    $raw = [regex]::Replace(
      $raw,
      'return\s+deserializeDates<User>\(created\.data\(\)\)!\s*;',
@'
const data = created.data();
if (!data) {
  throw new Error("User not found");
}
return deserializeDates<User>(data);
'@
    )

    $raw = [regex]::Replace(
      $raw,
      'return\s+\(await\s+this\.getProduct\(id\)\)!\s*;',
@'
const product = await this.getProduct(id);
if (!product) {
  throw new Error("Product not found");
}
return product;
'@
    )

    $raw = [regex]::Replace(
      $raw,
      'return\s+\(await\s+this\.getOrder\(id\)\)!\s*;',
@'
const order = await this.getOrder(id);
if (!order) {
  throw new Error("Order not found");
}
return order;
'@
    )

    if ($raw -ne $orig) {
      Write-FileUtf8NoBom -Path $storagePath -Content $raw
      Tee-Line $LogPath "UPDATED: $storagePath (best-effort Biome blockers removed)"
      $changed = $true
    } else {
      Tee-Line $LogPath "NOCHANGE: $storagePath"
    }
  } else {
    Tee-Line $LogPath "SKIP (missing): $storagePath"
  }

  return $changed
}

# -------- Main --------
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Find-RepoRoot -StartDir $scriptDir
Set-Location -LiteralPath $repoRoot

$toolsDir = Join-Path $repoRoot "tools"
$logsDir  = Join-Path $toolsDir "logs"
New-Directory $toolsDir
New-Directory $logsDir

$logBiome = Join-Path $logsDir "biome-check.log"
$logTsc   = Join-Path $logsDir "typecheck.log"
$logBuild = Join-Path $logsDir "build.log"
$logAudit = Join-Path $logsDir "audit.log"
$logFatal = Join-Path $logsDir "fatal.log"
$sumPath  = Join-Path $logsDir "summary.txt"

Ensure-LogFile $logBiome "## biome-check.log"
Ensure-LogFile $logTsc   "## typecheck.log"
Ensure-LogFile $logBuild "## build.log"
Ensure-LogFile $logAudit "## audit.log"
Write-FileUtf8NoBom -Path $sumPath -Content "Summary will be written at the end.`r`n"

$results = New-Object System.Collections.Generic.List[object]
$started = Get-Date

$meta = [ordered]@{
  RepoRoot     = $repoRoot
  PwshVersion  = $PSVersionTable.PSVersion.ToString()
  NodeEngine   = ">=20 (from package.json)"
  StartedAt    = $started.ToString("yyyy-MM-dd HH:mm:ss")
  Mode         = if ($OnlyFast) { "OnlyFast" } elseif ($Fast) { "FastGateThenFull" } else { "Full" }
  StrictAudit  = [bool]$StrictAudit
  SkipAudit    = [bool]$SkipAudit
  NoPatches    = [bool]$NoPatches
  Install      = [bool]$Install
}

try {
  foreach ($lp in @($logBiome, $logTsc, $logBuild, $logAudit)) {
    Tee-Line $lp ("RepoRoot: {0}" -f $meta.RepoRoot)
    Tee-Line $lp ("PowerShell: {0}" -f $meta.PwshVersion)
  }

  if ($Install) {
    $results.Add((Invoke-Step -Name "npm ci" -LogPath $logBuild -Action { npm ci }))
  } else {
    Tee-Line $logBuild "Install skipped (use -Install to run npm ci)"
  }

  # Backup before patches
  $stamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
  $backupDir = Join-Path $toolsDir ("backup_{0}" -f $stamp)
  New-Directory $backupDir

  $backupList = @(
    "package.json",
    "package-lock.json",
    "biome.json",
    "tsconfig.json",
    "vite.config.ts",
    "shared/server/vite.ts",
    "client/src/components/Sidebar.tsx",
    "shared/server/storage.ts"
  )
  Backup-Files -RepoRoot $repoRoot -BackupDir $backupDir -RelativePaths $backupList
  Write-FileUtf8NoBom -Path (Join-Path $toolsDir "LAST_BACKUP_DIR.txt") -Content ($backupDir + "`r`n")
  Tee-Line $logBuild "Backup created at: $backupDir (tools/LAST_BACKUP_DIR.txt)"

  if (-not $NoPatches) {
    Try-Patch-BiomeIgnore -RepoRoot $repoRoot -LogPath $logBuild | Out-Null
    Apply-Known-CodePatches -RepoRoot $repoRoot -LogPath $logBuild | Out-Null

    # Auto-fix as much as possible
    $results.Add((Invoke-Step -Name "biome autofix (npx biome check . --write --unsafe)" -LogPath $logBiome -Action {
      npx biome check . --write --unsafe
    }))
  } else {
    Tee-Line $logBuild "Patches disabled (-NoPatches)"
  }

  $scripts = Read-PackageScripts -RepoRoot $repoRoot

  # Prefer "check" over "lint" to match your package.json
  $biomeScript = Resolve-NpmScriptName -Scripts $scripts -Candidates @("check", "lint")
  $tscScript   = Resolve-NpmScriptName -Scripts $scripts -Candidates @("typecheck")
  $buildScript = Resolve-NpmScriptName -Scripts $scripts -Candidates @("build")
  $testScript  = Resolve-NpmScriptName -Scripts $scripts -Candidates @("test")
  $auditScript = Resolve-NpmScriptName -Scripts $scripts -Candidates @("audit")

  # Gate: biome check
  if ($biomeScript) {
    $results.Add((Invoke-Step -Name "biome ($biomeScript)" -LogPath $logBiome -Action { npm run -s $biomeScript }))
  } else {
    $results.Add((Invoke-Step -Name "biome (fallback: npx biome check .)" -LogPath $logBiome -Action { npx biome check . }))
  }

  # Gate: typecheck
  if ($tscScript) {
    $results.Add((Invoke-Step -Name "typecheck ($tscScript)" -LogPath $logTsc -Action { npm run -s $tscScript }))
  } else {
    $results.Add((Invoke-Step -Name "typecheck (fallback: npx tsc -p tsconfig.json --noEmit)" -LogPath $logTsc -Action { npx tsc -p tsconfig.json --noEmit }))
  }

  $biomeOk = ($results | Where-Object { $_.Name -like "biome (check)*" -or $_.Name -like "biome (lint)*" } | Select-Object -Last 1).Ok
  $tsOk    = ($results | Where-Object { $_.Name -like "typecheck*" } | Select-Object -Last 1).Ok

  $shouldRunFull =
    (-not $OnlyFast) -and (
      (-not $Fast) -or ($Fast -and $biomeOk -and $tsOk)
    )

  if (-not $shouldRunFull) {
    Tee-Line $logBuild "Full pipeline skipped (Fast gate failed or -OnlyFast set)"
    Tee-Line $logAudit "Audit skipped (full pipeline not entered)"
  } else {
    # build
    if ($buildScript) {
      $results.Add((Invoke-Step -Name "build ($buildScript)" -LogPath $logBuild -Action { npm run -s $buildScript }))
    } else {
      $results.Add((Invoke-Step -Name "build (fallback: npm run -s build)" -LogPath $logBuild -Action { npm run -s build }))
    }

    # audit (non-blocking default)
    if ($SkipAudit) {
      Tee-Line $logAudit "Audit skipped (-SkipAudit)"
      $results.Add([pscustomobject]@{ Name="audit (skipped)"; Ok=$true; ExitCode=0; Seconds=0 })
    } else {
      $auditRes = if ($auditScript) {
        Invoke-Step -Name "audit ($auditScript)" -LogPath $logAudit -Action { npm run -s $auditScript }
      } else {
        Invoke-Step -Name "npm audit" -LogPath $logAudit -Action { npm audit }
      }

      if (-not $auditRes.Ok -and -not $StrictAudit) {
        Tee-Line $logAudit "Audit failed but is NON-BLOCKING (default). Use -StrictAudit to make it blocking."
        $auditRes = [pscustomobject]@{ Name=$auditRes.Name; Ok=$true; ExitCode=$auditRes.ExitCode; Seconds=$auditRes.Seconds }
      }
      $results.Add($auditRes)
    }

    # test
    if ($testScript) {
      $results.Add((Invoke-Step -Name "test ($testScript)" -LogPath $logBuild -Action { npm run -s $testScript }))
    } else {
      $results.Add((Invoke-Step -Name "test (fallback: npm test)" -LogPath $logBuild -Action { npm test }))
    }
  }
}
catch {
  $errText = ($_ | Out-String).TrimEnd()
  Ensure-LogFile $logFatal "## fatal.log"
  Add-Content -LiteralPath $logFatal -Value $errText
}
finally {
  $finished = Get-Date
  $meta.FinishedAt = $finished.ToString("yyyy-MM-dd HH:mm:ss")

  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("Keys-Pro SafeMode Summary")
  $lines.Add(("StartedAt   : {0}" -f $meta.StartedAt))
  $lines.Add(("FinishedAt  : {0}" -f $meta.FinishedAt))
  $lines.Add(("RepoRoot    : {0}" -f $meta.RepoRoot))
  $lines.Add(("PowerShell  : {0}" -f $meta.PwshVersion))
  $lines.Add(("Mode        : {0}" -f $meta.Mode))
  $lines.Add(("StrictAudit : {0}" -f $meta.StrictAudit))
  $lines.Add(("SkipAudit   : {0}" -f $meta.SkipAudit))
  $lines.Add(("NoPatches   : {0}" -f $meta.NoPatches))
  $lines.Add(("Install     : {0}" -f $meta.Install))
  $lines.Add("")
  $lines.Add("Step Results:")
  $lines.Add("------------")

  foreach ($r in $results) {
    $lines.Add(("{0} | ok={1} | exit={2} | {3}s" -f $r.Name, $r.Ok, $r.ExitCode, $r.Seconds))
  }

  $failed = $results | Where-Object { -not $_.Ok }
  $lines.Add("")
  $lines.Add(("Overall: {0}" -f ($(if ($failed.Count -eq 0) { "PASS" } else { "FAIL" }))))
  $lines.Add("")
  $lines.Add("Logs:")
  $lines.Add((" - {0}" -f $logBiome))
  $lines.Add((" - {0}" -f $logTsc))
  $lines.Add((" - {0}" -f $logBuild))
  $lines.Add((" - {0}" -f $logAudit))
  if (Test-Path -LiteralPath $logFatal) { $lines.Add((" - {0}" -f $logFatal)) }
  $lines.Add((" - {0}" -f $sumPath))

  Write-FileUtf8NoBom -Path $sumPath -Content (($lines -join "`r`n") + "`r`n")
}
