# Base44 Browser Automation Script
# =================================
# ใช้ Selenium เพื่อดึง code จาก Base44 โดยอัตโนมัติ

Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Base44 Browser Automation Extractor      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ติดตั้ง Selenium
Write-Host "📦 กำลังติดตั้ง Selenium..." -ForegroundColor Cyan
if (-not (Get-Module -ListAvailable -Name Selenium)) {
    Install-Module -Name Selenium -Force -Scope CurrentUser
}

Import-Module Selenium

Write-Host "✅ ติดตั้งสำเร็จ!" -ForegroundColor Green
Write-Host ""

# ตั้งค่า
$outputDir = ".\Base44_Automated_Export"
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

# รายการไฟล์ที่ต้องการ export
$filesToExport = @(
    "pages/StaffOrders",
    "pages/Dashboard",
    "pages/Settings"
    # เพิ่มไฟล์อื่นๆ
)

Write-Host "📋 จำนวนไฟล์ที่จะ export: $($filesToExport.Count)" -ForegroundColor Yellow
Write-Host ""

# สร้าง Chrome driver
Write-Host "🌐 เปิด Chrome browser..." -ForegroundColor Cyan
$chromeOptions = New-Object OpenQA.Selenium.Chrome.ChromeOptions
$chromeOptions.AddArgument("--start-maximized")

try {
    $driver = New-Object OpenQA.Selenium.Chrome.ChromeDriver($chromeOptions)
    
    Write-Host "✅ Browser เปิดแล้ว!" -ForegroundColor Green
    Write-Host ""
    Write-Host "👉 กรุณา Login เข้า Base44 ในหน้าต่าง Chrome ที่เปิดขึ้นมา" -ForegroundColor Yellow
    Write-Host "   แล้วกลับมากด Enter ที่นี่..." -ForegroundColor Yellow
    Read-Host
    
    $baseUrl = "https://app.base44.com/apps/696e3af4e6d9b1c73b73cb75/editor/workspace/code"
    $exportedCount = 0
    
    foreach ($filePath in $filesToExport) {
        Write-Host "─────────────────────────────────────────────" -ForegroundColor DarkGray
        Write-Host "📄 กำลัง extract: $filePath" -ForegroundColor Cyan
        
        # Navigate to file
        $url = "$baseUrl`?filePath=$filePath"
        $driver.Navigate().GoToUrl($url)
        
        Start-Sleep -Seconds 3  # รอให้โหลดเสร็จ
        
        # Execute JavaScript to get code content
        $jsCode = @"
return (function() {
    // Try Monaco Editor first
    if (window.monaco && window.monaco.editor) {
        var models = window.monaco.editor.getModels();
        if (models && models.length > 0) {
            return models[0].getValue();
        }
    }
    
    // Try CodeMirror
    if (window.CodeMirror) {
        var cm = document.querySelector('.CodeMirror');
        if (cm && cm.CodeMirror) {
            return cm.CodeMirror.getValue();
        }
    }
    
    // Fallback: get text from view-lines
    var viewLines = document.querySelector('.view-lines');
    if (viewLines) {
        return viewLines.innerText;
    }
    
    return null;
})();
"@
        
        $codeContent = $driver.ExecuteScript($jsCode)
        
        if ($codeContent) {
            # บันทึกไฟล์
            $fileName = $filePath -replace '/', '_'
            $fileName = $fileName + ".jsx"
            $savePath = Join-Path $outputDir $fileName
            
            $codeContent | Out-File -FilePath $savePath -Encoding UTF8
            
            $lineCount = ($codeContent -split "`n").Count
            $exportedCount++
            
            Write-Host "✅ Extracted: $fileName ($lineCount บรรทัด)" -ForegroundColor Green
        }
        else {
            Write-Host "❌ ไม่พบ code content" -ForegroundColor Red
        }
        
        Start-Sleep -Seconds 1
    }
    
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║      Automation Export สำเร็จ!            ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Export สำเร็จ: $exportedCount/$($filesToExport.Count) ไฟล์" -ForegroundColor Green
    Write-Host "📁 ไฟล์อยู่ที่: $outputDir" -ForegroundColor Cyan
    
}
catch {
    Write-Host "❌ เกิดข้อผิดพลาด: $_" -ForegroundColor Red
}
finally {
    if ($driver) {
        $closeDriver = Read-Host "ปิด browser ไหม? (y/n)"
        if ($closeDriver -eq 'y') {
            $driver.Quit()
        }
    }
}

Write-Host ""
$openFolder = Read-Host "เปิดโฟลเดอร์ไหม? (y/n)"
if ($openFolder -eq 'y') {
    Start-Process explorer.exe $outputDir
}