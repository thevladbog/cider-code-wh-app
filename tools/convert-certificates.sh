#!/bin/bash

# Конвертер сертификатов для Cider Code WH App

echo "==================================================="
echo "    Конвертер сертификатов для Cider Code WH App"
echo "==================================================="
echo

# Проверка наличия OpenSSL
if ! command -v openssl &> /dev/null; then
    echo "[ОШИБКА] OpenSSL не найден!"
    echo "Пожалуйста, установите OpenSSL (например, sudo apt install openssl или brew install openssl)"
    exit 1
fi

# Если папка output не существует, создаем её
mkdir -p output

convert_der_to_pem() {
    read -p "Введите путь к сертификату DER: " cert_path
    echo "Конвертация DER в PEM..."
    if openssl x509 -inform DER -in "$cert_path" -out output/cert.pem; then
        echo "[УСПЕХ] Сертификат конвертирован и сохранен в output/cert.pem"
    else
        echo "[ОШИБКА] Не удалось конвертировать сертификат"
    fi
}

convert_pfx_to_pem() {
    read -p "Введите путь к файлу PFX/P12: " pfx_path
    read -sp "Введите пароль от PFX (оставьте пустым, если нет пароля): " pfx_pass
    echo
    
    if [ -z "$pfx_pass" ]; then
        echo "Извлечение сертификата без пароля..."
        openssl pkcs12 -in "$pfx_path" -out output/cert.pem -nokeys
        openssl pkcs12 -in "$pfx_path" -out output/key.pem -nocerts -nodes
    else
        echo "Извлечение сертификата с паролем..."
        openssl pkcs12 -in "$pfx_path" -out output/cert.pem -nokeys -passin "pass:$pfx_pass"
        openssl pkcs12 -in "$pfx_path" -out output/key.pem -nocerts -nodes -passin "pass:$pfx_pass"
    fi
    
    if [ $? -eq 0 ]; then
        echo "[УСПЕХ] Данные извлечены и сохранены:"
        echo "- Сертификат: output/cert.pem"
        echo "- Приватный ключ: output/key.pem"
        echo "Внимание: Возможно, вам потребуется отредактировать файлы, чтобы удалить лишние сертификаты."
    else
        echo "[ОШИБКА] Не удалось извлечь данные из PFX файла"
    fi
}

convert_crt_to_pem() {
    read -p "Введите путь к файлу CRT: " crt_path
    echo "Конвертация CRT в PEM..."
    
    echo "Попытка конвертировать как DER формат..."
    if ! openssl x509 -inform DER -in "$crt_path" -out output/cert.pem 2>/dev/null; then
        echo "Попытка конвертировать как PEM формат..."
        openssl x509 -inform PEM -in "$crt_path" -out output/cert.pem
    fi
    
    if [ $? -eq 0 ]; then
        echo "[УСПЕХ] Сертификат конвертирован и сохранен в output/cert.pem"
    else
        echo "[ОШИБКА] Не удалось конвертировать сертификат"
    fi
}

verify_cert_key_pair() {
    read -p "Введите путь к сертификату (PEM): " cert_path
    read -p "Введите путь к приватному ключу (PEM): " key_path
    
    echo "Проверка соответствия сертификата и ключа..."
    
    cert_md5=$(openssl x509 -noout -modulus -in "$cert_path" | openssl md5)
    key_md5=$(openssl rsa -noout -modulus -in "$key_path" | openssl md5)
    
    echo "Хеш сертификата: $cert_md5"
    echo "Хеш ключа: $key_md5"
    
    if [ "$cert_md5" == "$key_md5" ]; then
        echo "[УСПЕХ] Сертификат и ключ соответствуют друг другу!"
    else
        echo "[ОШИБКА] Сертификат и ключ НЕ соответствуют друг другу!"
    fi
}

show_cert_info() {
    read -p "Введите путь к сертификату (PEM или DER): " cert_path
    
    echo "Определение формата и просмотр информации о сертификате..."
    
    if ! openssl x509 -inform PEM -in "$cert_path" -noout -text 2>/dev/null; then
        echo "Попытка прочитать в формате DER..."
        openssl x509 -inform DER -in "$cert_path" -noout -text
    fi
    
    if [ $? -ne 0 ]; then
        echo "[ОШИБКА] Не удалось прочитать сертификат. Проверьте формат файла."
    fi
}

# Главное меню
while true; do
    echo "Выберите операцию:"
    echo "1. Конвертировать сертификат из DER в PEM"
    echo "2. Конвертировать сертификат из PFX/P12 в отдельные PEM файлы (сертификат и ключ)"
    echo "3. Преобразовать CRT в PEM"
    echo "4. Проверить сертификат и ключ на соответствие"
    echo "5. Просмотреть информацию о сертификате"
    echo "6. Выход"
    echo
    
    read -p "Введите номер операции (1-6): " choice
    
    case $choice in
        1) convert_der_to_pem ;;
        2) convert_pfx_to_pem ;;
        3) convert_crt_to_pem ;;
        4) verify_cert_key_pair ;;
        5) show_cert_info ;;
        6) echo "Выход из программы..."; exit 0 ;;
        *) echo "Неверный выбор. Пожалуйста, выберите от 1 до 6." ;;
    esac
    
    echo
    read -p "Нажмите Enter для продолжения..."
done
