$modelUrl = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
$assetsDir = "android\app\src\main\assets"
$zipPath = "$assetsDir\vosk-model.zip"
$extractDir = "$assetsDir\vosk-model-en"

Write-Host "Creating assets directory if it doesn't exist..."
if (-not (Test-Path -Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir | Out-Null
}

if (Test-Path -Path $extractDir) {
    Write-Host "Model already exists at $extractDir"
    exit 0
}

Write-Host "Downloading Vosk model (this may take a minute)..."
Invoke-WebRequest -Uri $modelUrl -OutFile $zipPath

Write-Host "Extracting model..."
Expand-Archive -Path $zipPath -DestinationPath $assetsDir -Force

Write-Host "Renaming folder to vosk-model-en..."
Rename-Item -Path "$assetsDir\vosk-model-small-en-us-0.15" -NewName "vosk-model-en"

Write-Host "Cleaning up zip file..."
Remove-Item -Path $zipPath -Force

Write-Host "Done! Vosk model is ready at $extractDir"
