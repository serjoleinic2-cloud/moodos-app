@echo off
set "JAVA_HOME=D:\Android Studio\jbr"
set "Path=%JAVA_HOME%\bin;%Path%"
cd /d "D:\moodos-app\android"
call gradlew.bat :app:processDebugMainManifest --info > D:\moodos-app\manifest_log.txt 2>&1
echo DONE > D:\moodos-app\manifest_done.txt
