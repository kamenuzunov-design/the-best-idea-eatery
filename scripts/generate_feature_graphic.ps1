$outDir = "c:\Users\KAMEH Y3YHOB\Documents\GitHub\the-best-idea-eatery\store-assets"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

Add-Type -AssemblyName System.Drawing

# -------------------------------------------------------------
# FEATURE GRAPHIC: 1024 x 500 px (English, 500+ Recipes, Balanced)
# -------------------------------------------------------------
$width = 1024
$height = 500
$bmp = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Background Gradient: Luxurious warm dark culinary background
$rect = [System.Drawing.Rectangle]::new(0, 0, $width, $height)
$brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, `
    [System.Drawing.Color]::FromArgb(20, 14, 10), `
    [System.Drawing.Color]::FromArgb(38, 20, 14), `
    45.0)
$g.FillRectangle($brush, $rect)
$brush.Dispose()

# Ambient warm radial glow
$glowPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
$glowPath.AddEllipse(220, -60, 780, 620)
$pbg = [System.Drawing.Drawing2D.PathGradientBrush]::new($glowPath)
$pbg.CenterColor = [System.Drawing.Color]::FromArgb(85, 234, 88, 12)
$pbg.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 20, 14, 10))
$g.FillPath($pbg, $glowPath)
$glowPath.Dispose()
$pbg.Dispose()

# Elegant decorative accent curves
$accentPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(35, 245, 158, 11), 2.0)
$g.DrawEllipse($accentPen, -80, -80, 420, 420)
$g.DrawEllipse($accentPen, 820, 240, 320, 320)
$accentPen.Dispose()

# Load App Icon (512x512)
$iconPath = "c:\Users\KAMEH Y3YHOB\Documents\GitHub\the-best-idea-eatery\twa-build\store_icon.png"
if (Test-Path $iconPath) {
    $iconImg = [System.Drawing.Image]::FromFile($iconPath)
    
    $iconX = 60
    $iconY = 105
    $iconSize = 280
    
    # Soft drop shadow
    for ($s = 18; $s -gt 0; $s--) {
        $shadowColor = [System.Drawing.Color]::FromArgb([int](2.5 * (19 - $s)), 0, 0, 0)
        $sBrush = [System.Drawing.SolidBrush]::new($shadowColor)
        $g.FillEllipse($sBrush, ($iconX - $s + 12), ($iconY - $s + 18), ($iconSize + $s * 2), ($iconSize + $s * 2))
        $sBrush.Dispose()
    }
    
    # Draw circular icon
    $g.DrawImage($iconImg, $iconX, $iconY, $iconSize, $iconSize)
    
    # Outer refined gold ring
    $ringPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(210, 245, 158, 11), 3.5)
    $g.DrawEllipse($ringPen, $iconX, $iconY, $iconSize, $iconSize)
    $ringPen.Dispose()
    
    $iconImg.Dispose()
}

# Fonts
$titleFont   = [System.Drawing.Font]::new("Segoe UI", 37.0, [System.Drawing.FontStyle]::Bold)
$taglineFont = [System.Drawing.Font]::new("Segoe UI", 18.0, [System.Drawing.FontStyle]::Bold)
$descFont    = [System.Drawing.Font]::new("Segoe UI", 13.0, [System.Drawing.FontStyle]::Regular)
$badgeFont   = [System.Drawing.Font]::new("Segoe UI", 11.5, [System.Drawing.FontStyle]::Bold)

# Brushes
$goldBrush  = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(245, 158, 11))
$whiteBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$subBrush   = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(214, 211, 209))

$textX = 375.0

# 1. Title
$g.DrawString("The Best Idea Eatery", $titleFont, $whiteBrush, $textX, 85.0)

# 2. Tagline (English)
$g.DrawString("Intelligent Culinary Assistant & AI Chef", $taglineFont, $goldBrush, $textX, 155.0)

# 3. Sub-benefit (English, 500+ recipes)
$g.DrawString("Over 500 tested recipes, zero-waste pantry & hands-free cooking", $descFont, $subBrush, $textX, 200.0)

# 4. Perfectly Balanced Badges (2 rows of 3 badges = 6 total)
$row1 = @("500+ Recipes", "Culinary AI Chef", "Smart Pantry")
$row2 = @("Hands-Free Voice", "Zero-Waste Ideas", "6 Languages")

# Helper function to draw a row of badges
function Draw-BadgeRow {
    param(
        [string[]]$items,
        [float]$startY
    )
    $startX = 375
    $spacing = 14
    $currentX = $startX
    
    foreach ($item in $items) {
        $size = $g.MeasureString($item, $badgeFont)
        $bw = [int]$size.Width + 26
        $bh = 40
        
        $bRect = [System.Drawing.Rectangle]::new($currentX, [int]$startY, $bw, $bh)
        
        # Background
        $bgB = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(55, 255, 255, 255))
        $g.FillRectangle($bgB, $bRect)
        $bgB.Dispose()
        
        # Border
        $bPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(140, 245, 158, 11), 1.5)
        $g.DrawRectangle($bPen, $bRect)
        $bPen.Dispose()
        
        # Text
        $g.DrawString($item, $badgeFont, $whiteBrush, [float]($currentX + 13), [float]($startY + 9))
        
        $currentX += $bw + $spacing
    }
}

Draw-BadgeRow $row1 265.0
Draw-BadgeRow $row2 320.0

# Bottom accent gradient bar
$barRect = [System.Drawing.Rectangle]::new(0, 490, $width, 10)
$barBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($barRect, `
    [System.Drawing.Color]::FromArgb(234, 88, 12), `
    [System.Drawing.Color]::FromArgb(245, 158, 11), `
    0.0)
$g.FillRectangle($barBrush, $barRect)
$barBrush.Dispose()

# Save Feature Graphic
$featurePath = Join-Path $outDir "feature-graphic.png"
$bmp.Save($featurePath, [System.Drawing.Imaging.ImageFormat]::Png)

$titleFont.Dispose()
$taglineFont.Dispose()
$descFont.Dispose()
$badgeFont.Dispose()
$goldBrush.Dispose()
$whiteBrush.Dispose()
$subBrush.Dispose()
$g.Dispose()
$bmp.Dispose()

Write-Output "SUCCESS: $featurePath"
