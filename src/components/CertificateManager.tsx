import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ShieldCheckIcon, ShieldExclamationIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { CertificateInfo } from '../utils/cert-manager';

/**
 * Компонент для управления сертификатами в административном интерфейсе
 */
export default function CertificateManager() {
  const [certInfo, setCertInfo] = useState<CertificateInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<boolean>(false);
  const [uploadFiles, setUploadFiles] = useState<{
    cert: File | null;
    key: File | null;
    ca: File | null;
  }>({
    cert: null,
    key: null,
    ca: null,
  });
  // Получение информации о текущем сертификате
  const fetchCertificateInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Вызываем IPC метод для получения информации о сертификате
      const info = await window.electronAPI?.getCertificateInfo();

      setCertInfo(info);
    } catch (err) {
      console.error('Ошибка получения информации о сертификате:', err);
      setError('Не удалось получить информацию о сертификате');
    } finally {
      setLoading(false);
    }
  };
  // Автоматическое обновление сертификата
  const handleUpdateCertificate = async () => {
    try {
      setUpdating(true);
      setError(null);
      // Вызываем IPC метод для обновления сертификата
      const result = await window.electronAPI?.checkAndUpdateCertificates(true);

      if (!result?.valid) {
        setError('Не удалось обновить сертификат или новый сертификат недействителен');
      } else {
        setCertInfo(result);
      }
    } catch (err) {
      console.error('Ошибка обновления сертификата:', err);
      setError('Не удалось обновить сертификат');
    } finally {
      setUpdating(false);
    }
  };

  // Загрузка файлов сертификатов
  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'cert' | 'key' | 'ca'
  ) => {
    if (event.target.files && event.target.files[0]) {
      setUploadFiles(prev => ({
        ...prev,
        [type]: event.target.files?.[0] || null,
      }));
    }
  };

  // Загрузка сертификатов
  const handleUploadCertificates = async () => {
    try {
      if (!uploadFiles.cert || !uploadFiles.key) {
        setError('Необходимо выбрать файлы сертификата и ключа');
        return;
      }

      setUpdating(true);
      setError(null);

      // Предварительная проверка выбранных файлов
      const certFileName = uploadFiles.cert.name.toLowerCase();
      const keyFileName = uploadFiles.key.name.toLowerCase();

      // Проверяем расширения и имена файлов
      if (
        !certFileName.endsWith('.pem') &&
        !certFileName.endsWith('.crt') &&
        !certFileName.endsWith('.cer')
      ) {
        setError('Файл сертификата должен иметь расширение .pem, .crt или .cer');
        setUpdating(false);
        return;
      }

      if (!keyFileName.endsWith('.pem') && !keyFileName.endsWith('.key')) {
        setError('Файл ключа должен иметь расширение .pem или .key');
        setUpdating(false);
        return;
      }

      // Читаем содержимое файлов
      console.log('Чтение файлов сертификатов...');
      let certData = '';
      let keyData = '';
      let caData = undefined;

      try {
        certData = await readFileAsText(uploadFiles.cert);
        console.log(`Прочитан сертификат, размер: ${certData.length} байт`);

        // Базовая проверка содержимого сертификата
        if (!certData.includes('-----BEGIN CERTIFICATE-----')) {
          setError(
            'Неверный формат файла сертификата. Убедитесь, что файл содержит сертификат в формате PEM.'
          );
          setUpdating(false);
          return;
        }
      } catch (e) {
        console.error('Ошибка чтения файла сертификата:', e);
        setError(`Не удалось прочитать файл сертификата: ${e.message}`);
        setUpdating(false);
        return;
      }

      try {
        keyData = await readFileAsText(uploadFiles.key);
        console.log(`Прочитан приватный ключ, размер: ${keyData.length} байт`);

        // Базовая проверка содержимого ключа
        if (
          !keyData.includes('-----BEGIN PRIVATE KEY-----') &&
          !keyData.includes('-----BEGIN RSA PRIVATE KEY-----')
        ) {
          setError(
            'Неверный формат файла ключа. Убедитесь, что файл содержит приватный ключ в формате PEM.'
          );
          setUpdating(false);
          return;
        }
      } catch (e) {
        console.error('Ошибка чтения файла приватного ключа:', e);
        setError(`Не удалось прочитать файл приватного ключа: ${e.message}`);
        setUpdating(false);
        return;
      }

      // Чтение CA сертификата, если он есть
      if (uploadFiles.ca) {
        try {
          caData = await readFileAsText(uploadFiles.ca);
          console.log(`Прочитан CA сертификат, размер: ${caData.length} байт`);

          // Базовая проверка содержимого CA сертификата
          if (!caData.includes('-----BEGIN CERTIFICATE-----')) {
            console.warn(
              'CA сертификат может быть в неверном формате. Продолжаем загрузку, но он может не работать.'
            );
          }
        } catch (e) {
          console.error('Ошибка чтения файла CA сертификата:', e);
          // Не прерываем процесс, так как CA сертификат опциональный
          caData = undefined;
        }
      }

      // Вызываем IPC метод для загрузки сертификатов
      console.log('Отправка сертификатов в IPC...');
      const result = await window.electronAPI?.uploadCertificate({
        certData,
        keyData,
        caData,
      });

      console.log('Результат загрузки:', result);

      if (!result?.success) {
        let errorMessage = result?.error || 'Не удалось загрузить сертификаты';

        // Улучшаем сообщение об ошибке для пользователя
        if (errorMessage.includes('недействителен')) {
          errorMessage +=
            '. Убедитесь, что файлы сертификата и ключа действительны и в правильном формате.';
        }

        setError(errorMessage);
      } else {
        setCertInfo(result.certInfo || null);

        // Очищаем выбранные файлы
        setUploadFiles({
          cert: null,
          key: null,
          ca: null,
        });
      }
    } catch (err) {
      console.error('Ошибка загрузки сертификатов:', err);
      setError(`Не удалось загрузить сертификаты: ${err.message || 'неизвестная ошибка'}`);
    } finally {
      setUpdating(false);
    }
  };

  // Функция для чтения содержимого файла как текст
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Загружаем информацию о сертификате при монтировании компонента
  useEffect(() => {
    fetchCertificateInfo();

    // Обновляем информацию каждую минуту
    const intervalId = setInterval(fetchCertificateInfo, 60000);

    return () => clearInterval(intervalId);
  }, []);
  // Рендеринг информации о сертификате
  const renderCertificateInfo = () => {
    if (!certInfo) return null;

    return (
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4">
        <div className="flex items-center mb-2">
          {certInfo.valid ? (
            <ShieldCheckIcon className="w-6 h-6 text-green-500 mr-2" />
          ) : (
            <ShieldExclamationIcon className="w-6 h-6 text-red-500 mr-2" />
          )}
          <h3 className="text-lg font-semibold">
            Статус сертификата: {certInfo.valid ? 'Действителен' : 'Недействителен'}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p>
              <span className="font-semibold">Домен:</span> {certInfo.domain || 'Н/Д'}
            </p>
            <p>
              <span className="font-semibold">Издатель:</span> {certInfo.issuer || 'Н/Д'}
            </p>
          </div>
          <div>
            <p>
              <span className="font-semibold">Срок действия:</span>{' '}
              {certInfo.expiration ? format(certInfo.expiration, 'dd.MM.yyyy HH:mm') : 'Н/Д'}
            </p>
            <p>
              <span className="font-semibold">Действителен с:</span>{' '}
              {certInfo.notBefore ? format(certInfo.notBefore, 'dd.MM.yyyy HH:mm') : 'Н/Д'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="p-4 max-h-[calc(100vh-4rem)] overflow-y-auto show-scrollbar-on-hover"
      style={{ height: 'calc(100vh - 4rem)' }}
    >
      <h2 className="text-2xl font-bold mb-4">Управление TLS-сертификатами</h2>

      {loading && <p className="text-gray-500">Загрузка информации о сертификате...</p>}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {renderCertificateInfo()}

      <div className="mb-6">
        <button
          onClick={handleUpdateCertificate}
          disabled={updating}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-5 h-5 mr-2 ${updating ? 'animate-spin' : ''}`} />
          {updating ? 'Обновление...' : 'Обновить сертификаты'}
        </button>
        <p className="text-sm text-gray-500 mt-1">
          Попытка автоматически обновить сертификаты из настроенного источника.
        </p>
      </div>

      <div className="border-t pt-4 mt-4">
        <h3 className="text-xl font-semibold mb-3">Загрузка сертификатов вручную</h3>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto show-scrollbar-on-hover p-1">
          <div>
            <label className="block text-sm font-medium mb-1">Сертификат (cert.pem)</label>
            <input
              type="file"
              onChange={e => handleFileChange(e, 'cert')}
              disabled={updating}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Закрытый ключ (key.pem)</label>
            <input
              type="file"
              onChange={e => handleFileChange(e, 'key')}
              disabled={updating}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              CA-сертификат (ca.pem, необязательно)
            </label>
            <input
              type="file"
              onChange={e => handleFileChange(e, 'ca')}
              disabled={updating}
              className="w-full p-2 border rounded"
            />
          </div>

          <button
            onClick={handleUploadCertificates}
            disabled={!uploadFiles.cert || !uploadFiles.key || updating}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {updating ? 'Загрузка...' : 'Загрузить сертификаты'}
          </button>
        </div>
      </div>
    </div>
  );
}
