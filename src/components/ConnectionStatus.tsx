import React, { useState } from 'react';
import { getEnvironment } from '../config/environment';
import { ShieldCheckIcon, ShieldExclamationIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';
import { useTlsStatus } from '../hooks/useOrdersApi';
import { getCertificateSource, isProductionReadyCertificate } from '../utils/cert-renderer-utils';

interface ConnectionStatusProps {
  apiBaseUrl?: string;
}

/**
 * Компонент для отображения статуса TLS соединения с бэкендом
 */
const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ apiBaseUrl }) => {
  const { tlsStatus, tlsStatusLoading, refreshTlsStatus } = useTlsStatus();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Получаем URL API из props или из конфигурации среды
  const apiUrl = apiBaseUrl || getEnvironment().apiBaseUrl;

  // Formatter for connection time
  const formatTimeSince = (date: Date | null): string => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - (date instanceof Date ? date.getTime() : new Date(date).getTime());
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return `${diffSec} sec ago`;
    
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} h ago`;
    
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay} days ago`;
  };

  // Определяем статус соединения на основе данных TLS
  const getConnectionStatus = (): 'connected' | 'warning' | 'disconnected' | 'unknown' => {
    if (!tlsStatus) return 'unknown';
    
    // Если были успешные подключения и сертификат валидный
    if (tlsStatus.connections.successful > 0 && tlsStatus.certificateInfo.valid) {
      return 'connected';
    }
    
    // Если были успешные подключения, но есть проблемы с сертификатом
    if (tlsStatus.connections.successful > 0 && !tlsStatus.certificateInfo.valid) {
      return 'warning';
    }
    
    // Если были попытки подключения, но все неудачные
    if (tlsStatus.connections.failed > 0 && tlsStatus.connections.successful === 0) {
      return 'disconnected';
    }
    
    // Если не было подключений вообще
    return 'unknown';
  };

  const connectionStatus = getConnectionStatus();

  // Определяем стили и иконку в зависимости от статуса
  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <ShieldCheckIcon className="h-5 w-5 text-green-500" />,
          color: 'text-green-500',
          bgColor: 'bg-green-100',
          text: 'TLS Secured'
        };
      case 'warning':
        return {
          icon: <ShieldExclamationIcon className="h-5 w-5 text-yellow-500" />,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-100',
          text: 'Certificate Issues'
        };
      case 'disconnected':
        return {
          icon: <ExclamationCircleIcon className="h-5 w-5 text-red-500" />,
          color: 'text-red-500',
          bgColor: 'bg-red-100',
          text: 'Connection Failed'
        };
      case 'unknown':
      default:
        return {
          icon: <ExclamationCircleIcon className="h-5 w-5 text-gray-500" />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          text: 'Checking...'
        };
    }
  };

  const statusInfo = getStatusInfo();  return (
    <div className="relative">
      <div 
        className={`flex items-center rounded-lg p-2 shadow-sm cursor-pointer transition-all duration-200 ${statusInfo.bgColor} hover:shadow-md`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="mr-2">{statusInfo.icon}</div>
        <span className={`text-sm font-medium ${statusInfo.color}`}>{statusInfo.text}</span>
        
        {tlsStatusLoading && (
          <div className="ml-2 animate-pulse">
            <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
          </div>
        )}
      </div>
      
      {isExpanded && tlsStatus && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg w-72 z-50 border border-gray-200 dark:border-gray-600">
          <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">TLS Connection Information</h3>
            <div className="text-xs text-gray-700 dark:text-gray-300">
            <div className="mb-1">
              <span className="font-medium text-gray-900 dark:text-white">Last connection:</span>{' '}
              {tlsStatus.lastConnection ? formatTimeSince(tlsStatus.lastConnection) : 'Never'}
            </div>
            
            <div className="mb-1">
              <span className="font-medium text-gray-900 dark:text-white">Certificate valid:</span>{' '}
              {tlsStatus.certificateInfo.valid ? 'Yes' : 'No'}
            </div>
              {tlsStatus.certificateInfo.expiration && (
              <div className="mb-1">
                <span className="font-medium text-gray-900 dark:text-white">Expires:</span>{' '}
                {new Date(tlsStatus.certificateInfo.expiration).toLocaleDateString()}
              </div>
            )}
              {tlsStatus.certificateInfo.issuer && (
              <div className="mb-1">
                <span className="font-medium text-gray-900 dark:text-white">Issuer:</span> {tlsStatus.certificateInfo.issuer}
              </div>
            )}
              <div className="mb-1">
              <span className="font-medium text-gray-900 dark:text-white">Source:</span>{' '}
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                isProductionReadyCertificate(tlsStatus.certificateInfo) 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              }`}>
                {getCertificateSource(tlsStatus.certificateInfo)}
                {!isProductionReadyCertificate(tlsStatus.certificateInfo) && (
                  <span className="ml-1" title="Development certificate">⚠️</span>
                )}
              </span>
            </div>
            
            {tlsStatus.certificateInfo.domain && (
              <div className="mb-1">
                <span className="font-medium text-gray-900 dark:text-white">Domain:</span> {tlsStatus.certificateInfo.domain}
              </div>
            )}
            
            <div className="mb-1">
              <span className="font-medium text-gray-900 dark:text-white">API URL:</span> {apiUrl}
            </div>
            
            <div className="mb-1">
              <span className="font-medium text-gray-900 dark:text-white">Stats:</span>{' '}
              {tlsStatus.connections.successful}/{tlsStatus.connections.total} successful
            </div>
            
            {tlsStatus.lastError && (
              <div className="mt-2 text-red-500 dark:text-red-400">
                <span className="font-medium">Last error:</span> {tlsStatus.lastError}
              </div>
            )}
              <button 
              onClick={(e) => {
                e.stopPropagation();
                refreshTlsStatus();
              }}
              className="mt-3 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
            >
              Refresh Status
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;