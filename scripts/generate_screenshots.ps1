$outDir = "c:\Users\KAMEH Y3YHOB\Documents\GitHub\the-best-idea-eatery\store-assets"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

Add-Type -AssemblyName System.Drawing

$screenWidth = 1080
$screenHeight = 2400

function Get-RoundedRectanglePath {
    param(
        [System.Drawing.Rectangle]$rect,
        [int]$radius
    )
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $diameter = $radius * 2
    $arc = [System.Drawing.Rectangle]::new($rect.X, $rect.Y, $diameter, $diameter)
    
    $path.AddArc($arc, 180, 90)
    $arc.X = $rect.Right - $diameter
    $path.AddArc($arc, 270, 90)
    $arc.Y = $rect.Bottom - $diameter
    $path.AddArc($arc, 0, 90)
    $arc.X = $rect.Left
    $path.AddArc($arc, 90, 90)
    $path.CloseFigure()
    return $path
}

# =============================================================
# SCREENSHOT 1: НАЧАЛО & 330+ РЕЦЕПТИ
# =============================================================
$bmp1 = [System.Drawing.Bitmap]::new($screenWidth, $screenHeight, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g1 = [System.Drawing.Graphics]::FromImage($bmp1)
$g1.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g1.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$bgRect = [System.Drawing.Rectangle]::new(0, 0, $screenWidth, $screenHeight)
$bgBrush1 = [System.Drawing.Drawing2D.LinearGradientBrush]::new($bgRect, `
    [System.Drawing.Color]::FromArgb(26, 18, 14), `
    [System.Drawing.Color]::FromArgb(44, 26, 18), `
    90.0)
$g1.FillRectangle($bgBrush1, $bgRect)
$bgBrush1.Dispose()

# Fonts
$fSuper = [System.Drawing.Font]::new("Segoe UI", 48.0, [System.Drawing.FontStyle]::Bold)
$fSub   = [System.Drawing.Font]::new("Segoe UI", 24.0, [System.Drawing.FontStyle]::Regular)
$fAppH  = [System.Drawing.Font]::new("Segoe UI", 26.0, [System.Drawing.FontStyle]::Bold)
$fTitle = [System.Drawing.Font]::new("Segoe UI", 24.0, [System.Drawing.FontStyle]::Bold)
$fText  = [System.Drawing.Font]::new("Segoe UI", 18.0, [System.Drawing.FontStyle]::Regular)
$fMeta  = [System.Drawing.Font]::new("Segoe UI", 16.0, [System.Drawing.FontStyle]::Bold)
$fStat  = [System.Drawing.Font]::new("Segoe UI", 16.0, [System.Drawing.FontStyle]::Bold)

# Brushes
$bWhite = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$bGold  = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(245, 158, 11))
$bDark  = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(31, 41, 55))
$bGray  = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(107, 114, 128))
$bAmber = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(217, 119, 6))

# Top Copy
$g1.DrawString("330+ ИЗПИТАНИ РЕЦЕПТИ", $fSuper, $bWhite, 70.0, 100.0)
$g1.DrawString("Кулинарно вдъхновение с филтри, калории и лесни стъпки", $fSub, $bGold, 70.0, 180.0)

# Phone frame
$phoneX = 80; $phoneY = 260; $phoneW = 920; $phoneH = 2050
$phoneRect = [System.Drawing.Rectangle]::new($phoneX, $phoneY, $phoneW, $phoneH)
$phonePath = Get-RoundedRectanglePath $phoneRect 55

$sBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(120, 0, 0, 0))
$sRect = [System.Drawing.Rectangle]::new(($phoneX - 8), ($phoneY + 12), ($phoneW + 16), $phoneH)
$sPath = Get-RoundedRectanglePath $sRect 55
$g1.FillPath($sBrush, $sPath)
$sBrush.Dispose(); $sPath.Dispose()

$pScreenBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(249, 250, 251))
$g1.FillPath($pScreenBrush, $phonePath)

$bezelPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(220, 75, 85, 99), 8.0)
$g1.DrawPath($bezelPen, $phonePath)

# Status bar
$g1.DrawString("12:45", $fStat, $bDark, 130.0, 280.0)
$g1.DrawString("📶 5G  🔋 98%", $fStat, $bDark, 850.0, 280.0)

# App Header
$g1.DrawString("The Best Idea Eatery", $fAppH, $bDark, 130.0, 330.0)
$g1.DrawString("🇬🇧 🇪🇸 🇮🇹 🇫🇷 🇩🇪 🇧🇬", $fText, $bGray, 750.0, 335.0)

# Search
$searchRect = [System.Drawing.Rectangle]::new(130, 400, 820, 75)
$searchPath = Get-RoundedRectanglePath $searchRect 20
$searchBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(229, 231, 235), 2.0)
$g1.FillPath($searchBg, $searchPath)
$g1.DrawPath($borderPen, $searchPath)
$g1.DrawString("🔍  Търси рецепта, съставка, кухня...", $fText, $bGray, 160.0, 422.0)
$searchBg.Dispose(); $searchPath.Dispose()

# Categories
$cats = @("Всички", "Най-нови", "Бързи", "Любими", "Топ 12")
$cx = 130
foreach ($cat in $cats) {
    $cRect = [System.Drawing.Rectangle]::new($cx, 500, 150, 55)
    $cPath = Get-RoundedRectanglePath $cRect 16
    $cBg = if ($cat -eq "Всички") { [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(234, 88, 12)) } else { [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White) }
    $cTextCol = if ($cat -eq "Всички") { $bWhite } else { $bDark }
    $g1.FillPath($cBg, $cPath)
    $g1.DrawString($cat, $fMeta, $cTextCol, [float]($cx + 25), 516.0)
    $cBg.Dispose(); $cPath.Dispose()
    $cx += 165
}

# Recipe 1 Card
$card1Rect = [System.Drawing.Rectangle]::new(130, 580, 820, 720)
$card1Path = Get-RoundedRectanglePath $card1Rect 28
$cardBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$g1.FillPath($cardBg, $card1Path)
$g1.DrawPath($borderPen, $card1Path)

$img1Rect = [System.Drawing.Rectangle]::new(130, 580, 820, 420)
$img1Brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($img1Rect, [System.Drawing.Color]::FromArgb(180, 83, 9), [System.Drawing.Color]::FromArgb(234, 88, 12), 45.0)
$g1.FillRectangle($img1Brush, $img1Rect)
$img1Brush.Dispose()

$tagRect = [System.Drawing.Rectangle]::new(160, 610, 200, 45)
$tagPath = Get-RoundedRectanglePath $tagRect 12
$tagBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(200, 0, 0, 0))
$g1.FillPath($tagBg, $tagPath)
$g1.DrawString("Българска кухня", $fMeta, $bWhite, 175.0, 620.0)
$tagBg.Dispose(); $tagPath.Dispose()

$g1.DrawString("Традиционна вита българска баница", $fTitle, $bDark, 160.0, 1030.0)
$g1.DrawString("Хрупкави точени кори със сирене, яйца и истинско масло.", $fText, $bGray, 160.0, 1080.0)
$g1.DrawString("⏱ 45 мин   •   👥 6 порции   •   ⭐ 4.9   •   🔥 340 kcal", $fMeta, $bAmber, 160.0, 1130.0)
$card1Path.Dispose()

# Recipe 2 Card
$card2Rect = [System.Drawing.Rectangle]::new(130, 1330, 820, 720)
$card2Path = Get-RoundedRectanglePath $card2Rect 28
$g1.FillPath($cardBg, $card2Path)
$g1.DrawPath($borderPen, $card2Path)

$img2Rect = [System.Drawing.Rectangle]::new(130, 1330, 820, 420)
$img2Brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($img2Rect, [System.Drawing.Color]::FromArgb(15, 118, 110), [System.Drawing.Color]::FromArgb(20, 184, 166), 45.0)
$g1.FillRectangle($img2Brush, $img2Rect)
$img2Brush.Dispose()

$g1.DrawString("Крехко свинско на тиган с розмарин", $fTitle, $bDark, 160.0, 1780.0)
$g1.DrawString("⏱ 30 мин   •   👥 4 порции   •   ⭐ 4.8   •   🔥 480 kcal", $fMeta, $bAmber, 160.0, 1840.0)
$card2Path.Dispose()
$cardBg.Dispose()

# Bottom Nav
$navRect = [System.Drawing.Rectangle]::new(130, 2170, 820, 110)
$navBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$g1.FillRectangle($navBg, $navRect)
$g1.DrawLine($borderPen, 130, 2170, 950, 2170)
$g1.DrawString("🏠 Начало    🥫 Килер    🤖 AI Шеф    ⭐ Любими    👤 Профил", $fMeta, $bDark, 160.0, 2205.0)
$navBg.Dispose()

$phonePath.Dispose()
$pScreenBrush.Dispose()
$bezelPen.Dispose()
$borderPen.Dispose()

$path1 = Join-Path $outDir "screenshot-1-catalog.png"
$bmp1.Save($path1, [System.Drawing.Imaging.ImageFormat]::Png)
$g1.Dispose(); $bmp1.Dispose()
Write-Output "CREATED: $path1"


# =============================================================
# SCREENSHOT 2: РЕЖИМ „ГОТВЕНЕ С МРЪСНИ РЪЦЕ“ (COOKING MODE)
# =============================================================
$bmp2 = [System.Drawing.Bitmap]::new($screenWidth, $screenHeight, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g2 = [System.Drawing.Graphics]::FromImage($bmp2)
$g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g2.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$bgBrush2 = [System.Drawing.Drawing2D.LinearGradientBrush]::new($bgRect, `
    [System.Drawing.Color]::FromArgb(20, 20, 24), `
    [System.Drawing.Color]::FromArgb(35, 30, 40), `
    90.0)
$g2.FillRectangle($bgBrush2, $bgRect)
$bgBrush2.Dispose()

$g2.DrawString("ГОТВЕНЕ БЕЗ ДОКОСВАНЕ", $fSuper, $bWhite, 70.0, 100.0)
$g2.DrawString("Гласови команди на 6 езика, голям таймер и чекмедже за съставки", $fSub, $bGold, 70.0, 180.0)

$phonePath2 = Get-RoundedRectanglePath $phoneRect 55
$sBrush2 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(120, 0, 0, 0))
$sPath2 = Get-RoundedRectanglePath $sRect 55
$g2.FillPath($sBrush2, $sPath2)
$sBrush2.Dispose(); $sPath2.Dispose()

$phoneDarkBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(17, 24, 39))
$g2.FillPath($phoneDarkBrush, $phonePath2)
$bezelPen2 = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(220, 75, 85, 99), 8.0)
$g2.DrawPath($bezelPen2, $phonePath2)

$g2.DrawString("12:45", $fStat, $bWhite, 130.0, 280.0)
$g2.DrawString("📶 5G  🔋 98%", $fStat, $bWhite, 850.0, 280.0)

$g2.DrawString("👨‍🍳  Режим Готвене: Баница", $fAppH, $bWhite, 130.0, 340.0)

# Voice Active Banner
$voiceRect = [System.Drawing.Rectangle]::new(130, 420, 820, 110)
$voicePath = Get-RoundedRectanglePath $voiceRect 24
$voiceBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(30, 58, 138))
$voiceBorder = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(96, 165, 250), 2.5)
$g2.FillPath($voiceBg, $voicePath)
$g2.DrawPath($voiceBorder, $voicePath)
$bVoiceLight = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(147, 197, 253))
$g2.DrawString("🎙️  Гласов контрол: АКТИВЕН", $fTitle, $bVoiceLight, 160.0, 440.0)
$g2.DrawString("Кажете: Следваща, Назад, Старт таймер, Съставки", $fText, $bWhite, 160.0, 485.0)
$voiceBg.Dispose(); $voiceBorder.Dispose(); $voicePath.Dispose(); $bVoiceLight.Dispose()

# Timer Circle
$timerPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(234, 88, 12), 12.0)
$g2.DrawEllipse($timerPen, 390, 600, 300, 300)
$timerFont = [System.Drawing.Font]::new("Segoe UI", 56.0, [System.Drawing.FontStyle]::Bold)
$g2.DrawString("15:00", $timerFont, $bWhite, 415.0, 690.0)
$timerFont.Dispose(); $timerPen.Dispose()

$timerBtnRect = [System.Drawing.Rectangle]::new(440, 930, 200, 60)
$timerBtnPath = Get-RoundedRectanglePath $timerBtnRect 18
$timerBtnBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(234, 88, 12))
$g2.FillPath($timerBtnBg, $timerBtnPath)
$g2.DrawString("⏸ Пауза", $fTitle, $bWhite, 480.0, 942.0)
$timerBtnBg.Dispose(); $timerBtnPath.Dispose()

# Step Card
$stepCardRect = [System.Drawing.Rectangle]::new(130, 1040, 820, 650)
$stepCardPath = Get-RoundedRectanglePath $stepCardRect 30
$stepCardBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(31, 41, 55))
$stepCardBorder = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(75, 85, 99), 2.0)
$g2.FillPath($stepCardBg, $stepCardPath)
$g2.DrawPath($stepCardBorder, $stepCardPath)

$g2.DrawString("СТЪПКА 3 ОТ 6", $fMeta, $bGold, 160.0, 1070.0)
$stepTitleFont = [System.Drawing.Font]::new("Segoe UI", 30.0, [System.Drawing.FontStyle]::Bold)
$g2.DrawString("Навиване и подреждане в тавата", $stepTitleFont, $bWhite, 160.0, 1110.0)
$stepTitleFont.Dispose()

$stepBody = "Вземете две кори, поръсете с 3 супени лъжици от плънката с яйца и сирене. Поръсете с малко разтопено масло и завийте на руло откъм тясната страна. Подредете охлювовидно в тавата."
$bodyFont = [System.Drawing.Font]::new("Segoe UI", 22.0, [System.Drawing.FontStyle]::Regular)
$bSubLight = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(209, 213, 219))
$bodyRect = [System.Drawing.RectangleF]::new(160, 1190, 760, 300)
$g2.DrawString($stepBody, $bodyFont, $bSubLight, $bodyRect)
$bodyFont.Dispose(); $bSubLight.Dispose()

$drawerBtnRect = [System.Drawing.Rectangle]::new(160, 1530, 760, 80)
$drawerBtnPath = Get-RoundedRectanglePath $drawerBtnRect 20
$drawerBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(55, 65, 81))
$g2.FillPath($drawerBg, $drawerBtnPath)
$g2.DrawString("📋  Отвори чекмедже със съставките за тази стъпка", $fTitle, $bWhite, 190.0, 1552.0)
$drawerBg.Dispose(); $drawerBtnPath.Dispose()

# Prev / Next
$prevBtnRect = [System.Drawing.Rectangle]::new(130, 1730, 390, 100)
$prevBtnPath = Get-RoundedRectanglePath $prevBtnRect 24
$btnGrayBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(55, 65, 81))
$g2.FillPath($btnGrayBg, $prevBtnPath)
$g2.DrawString("◀  Назад", $fTitle, $bWhite, 260.0, 1762.0)
$btnGrayBg.Dispose(); $prevBtnPath.Dispose()

$nextBtnRect = [System.Drawing.Rectangle]::new(560, 1730, 390, 100)
$nextBtnPath = Get-RoundedRectanglePath $nextBtnRect 24
$btnOrangeBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(234, 88, 12))
$g2.FillPath($btnOrangeBg, $nextBtnPath)
$g2.DrawString("Следваща  ▶", $fTitle, $bWhite, 660.0, 1762.0)
$btnOrangeBg.Dispose(); $nextBtnPath.Dispose()

$phonePath2.Dispose(); $bezelPen2.Dispose(); $phoneDarkBrush.Dispose()
$stepCardPath.Dispose(); $stepCardBg.Dispose(); $stepCardBorder.Dispose()

$path2 = Join-Path $outDir "screenshot-2-cooking.png"
$bmp2.Save($path2, [System.Drawing.Imaging.ImageFormat]::Png)
$g2.Dispose(); $bmp2.Dispose()
Write-Output "CREATED: $path2"


# =============================================================
# SCREENSHOT 3: ИНТЕЛИГЕНТЕН КИЛЕР (ZERO-WASTE PANTRY)
# =============================================================
$bmp3 = [System.Drawing.Bitmap]::new($screenWidth, $screenHeight, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g3 = [System.Drawing.Graphics]::FromImage($bmp3)
$g3.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g3.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$bgBrush3 = [System.Drawing.Drawing2D.LinearGradientBrush]::new($bgRect, `
    [System.Drawing.Color]::FromArgb(15, 30, 25), `
    [System.Drawing.Color]::FromArgb(20, 45, 35), `
    90.0)
$g3.FillRectangle($bgBrush3, $bgRect)
$bgBrush3.Dispose()

$bEmerald = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(52, 211, 153))
$bRed     = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(239, 68, 68))
$bGreen   = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(16, 185, 129))

$g3.DrawString("ИНТЕЛИГЕНТЕН КИЛЕР", $fSuper, $bWhite, 70.0, 100.0)
$g3.DrawString("Следене на срока на годност & Zero-Waste рецепти с 1 клик", $fSub, $bEmerald, 70.0, 180.0)

$phonePath3 = Get-RoundedRectanglePath $phoneRect 55
$sBrush3 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(120, 0, 0, 0))
$sPath3 = Get-RoundedRectanglePath $sRect 55
$g3.FillPath($sBrush3, $sPath3)
$sBrush3.Dispose(); $sPath3.Dispose()

$pScreenBrush3 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(249, 250, 251))
$g3.FillPath($pScreenBrush3, $phonePath3)
$bezelPen3 = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(220, 75, 85, 99), 8.0)
$g3.DrawPath($bezelPen3, $phonePath3)

$g3.DrawString("12:45", $fStat, $bDark, 130.0, 280.0)
$g3.DrawString("📶 5G  🔋 98%", $fStat, $bDark, 850.0, 280.0)

$g3.DrawString("Моят Килер (18 Налични Продукта)", $fAppH, $bDark, 130.0, 340.0)

# Alert
$alertRect = [System.Drawing.Rectangle]::new(130, 410, 820, 230)
$alertPath = Get-RoundedRectanglePath $alertRect 24
$alertBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(254, 243, 199))
$alertBorder = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(245, 158, 11), 2.5)
$g3.FillPath($alertBg, $alertPath)
$g3.DrawPath($alertBorder, $alertPath)

$bAmberDark = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(180, 83, 9))
$g3.DrawString("⚠️  Внимание: 2 продукта изтичат скоро!", $fTitle, $bAmberDark, 160.0, 435.0)
$g3.DrawString("Краве масло и прясно мляко изтичат в следващите 48 часа.", $fText, $bDark, 160.0, 480.0)
$bAmberDark.Dispose()

$saveBtnRect = [System.Drawing.Rectangle]::new(160, 530, 400, 70)
$saveBtnPath = Get-RoundedRectanglePath $saveBtnRect 16
$saveBtnBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(217, 119, 6))
$g3.FillPath($saveBtnBg, $saveBtnPath)
$g3.DrawString("⚡ Спаси с рецепта (5 идеи)", $fMeta, $bWhite, 195.0, 552.0)
$saveBtnBg.Dispose(); $saveBtnPath.Dispose(); $alertBg.Dispose(); $alertBorder.Dispose(); $alertPath.Dispose()

$pItems = @(
    @{ Name = "Краве масло (82%)"; Qty = "250 гр"; Days = "Остава 1 ден"; Col = $bRed },
    @{ Name = "Прясно краве мляко"; Qty = "1 л"; Days = "Остават 2 дни"; Col = $bAmber },
    @{ Name = "Яйца (размер L)"; Qty = "10 бр"; Days = "Остава 1 седмица"; Col = $bGreen },
    @{ Name = "Брашно тип 500"; Qty = "1.5 кг"; Days = "Остава 1 месец"; Col = $bGreen },
    @{ Name = "Бяло саламурено сирене"; Qty = "400 гр"; Days = "Остават 5 дни"; Col = $bAmber }
)

$piY = 670
$borderPen3 = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(229, 231, 235), 2.0)
foreach ($item in $pItems) {
    $itemRect = [System.Drawing.Rectangle]::new(130, $piY, 820, 115)
    $itemPath = Get-RoundedRectanglePath $itemRect 20
    $iBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
    $g3.FillPath($iBg, $itemPath)
    $g3.DrawPath($borderPen3, $itemPath)
    
    $g3.DrawString($item.Name, $fTitle, $bDark, 160.0, [float]($piY + 22))
    $g3.DrawString($item.Qty, $fText, $bGray, 160.0, [float]($piY + 65))
    $g3.DrawString($item.Days, $fMeta, $item.Col, 680.0, [float]($piY + 42))
    
    $iBg.Dispose(); $itemPath.Dispose()
    $piY += 135
}

$addBtnRect = [System.Drawing.Rectangle]::new(130, 1400, 820, 95)
$addBtnPath = Get-RoundedRectanglePath $addBtnRect 24
$addBtnBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(16, 185, 129))
$g3.FillPath($addBtnBg, $addBtnPath)
$g3.DrawString("📷  Снимай касова бележка / Добави продукт", $fTitle, $bWhite, 220.0, 1430.0)
$addBtnBg.Dispose(); $addBtnPath.Dispose()

# Nav
$navBg3 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$g3.FillRectangle($navBg3, $navRect)
$g3.DrawLine($borderPen3, 130, 2170, 950, 2170)
$g3.DrawString("🏠 Начало    🥫 Килер    🤖 AI Шеф    ⭐ Любими    👤 Профил", $fMeta, $bDark, 160.0, 2205.0)
$navBg3.Dispose()

$phonePath3.Dispose(); $pScreenBrush3.Dispose(); $bezelPen3.Dispose(); $borderPen3.Dispose()
$bEmerald.Dispose(); $bRed.Dispose(); $bGreen.Dispose()

$path3 = Join-Path $outDir "screenshot-3-pantry.png"
$bmp3.Save($path3, [System.Drawing.Imaging.ImageFormat]::Png)
$g3.Dispose(); $bmp3.Dispose()
Write-Output "CREATED: $path3"


# =============================================================
# SCREENSHOT 4: КУЛИНАРЕН AI ШЕФ & СКЕНЕР (AI CHEF & SCANNER)
# =============================================================
$bmp4 = [System.Drawing.Bitmap]::new($screenWidth, $screenHeight, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g4 = [System.Drawing.Graphics]::FromImage($bmp4)
$g4.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g4.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$bgBrush4 = [System.Drawing.Drawing2D.LinearGradientBrush]::new($bgRect, `
    [System.Drawing.Color]::FromArgb(24, 18, 36), `
    [System.Drawing.Color]::FromArgb(40, 24, 60), `
    90.0)
$g4.FillRectangle($bgBrush4, $bgRect)
$bgBrush4.Dispose()

$bPurpleLight = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(192, 132, 252))
$bPurpleDark  = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(126, 34, 206))

$g4.DrawString("КУЛИНАРЕН AI ШЕФ", $fSuper, $bWhite, 70.0, 100.0)
$g4.DrawString("Скенер на продукти и персонален асистент за перфектни рецепти", $fSub, $bPurpleLight, 70.0, 180.0)

$phonePath4 = Get-RoundedRectanglePath $phoneRect 55
$sBrush4 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(120, 0, 0, 0))
$sPath4 = Get-RoundedRectanglePath $sRect 55
$g4.FillPath($sBrush4, $sPath4)
$sBrush4.Dispose(); $sPath4.Dispose()

$pScreenBrush4 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(249, 250, 251))
$g4.FillPath($pScreenBrush4, $phonePath4)
$bezelPen4 = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(220, 75, 85, 99), 8.0)
$g4.DrawPath($bezelPen4, $phonePath4)

$g4.DrawString("12:45", $fStat, $bDark, 130.0, 280.0)
$g4.DrawString("📶 5G  🔋 98%", $fStat, $bDark, 850.0, 280.0)

$g4.DrawString("🤖  AI Кулинарен Шеф", $fAppH, $bDark, 130.0, 340.0)

# User bubble
$uRect = [System.Drawing.Rectangle]::new(340, 420, 610, 140)
$uPath = Get-RoundedRectanglePath $uRect 24
$uBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(234, 88, 12))
$g4.FillPath($uBg, $uPath)
$uText = "Имам яйца, спанак и сирене. Какво мога да сготвя за 20 минути?"
$uRectF = [System.Drawing.RectangleF]::new(370, 445, 550, 100)
$g4.DrawString($uText, $fText, $bWhite, $uRectF)
$uBg.Dispose(); $uPath.Dispose()

# AI bubble
$aiRect = [System.Drawing.Rectangle]::new(130, 590, 820, 260)
$aiPath = Get-RoundedRectanglePath $aiRect 24
$aiBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$aiBorder = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(216, 180, 254), 2.0)
$g4.FillPath($aiBg, $aiPath)
$g4.DrawPath($aiBorder, $aiPath)

$g4.DrawString("👨‍🍳 The Best Idea AI Шеф:", $fMeta, $bPurpleDark, 160.0, 615.0)
$aiText = "Чудесна комбинация! Препоръчвам ви Пухкав селски омлет със спанак и запечено сирене. Приготвя се за точно 15 минути, има високо съдържание на протеини и оползотворява перфектно пресния спанак!"
$aiRectF = [System.Drawing.RectangleF]::new(160, 660, 760, 170)
$g4.DrawString($aiText, $fText, $bDark, $aiRectF)
$aiBg.Dispose(); $aiBorder.Dispose(); $aiPath.Dispose()

# Recommended Recipe Card
$recCardRect = [System.Drawing.Rectangle]::new(130, 880, 820, 520)
$recCardPath = Get-RoundedRectanglePath $recCardRect 28
$recBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$borderPen4 = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(229, 231, 235), 2.0)
$g4.FillPath($recBg, $recCardPath)
$g4.DrawPath($borderPen4, $recCardPath)

$recImgRect = [System.Drawing.Rectangle]::new(130, 880, 820, 280)
$recImgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($recImgRect, [System.Drawing.Color]::FromArgb(126, 34, 206), [System.Drawing.Color]::FromArgb(192, 132, 252), 45.0)
$g4.FillRectangle($recImgBrush, $recImgRect)
$recImgBrush.Dispose()

$g4.DrawString("Селски омлет със спанак и сирене", $fTitle, $bDark, 160.0, 1180.0)
$g4.DrawString("⏱ 15 мин   •   👥 2 порции   •   🔥 290 kcal   •   ⭐ 5.0", $fMeta, $bAmber, 160.0, 1230.0)

$cookNowBtnRect = [System.Drawing.Rectangle]::new(160, 1290, 760, 80)
$cookNowBtnPath = Get-RoundedRectanglePath $cookNowBtnRect 20
$cookNowBtnBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(234, 88, 12))
$g4.FillPath($cookNowBtnBg, $cookNowBtnPath)
$g4.DrawString("🚀  Започни готвене сега", $fTitle, $bWhite, 360.0, 1312.0)
$cookNowBtnBg.Dispose(); $cookNowBtnPath.Dispose(); $recBg.Dispose(); $recCardPath.Dispose()

# Scanner card
$scanCardRect = [System.Drawing.Rectangle]::new(130, 1430, 820, 220)
$scanCardPath = Get-RoundedRectanglePath $scanCardRect 24
$scanBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(243, 232, 255))
$scanBorder = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(192, 132, 252), 2.0)
$g4.FillPath($scanBg, $scanCardPath)
$g4.DrawPath($scanBorder, $scanCardPath)

$g4.DrawString("📷  Интелигентен Скенер на Продукти", $fTitle, $bPurpleDark, 160.0, 1460.0)
$g4.DrawString("Снимайте продуктите в хладилника или касова бележка. AI автоматично ги разпознава и попълва във вашия килер.", $fText, $bDark, [System.Drawing.RectangleF]::new(160, 1510, 760, 110))
$scanBg.Dispose(); $scanBorder.Dispose(); $scanCardPath.Dispose()

# Nav
$navBg4 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$g4.FillRectangle($navBg4, $navRect)
$g4.DrawLine($borderPen4, 130, 2170, 950, 2170)
$g4.DrawString("🏠 Начало    🥫 Килер    🤖 AI Шеф    ⭐ Любими    👤 Профил", $fMeta, $bDark, 160.0, 2205.0)
$navBg4.Dispose()

$phonePath4.Dispose(); $pScreenBrush4.Dispose(); $bezelPen4.Dispose(); $borderPen4.Dispose()
$bPurpleLight.Dispose(); $bPurpleDark.Dispose()

$path4 = Join-Path $outDir "screenshot-4-ai-chef.png"
$bmp4.Save($path4, [System.Drawing.Imaging.ImageFormat]::Png)
$g4.Dispose(); $bmp4.Dispose()
Write-Output "CREATED: $path4"

# Dispose Global fonts & brushes
$fSuper.Dispose(); $fSub.Dispose(); $fAppH.Dispose(); $fTitle.Dispose(); $fText.Dispose(); $fMeta.Dispose(); $fStat.Dispose()
$bWhite.Dispose(); $bGold.Dispose(); $bDark.Dispose(); $bGray.Dispose(); $bAmber.Dispose()

Write-Output "ALL_SCREENSHOTS_SUCCESSFULLY_GENERATED"
