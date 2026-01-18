[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$Root = ".",
  [switch]$Patch
)

$ErrorActionPreference = "Stop"

$include = @("*.tsx","*.ts","*.jsx","*.js")
$excludeRegex = "\\node_modules\\|\\dist\\|\\build\\|\\.next\\|\\.vite\\|\\coverage\\|\\out\\|\\functions\\lib\\"

function Read-Text([string]$path) {
  Get-Content -LiteralPath $path -Raw -Encoding UTF8
}

function Write-Text([string]$path, [string]$text) {
  Set-Content -LiteralPath $path -Value $text -Encoding UTF8
}

$onClickMutatePattern = 'onClick\s*=\s*\{\s*((?:[A-Za-z_$][\w$]*\.)?mutate)\s*\}'
$onClickMutateReplacement = 'onClick={() => $1()}'
$rxOpt = [System.Text.RegularExpressions.RegexOptions]::IgnoreCase

$files = Get-ChildItem -Path $Root -Recurse -File -Include $include |
  Where-Object { $_.FullName -notmatch $excludeRegex }

$report = New-Object System.Collections.Generic.List[object]
$patches = New-Object System.Collections.Generic.List[object]

foreach ($f in $files) {
  $p = $f.FullName
  $t = Read-Text $p

  $matches = [regex]::Matches($t, $onClickMutatePattern, $rxOpt)
  if ($matches.Count -eq 0) { continue }

  $report.Add([pscustomobject]@{
    File = $p
    OnClickMutateMatches = $matches.Count
  })

  if (-not $Patch) { continue }

  $updated = [regex]::Replace($t, $onClickMutatePattern, $onClickMutateReplacement, $rxOpt)
  if ($updated -eq $t) { continue }

  $patches.Add([pscustomobject]@{
    File = $p
    Changes = $matches.Count
  })

  if ($PSCmdlet.ShouldProcess($p, "Patch onClick={mutate} -> onClick={() => mutate()}")) {
    $backup = "$p.bak"
    if (-not (Test-Path -LiteralPath $backup)) {
      Copy-Item -LiteralPath $p -Destination $backup -Force
    }
    Write-Text $p $updated
  }
}

$report | Sort-Object -Property OnClickMutateMatches -Descending | Format-Table -AutoSize

if ($Patch) {
  if ($patches.Count -eq 0) {
    Write-Host "PATCH MODE: no changes needed."
  } else {
    Write-Host ("PATCH MODE: updated {0} file(s). Backups: *.bak" -f $patches.Count)
  }
} else {
  Write-Host "DRY-RUN: no files were modified. Use -Patch to apply changes."
}
