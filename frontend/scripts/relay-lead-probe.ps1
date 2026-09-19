# Deterministic read-only probe of the frozen relay raster. No electrical mapping.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$relayAssetPath = Join-Path $PSScriptRoot '../public/assets/components/relay/relay.default.1x.png'
if ((Get-FileHash -LiteralPath $relayAssetPath -Algorithm SHA256).Hash.ToLower() -ne '81ad8a6c94f2e58851e0928f53c34d8edf79560f08a2749ad235869a05323aa3') {
    throw 'Frozen raster hash mismatch'
}
$relayBitmap = [System.Drawing.Bitmap]::new($relayAssetPath)
try {
    $relayBounds = @(288, 288, 0, 0)
    for ($relayY = 0; $relayY -lt $relayBitmap.Height; $relayY++) {
        for ($relayX = 0; $relayX -lt $relayBitmap.Width; $relayX++) {
            if ($relayBitmap.GetPixel($relayX, $relayY).A -ge 128) {
                $relayBounds[0] = [Math]::Min($relayBounds[0], $relayX)
                $relayBounds[1] = [Math]::Min($relayBounds[1], $relayY)
                $relayBounds[2] = [Math]::Max($relayBounds[2], $relayX)
                $relayBounds[3] = [Math]::Max($relayBounds[3], $relayY)
            }
        }
    }
    $relaySegments = @()
    $relayStart = -1
    for ($relayX = 0; $relayX -le $relayBitmap.Width; $relayX++) {
        $relayOpaque = $relayX -lt $relayBitmap.Width -and $relayBitmap.GetPixel($relayX, 240).A -ge 128
        if ($relayOpaque -and $relayStart -lt 0) { $relayStart = $relayX }
        if (-not $relayOpaque -and $relayStart -ge 0) {
            $relaySegments += ,@($relayStart, ($relayX - 1))
            $relayStart = -1
        }
    }
    if (($relayBounds -join ',') -ne '30,8,261,277') { throw 'Unexpected opaque bounds' }
    $relayIntervals = ($relaySegments | ForEach-Object { $_ -join ',' }) -join ';'
    if ($relayIntervals -ne '53,68;132,142;179,189;228,238') { throw 'Unexpected lead intervals' }
    [PSCustomObject]@{
        threshold = 128
        bounds = $relayBounds
        scanY = 240
        intervals = $relaySegments
        roots = @($relaySegments | ForEach-Object { [PSCustomObject]@{ dx = ($_[0] + $_[1]) / 2; dy = 240 } })
    } | ConvertTo-Json -Depth 5
} finally { $relayBitmap.Dispose() }
