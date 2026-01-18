# BackgroundValidate: true
[CmdletBinding()]
param(
  [string]$Root = ".",
  [switch]$Fix,
  [switch]$VerboseReport
)

$ErrorActionPreference = "Stop"

$include = @("*.tsx","*.ts","*.jsx","*.js")
$files = Get-ChildItem -Path $Root -Recurse -File -Include $include |
  Where-Object { $_.FullName -notmatch "\\node_modules\\|\\dist\\|\\build\\|\\.next\\|\\.vite\\|\\coverage\\|\\out\\|\\functions\\lib\\|\\lib\\|\\generated\\" }

function Read-Text([string]$path) { Get-Content -LiteralPath $path -Raw -Encoding UTF8 }
function Write-Text([string]$path, [string]$text) { Set-Content -LiteralPath $path -Value $text -Encoding UTF8 }

$findings = New-Object System.Collections.Generic.List[object]

foreach ($f in $files) {
  $p = $f.FullName
  $t = Read-Text $p

  $mutateOnClick = [regex]::Matches($t, 'onClick\s*=\s*\{\s*([A-Za-z_$][\w$]*\.)?mutate\s*\}', "IgnoreCase")
  $mutateEventRisk = [regex]::Matches($t, 'onClick\s*=\s*\{\s*([A-Za-z_$][\w$]*\.)?mutateAsync\s*\}', "IgnoreCase")
  $useMutationObj = [regex]::Matches($t, '\buseMutation\s*\(\s*\{', "IgnoreCase")

  $hasOnError = ($t -match '\bonError\s*:')
  $hasTryCatch = ($t -match '\btry\s*\{[\s\S]*?\}\s*catch\s*\(')
  $firestoreWrites = [regex]::Matches($t, '\b(addDoc|setDoc|updateDoc|writeBatch|runTransaction)\b', "IgnoreCase")
  $firestoreReads = [regex]::Matches($t, '\b(getDoc|getDocs|onSnapshot)\b', "IgnoreCase")

  $effect = [regex]::Matches($t, '\buseEffect\s*\(', "IgnoreCase")
  $effectHasAsync = ($t -match '\buseEffect\s*\(\s*\(\s*\)\s*=>\s*\{\s*async\b' -or $t -match '\buseEffect\s*\(\s*async\s*\(')

  if ($mutateOnClick.Count -gt 0 -or $mutateEventRisk.Count -gt 0 -or $useMutationObj.Count -gt 0 -or $firestoreWrites.Count -gt 0 -or $effect.Count -gt 0) {
    $findings.Add([pscustomobject]@{
      File               = $p
      MutateOnClick      = $mutateOnClick.Count
      MutateAsyncOnClick = $mutateEventRisk.Count
      UseMutationObj     = $useMutationObj.Count
      HasOnError         = $hasOnError
      HasTryCatch        = $hasTryCatch
      FirestoreWrites    = $firestoreWrites.Count
      FirestoreReads     = $firestoreReads.Count
      UseEffectCount     = $effect.Count
      UseEffectAsyncRisk = $effectHasAsync
    })
  }

  if (-not $Fix) { continue }

  $orig = $t

  # Fix 1: Wrap onClick={...mutate} to avoid passing click event as variables
  $t = [regex]::Replace($t, 'onClick\s*=\s*\{\s*([A-Za-z_$][\w$]*\.)?mutate\s*\}', 'onClick={() => ${1}mutate()}', "IgnoreCase")
  $t = [regex]::Replace($t, 'onClick\s*=\s*\{\s*([A-Za-z_$][\w$]*\.)?mutateAsync\s*\}', 'onClick={async () => await ${1}mutateAsync()}', "IgnoreCase")

  # Fix 2: Ensure useMutation({ ... }) has onError handler (minimal insertion)
  if ($t -match '\buseMutation\s*\(\s*\{' -and $t -notmatch '\bonError\s*:') {
    $t = [regex]::Replace(
      $t,
      '(\buseMutation\s*\(\s*\{)',
      "`$1`r`n  onError: (err) => { console.error('MUTATION ERROR =', err); },",
      "IgnoreCase",
      1
    )
  }

  if ($t -ne $orig) {
    $bak = "$p.bak"
    if (-not (Test-Path -LiteralPath $bak)) { Copy-Item -LiteralPath $p -Destination $bak }
    Write-Text $p $t
  }
}

$sorted = $findings | Sort-Object -Property MutateOnClick,MutateAsyncOnClick,FirestoreWrites -Descending

if ($VerboseReport) {
  $sorted | Format-List
} else {
  $sorted | Select-Object File,MutateOnClick,MutateAsyncOnClick,UseMutationObj,HasOnError,FirestoreWrites,FirestoreReads,UseEffectCount,UseEffectAsyncRisk |
    Format-Table -AutoSize
}

if ($Fix) { "DONE" }
