$env:JAVA_HOME="D:\Android Studio\jbr"
$env:Path="$env:JAVA_HOME\bin;$env:Path"
Set-Location D:\moodos-app\android
.\gradlew.bat :app:processDebugMainManifest --info 2>&1 | Out-File -FilePath D:\moodos-app\manifest_log.txt -Encoding utf8
Write-Host "Done. Exit code: $LASTEXITCODE"
