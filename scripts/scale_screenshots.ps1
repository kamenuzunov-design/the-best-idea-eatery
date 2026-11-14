Add-Type -AssemblyName System.Drawing

$srcDir = "c:\Users\KAMEH Y3YHOB\Documents\GitHub\the-best-idea-eatery\store-assets\kamen"
$dstDir = "c:\Users\KAMEH Y3YHOB\Documents\GitHub\the-best-idea-eatery\store-assets\kamen\ready"

if (-not (Test-Path $dstDir)) {
    New-Item -ItemType Directory -Path $dstDir | Out-Null
}

$targetW = 1080
$targetH = 2400

Get-ChildItem -Path $srcDir -Filter "*.png" | ForEach-Object {
    $srcImg = [System.Drawing.Image]::FromFile($_.FullName)
    
    # Scale smoothly to 1080x2400 (aspect ratio 2.22, strictly allowed by Google Play <= 2.3)
    $bmp = [System.Drawing.Bitmap]::new($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    $g.DrawImage($srcImg, [System.Drawing.Rectangle]::new(0, 0, $targetW, $targetH), [System.Drawing.Rectangle]::new(0, 0, $srcImg.Width, $srcImg.Height), [System.Drawing.GraphicsUnit]::Pixel)
    
    $outPath = Join-Path $dstDir $_.Name
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $g.Dispose()
    $bmp.Dispose()
    $srcImg.Dispose()
    
    Write-Output "SCALED: $outPath (1080x2400)"
}
