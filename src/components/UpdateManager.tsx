import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  CloudArrowDownIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

// Типы для обновления - имена соответствуют обновлениям из utils/updater.ts
enum UpdateStatus {
  Checking = 'checking-for-update',
  Available = 'update-available',
  NotAvailable = 'update-not-available',
  Error = 'error',
  Downloaded = 'update-downloaded',
  Progress = 'download-progress',
}

// Интерфейс информации об обновлении
interface UpdateInfo {
  version: string;
  releaseDate?: string;
  files?: unknown[];
  path?: string;
  sha512?: string;
  releaseName?: string;
  releaseNotes?: string;
}

// Интерфейс сообщения об обновлении
interface UpdateMessage {
  status: UpdateStatus;
  info?: UpdateInfo;
  error?: string;
  progress?: {
    percent: number;
    bytesPerSecond: number;
    total: number;
    transferred: number;
  };
}

const UpdateManager: React.FC = () => {
  // Локальное состояние
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [updateRequired, setUpdateRequired] = useState<boolean>(false);

  // Получение текущей версии при монтировании
  useEffect(() => {
    const getCurrentVersion = async () => {
      try {
        const version = await window.electronAPI?.getCurrentVersion();
        setCurrentVersion(version);
      } catch (error) {
        console.error('Error getting current version:', error);
      }
    };

    getCurrentVersion();
  }, []);
  // Подписка на события обновления
  useEffect(() => {
    // Регистрируем обработчик событий обновления
    const unsubscribe = window.electronAPI?.onUpdateStatus(
      (_event: unknown, message: UpdateMessage) => {
        setUpdateStatus(message.status);

        switch (message.status) {
          case UpdateStatus.Checking:
            setIsCheckingForUpdates(true);
            setUpdateError(null);
            break;

          case UpdateStatus.Available:
            setIsCheckingForUpdates(false);
            if (message.info) {
              setUpdateInfo(message.info);
              setUpdateRequired(true);
              setIsModalVisible(true);
            }
            break;

          case UpdateStatus.NotAvailable:
            setIsCheckingForUpdates(false);
            break;

          case UpdateStatus.Error:
            setIsCheckingForUpdates(false);
            if (message.error) {
              setUpdateError(message.error);
            }
            break;

          case UpdateStatus.Progress:
            if (message.progress) {
              setDownloadProgress(message.progress.percent);
            }
            break;

          case UpdateStatus.Downloaded:
            setDownloadProgress(100);
            if (message.info) {
              setUpdateInfo(message.info);
              setIsModalVisible(true);
            }
            break;
        }
      }
    );

    // Проверяем наличие обновлений при монтировании компонента
    checkForUpdates();

    // Отписка при размонтировании
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Функция для проверки обновлений
  const checkForUpdates = async () => {
    setIsCheckingForUpdates(true);
    try {
      await window.electronAPI?.checkForUpdates();
    } catch (error) {
      console.error('Error checking for updates:', error);
      setIsCheckingForUpdates(false);
      setUpdateError('Ошибка при проверке обновлений');
    }
  };

  // Загрузка обновления
  const downloadUpdate = async () => {
    try {
      await window.electronAPI?.downloadUpdate();
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error downloading update:', error);
      setUpdateError('Ошибка при загрузке обновления');
    }
  };

  // Установка обновления
  const installUpdate = async () => {
    try {
      await window.electronAPI?.quitAndInstall();
    } catch (error) {
      console.error('Error installing update:', error);
      setUpdateError('Ошибка при установке обновления');
    }
  };
  // Получение сообщения о статусе
  const getStatusMessage = () => {
    switch (updateStatus) {
      case UpdateStatus.Checking:
        return 'Проверка обновлений...';
      case UpdateStatus.Available:
        return `Доступно обновление до версии ${updateInfo?.version}`;
      case UpdateStatus.NotAvailable:
        return 'У вас установлена последняя версия';
      case UpdateStatus.Error:
        return `Ошибка: ${updateError}`;
      case UpdateStatus.Downloaded:
        return 'Обновление загружено и готово к установке';
      case UpdateStatus.Progress:
        return `Загрузка обновления: ${downloadProgress.toFixed(0)}%`;
      default:
        return 'Проверьте наличие обновлений';
    }
  };

  // Получение иконки статуса
  const getStatusIcon = () => {
    const iconClass = 'h-5 w-5';

    switch (updateStatus) {
      case UpdateStatus.Checking:
        return <ArrowPathIcon className={`${iconClass} animate-spin`} />;
      case UpdateStatus.Available:
      case UpdateStatus.Downloaded:
        return <CheckCircleIcon className={`${iconClass} text-green-500`} />;
      case UpdateStatus.Error:
        return <XCircleIcon className={`${iconClass} text-red-500`} />;
      case UpdateStatus.NotAvailable:
        return <InformationCircleIcon className={`${iconClass} text-blue-500`} />;
      default:
        return <InformationCircleIcon className={`${iconClass} text-gray-500`} />;
    }
  };

  // Получение цвета для алерта
  const getAlertColor = () => {
    switch (updateStatus) {
      case UpdateStatus.Error:
        return 'bg-red-50 border-red-200 text-red-800';
      case UpdateStatus.Available:
      case UpdateStatus.Downloaded:
        return 'bg-green-50 border-green-200 text-green-800';
      case UpdateStatus.NotAvailable:
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CloudArrowDownIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Управление обновлениями
          </h3>
          {updateRequired && (
            <div className="flex h-2 w-2">
              <div className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></div>
              <div className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></div>
            </div>
          )}
        </div>
      </div>

      {/* Информация о текущей версии */}
      <div className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <span className="text-sm text-gray-600 dark:text-gray-300">
          Текущая версия: <span className="font-mono font-medium">{currentVersion}</span>
        </span>
        <button
          onClick={checkForUpdates}
          disabled={isCheckingForUpdates}
          className="inline-flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowPathIcon className={`h-4 w-4 ${isCheckingForUpdates ? 'animate-spin' : ''}`} />
          <span>{isCheckingForUpdates ? 'Проверка...' : 'Проверить'}</span>
        </button>
      </div>

      {/* Статус обновления */}
      {updateStatus && (
        <div className={`flex items-center space-x-3 p-4 border rounded-lg ${getAlertColor()}`}>
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusMessage()}</span>
        </div>
      )}

      {/* Прогресс загрузки */}
      {updateStatus === UpdateStatus.Progress && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>Загрузка обновления</span>
            <span>{downloadProgress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Кнопки действий */}
      <div className="space-y-2">
        {updateStatus === UpdateStatus.Downloaded && (
          <button
            onClick={installUpdate}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <CloudArrowDownIcon className="h-5 w-5" />
            <span>Установить обновление</span>
          </button>
        )}

        {updateStatus === UpdateStatus.Available && !isModalVisible && (
          <button
            onClick={() => setIsModalVisible(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <CloudArrowDownIcon className="h-5 w-5" />
            <span>Подробнее об обновлении</span>
          </button>
        )}
      </div>

      {/* Модальное окно с информацией об обновлении */}
      <Transition appear show={isModalVisible} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsModalVisible(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                    >
                      {updateStatus === UpdateStatus.Downloaded
                        ? 'Обновление готово к установке'
                        : 'Доступно новое обновление'}
                    </Dialog.Title>
                    <button
                      onClick={() => setIsModalVisible(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {updateStatus === UpdateStatus.Downloaded
                        ? `Обновление до версии ${updateInfo?.version} готово к установке`
                        : `Доступна новая версия ${updateInfo?.version} (текущая: ${currentVersion})`}
                    </p>

                    {updateInfo?.releaseNotes && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Что нового:
                        </h4>
                        <div
                          className="text-sm text-gray-600 dark:text-gray-300 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: updateInfo.releaseNotes }}
                        />
                      </div>
                    )}

                    {updateStatus === UpdateStatus.Downloaded && (
                      <div className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-sm text-yellow-800 dark:text-yellow-200">
                          Приложение будет перезапущено для завершения установки
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex space-x-3">
                    <button
                      onClick={() => setIsModalVisible(false)}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Позже
                    </button>
                    <button
                      onClick={
                        updateStatus === UpdateStatus.Downloaded ? installUpdate : downloadUpdate
                      }
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      {updateStatus === UpdateStatus.Downloaded
                        ? 'Установить сейчас'
                        : 'Загрузить обновление'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default UpdateManager;
