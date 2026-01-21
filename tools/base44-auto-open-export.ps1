# Base44 Manual Export Script (Free Plan)
# ========================================
# สำหรับ copy-paste code จาก Base44 Editor

$exportDir = ".\Base44_Export"
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$logFile = Join-Path $exportDir "export_log_$timestamp.txt"

# สร้างโฟลเดอร์
if (-not (Test-Path $exportDir)) {
    New-Item -ItemType Directory -Path $exportDir -Force | Out-Null
}

Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Base44 Manual Export Tool (Free Plan)   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "📁 Export directory: $exportDir" -ForegroundColor Green
Write-Host ""
Write-Host "📋 วิธีใช้งาน:" -ForegroundColor Yellow
Write-Host "   1. เปิดไฟล์ใน Base44 Editor" -ForegroundColor White
Write-Host "   2. กด Ctrl+A (Select All)" -ForegroundColor White
Write-Host "   3. กด Ctrl+C (Copy)" -ForegroundColor White
Write-Host "   4. กลับมาที่ Terminal นี้" -ForegroundColor White
Write-Host "   5. Paste code (Ctrl+V หรือ Right Click)" -ForegroundColor White
Write-Host "   6. พิมพ์ ### แล้วกด Enter (เพื่อจบ)" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tip: ถ้าไฟล์เยอะ แนะนำให้ export แค่ไฟล์สำคัญๆ ก่อน" -ForegroundColor Cyan
Write-Host ""

$exportedFiles = @()
$fileNumber = 0

while ($true) {
    $fileNumber++
    Write-Host "─────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "📄 File #$fileNumber" -ForegroundColor Cyan
    Write-Host ""
    
    # ถามชื่อไฟล์
    $fileName = Read-Host "ชื่อไฟล์ (เช่น pages/StaffOrders.jsx) หรือพิมพ์ 'done' เพื่อจบ"
    
    if ($fileName -eq 'done' -or [string]::IsNullOrWhiteSpace($fileName)) {
        break
    }
    
    # สร้าง subfolder ถ้ามี path
    $filePath = Join-Path $exportDir $fileName
    $fileDir = Split-Path -Parent $filePath
    
    if ($fileDir -and -not (Test-Path $fileDir)) {
        New-Item -ItemType Directory -Path $fileDir -Force | Out-Null
    }
    
    Write-Host ""
    Write-Host "✅ พร้อมรับ code สำหรับ: $fileName" -ForegroundColor Green
    Write-Host "📝 Paste code แล้วพิมพ์ ### ในบรรทัดใหม่ แล้วกด Enter:" -ForegroundColor Yellow
    Write-Host ""
    
    # รับ code
    $codeLines = @()
    $lineCount = 0
    
    while ($true) {
        $line = Read-Host
        
        if ($line -eq '###') {
            break
        }
        
        $codeLines += $line
        $lineCount++
        
        # แสดง progress ทุก 10 บรรทัด
        if ($lineCount % 10 -eq 0) {
            Write-Host "   ... $lineCount บรรทัด" -ForegroundColor DarkGray
        }
    }
    
    # บันทึกไฟล์
    if ($codeLines.Count -gt 0) {
        $codeLines | Out-File -FilePath $filePath -Encoding UTF8
        
        $fileInfo = Get-Item $filePath
        $fileSizeKB = [math]::Round($fileInfo.Length / 1KB, 2)
        
        Write-Host ""
        Write-Host "✅ บันทึกสำเร็จ!" -ForegroundColor Green
        Write-Host "   📄 ไฟล์: $fileName" -ForegroundColor White
        Write-Host "   📏 จำนวนบรรทัด: $lineCount" -ForegroundColor White
        Write-Host "   💾 ขนาด: $fileSizeKB KB" -ForegroundColor White
        
        $exportedFiles += [PSCustomObject]@{
            Number = $fileNumber
            FileName = $fileName
            Lines = $lineCount
            SizeKB = $fileSizeKB
            Path = $filePath
        }
        
        # บันทึก log
        "$timestamp - Exported: $fileName ($lineCount lines, $fileSizeKB KB)" | Out-File -FilePath $logFile -Append -Encoding UTF8
    }
    else {
        Write-Host "⚠️  ไม่พบ code - ข้าม" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

# สรุปผล
Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║           Export สำเร็จ!                  ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

if ($exportedFiles.Count -gt 0) {
    Write-Host "📊 สรุป Export:" -ForegroundColor Cyan
    Write-Host "   ✅ จำนวนไฟล์: $($exportedFiles.Count)" -ForegroundColor White
    Write-Host "   📏 รวมบรรทัด: $(($exportedFiles | Measure-Object -Property Lines -Sum).Sum)" -ForegroundColor White
    Write-Host "   💾 รวมขนาด: $(($exportedFiles | Measure-Object -Property SizeKB -Sum).Sum) KB" -ForegroundColor White
    Write-Host ""
    
    Write-Host "📋 รายการไฟล์ที่ Export:" -ForegroundColor Cyan
    $exportedFiles | Format-Table Number, FileName, Lines, SizeKB -AutoSize
    
    Write-Host ""
    Write-Host "📁 ไฟล์ทั้งหมดอยู่ที่: $exportDir" -ForegroundColor Green
    Write-Host "📝 Log file: $logFile" -ForegroundColor Gray
}
else {
    Write-Host "⚠️  ไม่มีไฟล์ถูก export" -ForegroundColor Yellow
}

Write-Host ""
$openFolder = Read-Host "ต้องการเปิดโฟลเดอร์ไหม? (y/n)"
if ($openFolder -eq 'y') {
    Start-Process explorer.exe $exportDir
}

Write-Host ""
Write-Host "✨ ขอบคุณที่ใช้ Base44 Export Tool!" -ForegroundColor Cyan