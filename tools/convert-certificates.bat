@echo off
setlocal EnableDelayedExpansion

echo ===================================================
echo    Конвертер сертификатов для Cider Code WH App
echo ===================================================
echo.

:: Проверка наличия OpenSSL
where openssl >nul 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] OpenSSL не найден! 
    echo Пожалуйста, установите OpenSSL или убедитесь, что он доступен в PATH.
    echo Вы можете скачать OpenSSL для Windows здесь: https://slproweb.com/products/Win32OpenSSL.html
    pause
    exit /b 1
)

:: Если папка output не существует, создаем её
if not exist output\ mkdir output

echo Выберите операцию:
echo 1. Конвертировать сертификат из DER в PEM
echo 2. Конвертировать сертификат из PFX/P12 в отдельные PEM файлы (сертификат и ключ)
echo 3. Преобразовать CRT в PEM
echo 4. Проверить сертификат и ключ на соответствие
echo 5. Просмотреть информацию о сертификате
echo 6. Выход
echo.

set /p choice=Введите номер операции (1-6): 

if "%choice%"=="1" (
    set /p cert_path=Введите путь к сертификату DER: 
    echo Конвертация DER в PEM...
    openssl x509 -inform DER -in "!cert_path!" -out output/cert.pem
    if %errorlevel% equ 0 (
        echo [УСПЕХ] Сертификат конвертирован и сохранен в output/cert.pem
    ) else (
        echo [ОШИБКА] Не удалось конвертировать сертификат
    )
)

if "%choice%"=="2" (
    set /p pfx_path=Введите путь к файлу PFX/P12: 
    set /p pfx_pass=Введите пароль от PFX (оставьте пустым, если нет пароля): 
    
    if "!pfx_pass!"=="" (
        echo Извлечение сертификата без пароля...
        openssl pkcs12 -in "!pfx_path!" -out output/cert.pem -nokeys
        openssl pkcs12 -in "!pfx_path!" -out output/key.pem -nocerts -nodes
    ) else (
        echo Извлечение сертификата с паролем...
        openssl pkcs12 -in "!pfx_path!" -out output/cert.pem -nokeys -passin pass:"!pfx_pass!"
        openssl pkcs12 -in "!pfx_path!" -out output/key.pem -nocerts -nodes -passin pass:"!pfx_pass!"
    )
    
    if %errorlevel% equ 0 (
        echo [УСПЕХ] Данные извлечены и сохранены:
        echo - Сертификат: output/cert.pem
        echo - Приватный ключ: output/key.pem
        echo Внимание: Возможно, вам потребуется отредактировать файлы, чтобы удалить лишние сертификаты.
    ) else (
        echo [ОШИБКА] Не удалось извлечь данные из PFX файла
    )
)

if "%choice%"=="3" (
    set /p crt_path=Введите путь к файлу CRT: 
    echo Конвертация CRT в PEM...
    
    echo Попытка конвертировать как DER формат...
    openssl x509 -inform DER -in "!crt_path!" -out output/cert.pem 2>nul
    if %errorlevel% neq 0 (
        echo Попытка конвертировать как PEM формат...
        openssl x509 -inform PEM -in "!crt_path!" -out output/cert.pem
    )
    
    if %errorlevel% equ 0 (
        echo [УСПЕХ] Сертификат конвертирован и сохранен в output/cert.pem
    ) else (
        echo [ОШИБКА] Не удалось конвертировать сертификат
    )
)

if "%choice%"=="4" (
    set /p cert_path=Введите путь к сертификату (PEM): 
    set /p key_path=Введите путь к приватному ключу (PEM): 
    
    echo Проверка соответствия сертификата и ключа...
    
    for /f %%i in ('openssl x509 -noout -modulus -in "!cert_path!" ^| openssl md5') do set cert_md5=%%i
    for /f %%i in ('openssl rsa -noout -modulus -in "!key_path!" ^| openssl md5') do set key_md5=%%i
    
    echo Хеш сертификата: !cert_md5!
    echo Хеш ключа: !key_md5!
    
    if "!cert_md5!"=="!key_md5!" (
        echo [УСПЕХ] Сертификат и ключ соответствуют друг другу!
    ) else (
        echo [ОШИБКА] Сертификат и ключ НЕ соответствуют друг другу!
    )
)

if "%choice%"=="5" (
    set /p cert_path=Введите путь к сертификату (PEM или DER): 
    
    echo Определение формата и просмотр информации о сертификате...
    
    openssl x509 -inform PEM -in "!cert_path!" -noout -text 2>nul
    if %errorlevel% neq 0 (
        echo Попытка прочитать в формате DER...
        openssl x509 -inform DER -in "!cert_path!" -noout -text
    )
    
    if %errorlevel% neq 0 (
        echo [ОШИБКА] Не удалось прочитать сертификат. Проверьте формат файла.
    )
)

if "%choice%"=="6" (
    echo Выход из программы...
    exit /b 0
)

echo.
pause
endlocal
