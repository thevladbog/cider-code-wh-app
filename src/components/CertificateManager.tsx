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

      // Читаем содержимое файлов
      const certData = await readFileAsText(uploadFiles.cert);
      const keyData = await readFileAsText(uploadFiles.key);
      const caData = uploadFiles.ca ? await readFileAsText(uploadFiles.ca) : undefined;
      // Вызываем IPC метод для загрузки сертификатов
      const result = await window.electronAPI?.uploadCertificate({
        certData,
        keyData,
        caData,
      });
      if (!result?.success) {
        setError(result?.error || 'Не удалось загрузить сертификаты');
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
      setError('Не удалось загрузить сертификаты');
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
    <div className="p-4">
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

      <div className="border-t pt-4">
        <h3 className="text-xl font-semibold mb-3">Загрузка сертификатов вручную</h3>

        <div className="space-y-4">
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
