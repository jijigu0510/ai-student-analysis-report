@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo   부안고 진학지도 프로그램 - GitHub 업로드
echo ============================================
echo.

rem --- git 설치 확인 ---
where git >nul 2>nul
if errorlevel 1 (
    echo [오류] git이 설치되어 있지 않습니다.
    echo        https://git-scm.com 에서 설치 후 다시 실행하세요.
    pause
    exit /b 1
)

rem --- 저장소 확인 ---
if not exist ".git" (
    echo [오류] 이 폴더는 git 저장소가 아닙니다.
    pause
    exit /b 1
)

rem --- 원격 확인 ---
git remote get-url origin >nul 2>nul
if errorlevel 1 (
    echo [오류] 연결된 GitHub 저장소가 없습니다.
    echo        git remote add origin 저장소주소
    pause
    exit /b 1
)

echo [1/4] 변경된 파일을 확인합니다...
echo.
git status --short
echo.

rem --- 변경사항 없으면 종료 ---
for /f %%i in ('git status --porcelain ^| find /c /v ""') do set CHANGES=%%i
for /f %%i in ('git rev-list --count origin/main..HEAD 2^>nul') do set AHEAD=%%i
if not defined AHEAD set AHEAD=0

if "!CHANGES!"=="0" (
    if "!AHEAD!"=="0" (
        echo 변경된 내용이 없습니다. 업로드할 것이 없습니다.
        echo.
        pause
        exit /b 0
    )
    echo 새로 바뀐 파일은 없지만, 아직 전송되지 않은 기록 !AHEAD!건이 있습니다.
    echo 이것만 GitHub로 전송합니다.
    echo.
    goto PUSHONLY
)

echo 위 파일들을 GitHub에 올립니다.
set /p MSG="변경 내용을 간단히 적어주세요 (그냥 엔터 = 날짜로 기록): "

if "!MSG!"=="" (
    for /f "tokens=1-3 delims=-/ " %%a in ("%date%") do set TODAY=%%a-%%b-%%c
    set MSG=업데이트 !TODAY! %time:~0,5%
)

echo.
echo [2/4] 파일을 추가합니다...
git add -A
if errorlevel 1 goto FAIL

echo [3/4] 변경 내용을 기록합니다...
git commit -m "!MSG!"
if errorlevel 1 goto FAIL

:PUSHONLY
echo [4/4] GitHub로 전송합니다...
git rev-parse --abbrev-ref --symbolic-full-name @{u} >nul 2>nul
if errorlevel 1 (
    for /f %%b in ('git branch --show-current') do set BR=%%b
    echo    첫 전송이라 대상을 지정합니다 ^(origin/!BR!^)
    git push -u origin !BR!
) else (
    git push
)
if errorlevel 1 goto PUSHFAIL

echo.
echo ============================================
echo   업로드 완료
echo ============================================
git log -1 --pretty="  기록: %%s (%%cr)"
echo.
pause
exit /b 0

:PUSHFAIL
echo.
echo [전송 실패] 아래를 확인하세요.
echo   - 인터넷 연결 상태
echo   - GitHub 로그인 여부 (처음이면 로그인 창이 뜹니다)
echo   - 다른 컴퓨터에서 올린 내용이 있다면: git pull 먼저 실행
echo.
pause
exit /b 1

:FAIL
echo.
echo [오류] 처리 중 문제가 발생했습니다. 위 메시지를 확인하세요.
echo.
pause
exit /b 1
