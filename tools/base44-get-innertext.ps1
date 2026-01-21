# =========================
# INSTALL / UPDATE SCRIPT (Generator)
# writes: tools\save-base44-export.ps1
# =========================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

try {
  $root = (Get-Location).Path
  $toolsDir = Join-Path $root "tools"
  $logsDir  = Join-Path $toolsDir "logs"
  New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
  New-Item -ItemType Directory -Path $logsDir  -Force | Out-Null

  $target = Join-Path $toolsDir "save-base44-export.ps1"

  # backup old file if exists
  if (Test-Path -LiteralPath $target) {
    $stamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
    $bak = "$target.bak_$stamp"
    Copy-Item -LiteralPath $target -Destination $bak -Force
    Set-Content -LiteralPath (Join-Path $toolsDir "LAST_BACKUP_DIR.txt") -Value (Split-Path -Parent $bak) -Encoding UTF8
    Write-Host "[INFO] Backup old script -> $bak" -ForegroundColor Cyan
  }

  $content = @'
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

trap {
  try { Write-Host "[FAIL] $($_.Exception.Message)" -ForegroundColor Red } catch {}
  exit 1
}

function New-Utf8NoBomEncoding {
  [System.Text.UTF8Encoding]::new($false)
}

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

function Backup-IfExists {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [Parameter(Mandatory=$true)][string]$BackupDir,
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
  $safeSegments = foreach ($s in $segments) {
    ($s -replace '[<>:"|?*]', '_')
  }

  ($safeSegments -join '\')
}

function Parse-Base44Export {
  param([Parameter(Mandatory=$true)][string]$Text)

  $m = [regex]::Match($Text, '(?im)^\s*(?:\/\*\s*)?FILE\s*:\s*(.+?)\s*$')
  if (-not $m.Success) {
    throw "Cannot find 'FILE:' line in text. Example required: FILE: Pages/AccountingDashboard"
  }

  $fileRel = $m.Groups[1].Value.Trim()

  $body = $null
  $idx = $Text.IndexOf("*/")
  if ($idx -ge 0) {
    $body = $Text.Substring($idx + 2)
  } else {
    $body = $Text
  }

  $body = $body.TrimStart("`r","`n"," ")

  [pscustomobject]@{
    FileRel = $fileRel
    Body    = $body
  }
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
  $logPath  = Join-Path "tools\logs" ("base44_save_$runStamp.log")

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

  $parsed = Parse-Base44Export -Text $raw
  $rel = Normalize-RelPath -Rel $parsed.FileRel

  $ext = [System.IO.Path]::GetExtension($rel)
  if ([string]::IsNullOrWhiteSpace($ext)) {
    $rel = $rel + $DefaultExt
  }

  $outRootFull = (Resolve-Path -LiteralPath $OutRoot).Path
  $outFile = Join-Path $outRootFull $rel
  $outDir  = Split-Path -Parent $outFile

  Write-LogLine -LogPath $logPath -Level "INFO" -Message "Target file: $outFile"
  Ensure-Dir -Path $outDir

  $backupDir = Join-Path $outRootFull ("tools\backup_{0}" -f $runStamp)
  Backup-IfExists -FilePath $outFile -BackupDir $backupDir -LogPath $logPath

  $lastBackupTxt = Join-Path $outRootFull "tools\LAST_BACKUP_DIR.txt"
  $utf8NoBom = New-Utf8NoBomEncoding
  [System.IO.File]::WriteAllText($lastBackupTxt, $backupDir, $utf8NoBom)
  Write-LogLine -LogPath $logPath -Level "INFO" -Message "Updated tools/LAST_BACKUP_DIR.txt -> $backupDir"

  [System.IO.File]::WriteAllText($outFile, $parsed.Body, $utf8NoBom)
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

  # write UTF-8 no BOM
  $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($target, $content, $utf8NoBom)

  Write-Host "[PASS] Installed -> $target" -ForegroundColor Green
  Write-Host "[INFO] Next run: powershell -ExecutionPolicy Bypass -File .\tools\save-base44-export.ps1" -ForegroundColor Cyan
  exit 0
}
catch {
  Write-Host "[FAIL] $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
