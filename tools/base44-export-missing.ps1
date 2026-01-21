function Save-FromClipboard {
  param(
    [Parameter(Mandatory=$true)][string]$RepoRoot,
    [Parameter(Mandatory=$true)][string]$BackupDir,
    [Parameter(Mandatory=$true)][string]$LogPath
  )

  # --- STEP 1: อ่านข้อมูลจาก clipboard ---
  $clip = Get-Clipboard -Raw
  if ([string]::IsNullOrWhiteSpace($clip)) {
    Write-LogLine -LogPath $LogPath -Level "FAIL" -Message "Clipboard is empty."
    exit 2
  }

  # ตรวจสอบรูปแบบว่าเป็น block ที่มี FILE:
  if ($clip -notmatch "(?m)^\s*FILE:\s*") {
    Write-LogLine -LogPath $LogPath -Level "FAIL" -Message "Clipboard has no 'FILE:' blocks."
    $headLen = [Math]::Min(250, $clip.Length)
    Write-LogLine -LogPath $LogPath -Level "INFO" -Message ("Clipboard head(250): " + ($clip.Substring(0, $headLen) -replace "`r",""))
    exit 3
  }

  # --- STEP 2: แยก block ทีละไฟล์ ---
  $items = Parse-ClipboardFileBlocks -Text $clip
  if (-not $items -or $items.Count -eq 0) {
    Write-LogLine -LogPath $LogPath -Level "FAIL" -Message "ParseClipboard returned 0 items."
    exit 4
  }

  Write-LogLine -LogPath $LogPath -Level "INFO" -Message ("Found FILE blocks: " + $items.Count)

  # --- STEP 3: เตรียม path ---
  $clientSrc = Join-Path $RepoRoot "client\src"
  if (-not (Test-Path -LiteralPath $clientSrc)) {
    throw "client\src not found: $clientSrc"
  }

  $written = 0
  $skipped = 0

  # --- STEP 4: เขียนไฟล์ทีละ block ---
  foreach ($it in $items) {
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

    # สำรองไฟล์เก่าก่อน
    Backup-FileIfExists -FilePath $dest -RepoRoot $RepoRoot -BackupDir $BackupDir -LogPath $LogPath

    # เขียนไฟล์ใหม่แบบ UTF8 no BOM
    try {
      [System.IO.File]::WriteAllText($dest, $it.Code, (New-Utf8NoBomEncoding))
      Write-LogLine -LogPath $LogPath -Level "PASS" -Message ("Wrote: client\src\" + $rel)
      $written++
    }
    catch {
      Write-LogLine -LogPath $LogPath -Level "FAIL" -Message ("Error writing file: client\src\" + $rel + " => " + $_.Exception.Message)
    }
  }

  # --- STEP 5: สรุปผล ---
  Write-LogLine -LogPath $LogPath -Level "INFO" -Message ("Skipped invalid blocks: " + $skipped)
  if ($written -le 0) {
    Write-LogLine -LogPath $LogPath -Level "FAIL" -Message "No files written (all FILE paths invalid or skipped)."
    exit 6
  }

  Write-LogLine -LogPath $LogPath -Level "PASS" -Message ("DONE. Files written: " + $written)
}
