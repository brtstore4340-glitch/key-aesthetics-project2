# กำหนด path
$sourcePath = "D:\01 Main Work\Boots\Keys-Pro\client\src"
$destinationPath = "D:\01 Main Work\Boots\Keys-Pro\client\src\B444"

# สร้าง folder B444 ถ้ายังไม่มี
if (-not (Test-Path $destinationPath)) {
    New-Item -Path $destinationPath -ItemType Directory -Force | Out-Null
    Write-Host "✓ สร้าง folder B444 เรียบร้อย" -ForegroundColor Green
}

# รายการไฟล์ที่ต้องการ copy (ตามข้อมูลจริงจากเว็บ)
$filesToCopy = @(
    "Pages\AccountingOrders",
    "Pages\AdminCategories",
    "Pages\AdminOrders",
    "Pages\AdminProducts",
    "Pages\AdminUsers",
    "Pages\CreateOrder",
    "Pages\StaffDashboard",
    "Pages\StaffOrders",
    "Pages\AccountingDashboard",
    "Pages\AdminDashboard",
    "Pages\StaffSelection",
    "Components\UserNotRegisteredError",
    "Components\ui\progress",
    "Components\ui\select",
    "Components\ui\chart",
    "Components\ui\carousel",
    "Components\ui\separator",
    "Components\ui\sonner",
    "Components\ui\toaster",
    "Components\ui\slider",
    "Components\ui\label",
    "Components\ui\context-menu",
    "Components\ui\alert-dialog",
    "Components\ui\toggle",
    "Components\ui\badge",
    "Components\ui\hover-card",
    "Components\ui\input",
    "Components\ui\popover",
    "Components\ui\tooltip",
    "Components\ui\menubar",
    "Components\ui\use-toast",
    "Components\ui\checkbox",
    "Components\ui\sidebar",
    "Components\ui\skeleton",
    "Components\ui\alert",
    "Components\ui\tabs",
    "Components\ui\button",
    "Components\ui\aspect-ratio",
    "Components\ui\card",
    "Components\ui\sheet",
    "Components\ui\accordion",
    "Components\ui\command",
    "Components\ui\table",
    "Components\ui\navigation-menu",
    "Components\ui\drawer",
    "Components\ui\toast",
    "Components\ui\dialog",
    "Components\ui\switch",
    "Components\ui\toggle-group",
    "Components\ui\breadcrumb",
    "Components\ui\input-otp",
    "Components\ui\dropdown-menu",
    "Components\ui\form",
    "Components\ui\resizable",
    "Components\ui\radio-group",
    "Components\ui\calendar",
    "Components\ui\collapsible",
    "Components\ui\pagination",
    "Components\ui\textarea",
    "Components\ui\avatar",
    "Components\ui\scroll-area",
    "Components\ui\FloatingParticles",
    "Components\ui\GlassButton",
    "Components\ui\GlassCard",
    "Components\ui\GlassInput",
    "Components\ui\GlassUpload",
    "Components\auth\UserGrid",
    "Components\auth\PinPad",
    "Components\layout\DashboardLayout",
    "Entities\ProductCategory",
    "Entities\Product",
    "Entities\Order"
)

Write-Host "========== เริ่มต้น Copy ไฟล์ ==========" -ForegroundColor Cyan
Write-Host ""

# ตัวแปรสำหรับเก็บสถิติ
$copiedCount = 0
$notFoundFiles = @()
$copiedFiles = @()

# Loop ผ่านแต่ละไฟล์
foreach ($file in $filesToCopy) {
    # ลองหา extension ที่เป็นไปได้
    $extensions = @(".tsx", ".ts", ".jsx", ".js")
    $found = $false
    
    foreach ($ext in $extensions) {
        $sourceFile = Join-Path $sourcePath "$file$ext"
        
        if (Test-Path $sourceFile) {
            # สร้าง subfolder ใน B444 ถ้าจำเป็น
            $destFile = Join-Path $destinationPath "$file$ext"
            $destDir = Split-Path $destFile -Parent
            
            if (-not (Test-Path $destDir)) {
                New-Item -Path $destDir -ItemType Directory -Force | Out-Null
            }
            
            # Copy file
            Copy-Item -Path $sourceFile -Destination $destFile -Force
            
            $fileInfo = Get-Item $sourceFile
            $copiedFiles += [PSCustomObject]@{
                FileName = "$file$ext"
                Size = "{0:N0}" -f $fileInfo.Length
                Path = $file
            }
            
            Write-Host "✓ Copied: $file$ext" -ForegroundColor Green
            $copiedCount++
            $found = $true
            break
        }
    }
    
    if (-not $found) {
        $notFoundFiles += $file
        Write-Host "✗ Not found: $file" -ForegroundColor Red
    }
}

# แสดงสรุปผล
Write-Host ""
Write-Host "========== สรุปผลการ Copy ==========" -ForegroundColor Cyan
Write-Host "จำนวนไฟล์ที่ Copy สำเร็จ: $copiedCount" -ForegroundColor Green
Write-Host "จำนวนไฟล์ที่ไม่พบ: $($notFoundFiles.Count)" -ForegroundColor Yellow

# แสดงรายละเอียดไฟล์ที่ Copy
if ($copiedFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "========== รายละเอียดไฟล์ที่ Copy ==========" -ForegroundColor Cyan
    
    # จัดกลุ่มตาม folder
    $grouped = $copiedFiles | Group-Object { $_.Path.Split('\')[0] }
    
    foreach ($group in $grouped) {
        Write-Host ""
        Write-Host "📁 $($group.Name): $($group.Count) ไฟล์" -ForegroundColor Yellow
        $group.Group | ForEach-Object {
            Write-Host "   ├─ $($_.FileName) ($($_.Size) bytes)" -ForegroundColor Gray
        }
    }
}

# แสดงไฟล์ที่ไม่พบ
if ($notFoundFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "========== รายการไฟล์ที่ไม่พบ ==========" -ForegroundColor Yellow
    $notFoundFiles | ForEach-Object { Write-Host "  ✗ $_" -ForegroundColor Red }
}

# สถิตินามสกุล
Write-Host ""
Write-Host "========== สถิตินามสกุลไฟล์ ==========" -ForegroundColor Cyan
$copiedFiles | ForEach-Object { 
    [System.IO.Path]::GetExtension($_.FileName) 
} | Group-Object | Sort-Object Count -Descending | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Count) ไฟล์" -ForegroundColor White
}

Write-Host ""
Write-Host "✅ เสร็จสิ้น! ไฟล์ทั้งหมดถูก copy ไปยัง:" -ForegroundColor Green
Write-Host "   $destinationPath" -ForegroundColor Cyan