# Run from the project root in PowerShell: .\scripts\download-face-models.ps1
$ErrorActionPreference = "Stop"
$destination = Join-Path (Get-Location) "public\models\face"
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$base = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model"
$files = @(
  "ssd_mobilenetv1_model-weights_manifest.json",
  "ssd_mobilenetv1_model.bin",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model.bin",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model.bin"
)
foreach ($file in $files) {
  $url = "$base/$file"
  $path = Join-Path $destination $file
  Write-Host "Downloading $file ..."
  Invoke-WebRequest -Uri $url -OutFile $path
  if (!(Test-Path $path) -or (Get-Item $path).Length -lt 100) {
    throw "Download failed or file is too small: $file"
  }
}
Write-Host "All face models downloaded to $destination" -ForegroundColor Green
