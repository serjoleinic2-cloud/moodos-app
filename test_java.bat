@echo off
set "JAVA_HOME=D:\Android Studio\jbr"
set "Path=%JAVA_HOME%\bin;%Path%"
java -version > D:\moodos-app\java_test.txt 2>&1
echo JAVA OK >> D:\moodos-app\java_test.txt
