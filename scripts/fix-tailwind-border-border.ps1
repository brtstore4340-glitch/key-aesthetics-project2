Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }

function Get-FirstExistingPath([string[]]$paths) {
  foreach ($p in $paths) { if (Test-Path -LiteralPath $p) { return (Resolve-Path -LiteralPath $p).Path } }
  return $null
}

function Find-TailwindConfig {
  param([Parameter(Mandatory=$true)][string]$repoRoot)

  $candidates = @(
    (Join-Path -Path $repoRoot -ChildPath "client\tailwind.config.ts"),
    (Join-Path -Path $repoRoot -ChildPath "client\tailwind.config.js"),
    (Join-Path -Path $repoRoot -ChildPath "client\tailwind.config.cjs"),
    (Join-Path -Path $repoRoot -ChildPath "client\tailwind.config.mjs"),
    (Join-Path -Path $repoRoot -ChildPath "tailwind.config.ts"),
    (Join-Path -Path $repoRoot -ChildPath "tailwind.config.js"),
    (Join-Path -Path $repoRoot -ChildPath "tailwind.config.cjs"),
    (Join-Path -Path $repoRoot -ChildPath "tailwind.config.mjs")
  )

  $first = Get-FirstExistingPath $candidates
  if ($first) { return $first }

  $found = Get-ChildItem -LiteralPath $repoRoot -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^tailwind\.config\.(js|ts|cjs|mjs)$' } |
    Select-Object -First 1

  if ($found) { return $found.FullName }
  return $null
}

function Ensure-ColorBorderInTailwindConfig {
  param([Parameter(Mandatory=$true)][string]$configPath)

  Write-Step "Patching Tailwind config: $configPath"
  $raw = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8

  # If already present, do nothing
  if ($raw -match '(?s)colors\s*:\s*{.*?\bborder\s*:') {
    Write-Step "Already has colors.border. No change."
    return $false
  }

  $borderLine = 'border: "hsl(var(--border))",'
  $updated = $raw

  # Prefer inserting into extend.colors
  if ($updated -match '(?s)extend\s*:\s*{.*?colors\s*:\s*{') {
    $updated = [regex]::Replace($updated, '(?s)(colors\s*:\s*{)', "`$1`r`n      $borderLine", 1)
  }
  elseif ($updated -match '(?s)extend\s*:\s*{') {
    $updated = [regex]::Replace($updated, '(?s)(extend\s*:\s*{)', "`$1`r`n    colors: { $borderLine },", 1)
  }
  elseif ($updated -match '(?s)theme\s*:\s*{') {
    $updated = [regex]::Replace($updated, '(?s)(theme\s*:\s*{)', "`$1`r`n    extend: { colors: { $borderLine } },", 1)
  }
  else {
    if ($updated -match 'plugins\s*:') {
      $updated = [regex]::Replace($updated, '(?s)(plugins\s*:)', "theme: { extend: { colors: { $borderLine } } },`r`n  `$1", 1)
    } else {
      throw "Could not find where to inject theme/colors in tailwind config. Please add colors.border manually."
    }
  }

  if ($updated -eq $raw) {
    throw "Patch produced no changes; please add colors.border manually."
  }

  Set-Content -LiteralPath $configPath -Value $updated -Encoding UTF8
  Write-Step "Added colors.border."
  return $true
}

function Ensure-BorderCssVariable {
  param([Parameter(Mandatory=$true)][string]$indexCssPath)

  Write-Step "Checking CSS variables: $indexCssPath"
  if (!(Test-Path -LiteralPath $indexCssPath)) {
    Write-Step "index.css not found; skipping."
    return $false
  }

  $css = Get-Content -LiteralPath $indexCssPath -Raw -Encoding UTF8

  # Only add var if project uses border-border AND var missing
  if (-not ($css -match 'border-border')) {
    Write-Step "index.css does not reference border-border; skipping --border var."
    return $false
  }

  if ($css -match '--border\s*:') {
    Write-Step "--border already present. No change."
    return $false
  }

  $vars = @"
:root{
  --border: 214.3 31.8% 91.4%;
}
.dark{
  --border: 217.2 32.6% 17.5%;
}

"@

  Set-Content -LiteralPath $indexCssPath -Value ($vars + $css) -Encoding UTF8
  Write-Step "Prepended minimal --border CSS variables."
  return $true
}

# ----------------- MAIN -----------------
$repoRoot = (Resolve-Path -LiteralPath ".").Path
Write-Step "repoRoot = $repoRoot"

$indexCss = Join-Path -Path $repoRoot -ChildPath "client\src\index.css"
$twConfig = Find-TailwindConfig -repoRoot $repoRoot

Write-Step "twConfig = $twConfig"
if (-not $twConfig) {
  throw "Tailwind config not found. Expected tailwind.config.(ts|js|cjs|mjs) in client/ or repo root."
}

$changed1 = Ensure-ColorBorderInTailwindConfig -configPath $twConfig
$changed2 = Ensure-BorderCssVariable -indexCssPath $indexCss

Write-Step "Done. Changed tailwind config: $changed1; changed index.css: $changed2"

if ($env:RUN_BUILD -eq "1") {
  Write-Step "RUN_BUILD=1 -> npm -C client run build"
  & npm -C client run build
}
