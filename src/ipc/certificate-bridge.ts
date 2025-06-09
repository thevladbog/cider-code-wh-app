/**
 * Мост для IPC методов по управлению сертификатами в preload-скрипте
 */

import { contextBridge, ipcRenderer } from 'electron';
import { CertificateInfo } from '../utils/cert-manager';

export function registerCertificateAPI() {
  // Расширяем существующий electronAPI вместо создания нового
  if (window.electronAPI) {
    // Добавляем методы для работы с сертификатами к существующему API
    Object.assign(window.electronAPI, {
      // Удобные методы для работы с сертификатами
      getCertificateInfo: async (): Promise<CertificateInfo> => {
        return await ipcRenderer.invoke('certificate:info');
      },

      checkAndUpdateCertificates: async (): Promise<boolean> => {
        return await ipcRenderer.invoke('certificate:check-and-update');
      },

      uploadCertificate: async (certificatePath: string, keyPath: string): Promise<boolean> => {
        return await ipcRenderer.invoke('certificate:upload', certificatePath, keyPath);
      },

      startCertificateMonitoring: async (): Promise<void> => {
        return await ipcRenderer.invoke('certificate:start-monitoring');
      }
    });
  } else {
    // Fallback: создаем новый API если electronAPI еще не существует
    contextBridge.exposeInMainWorld('certificateAPI', {
      getCertificateInfo: async (): Promise<CertificateInfo> => {
        return await ipcRenderer.invoke('certificate:info');
      },

      checkAndUpdateCertificates: async (): Promise<boolean> => {
        return await ipcRenderer.invoke('certificate:check-and-update');
      },      uploadCertificate: async (certificatePath: string, keyPath: string): Promise<boolean> => {
        return await ipcRenderer.invoke('certificate:upload', certificatePath, keyPath);
      },

      startCertificateMonitoring: async (): Promise<void> => {
        return await ipcRenderer.invoke('certificate:start-monitoring');
      }
    });
  }
}
