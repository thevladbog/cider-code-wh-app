import { Order } from '../models/orders';
import { getApiConfig, API_ENDPOINTS } from '../config/api.config';
import { getEnvironment } from '../config/environment';
import {
  ApiOrder,
  ApiError,
  NetworkError,
  NotFoundError,
  AuthenticationError,
  ValidationError,
  OrdersResponse,
  ArchiveResponse,
} from '../types/api.types';

// Интерфейс для типизации Electron API
interface ElectronAPI {
  // API-related methods (защищенные TLS запросы через основной процесс)
  fetchOrders: (status?: string) => Promise<{
    success: boolean;
    data?: Order[];
    error?: string;
    status?: number;
  }>;
  archiveOrder: (id: string) => Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
    status?: number;
  }>;
  updateOrderStatus: (
    id: string,
    status: string
  ) => Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
    status?: number;
  }>;

  // Printer-related methods
  printLabels: (options: { labels: string[]; printerName?: string }) => Promise<boolean>;
  getPrinters: () => Promise<
    Array<{
      name: string;
      connectionType: string;
      ip?: string;
      port?: number;
      isDefault: boolean;
    }>
  >;
  savePrinterConfig: (
    config: Array<{
      name: string;
      connectionType: string;
      ip?: string;
      port?: number;
      isDefault: boolean;
    }>
  ) => Promise<{
    success: boolean;
    message: string;
    loadedConfig?: Array<{
      name: string;
      connectionType: string;
      ip?: string;
      port?: number;
      isDefault: boolean;
    }>;
  }>;
  testPrinterConnection: (printerConfig: {
    name: string;
    connectionType: string;
    ip?: string;
    port?: number;
    isDefault: boolean;
  }) => Promise<{ success: boolean; message: string }>;
  getSystemPrinters: () => Promise<{ name: string; portName: string; isDefault: boolean }[]>;
  printRawToPrinter: (
    printerName: string,
    rawData: string
  ) => Promise<{ success: boolean; message: string }>;
}

// Функция для обработки ошибок API
const handleApiError = (error: unknown, context: string): never => {
  console.error(`API error (${context}):`, error);
  if (error instanceof Error) {
    throw error;
  } else {
    throw new ApiError(`Неизвестная ошибка API в "${context}"`);
  }
};

// Функция для проверки ответа на ошибки HTTP
const checkResponse = async (response: Response, context: string) => {
  if (!response.ok) {
    const errorStatus = response.status;
    let errorText: string;

    try {
      // Пробуем прочитать ошибку как JSON
      const errorData = await response.json();
      errorText = errorData.message || `${response.statusText}`;
    } catch {
      // Если не удалось прочитать как JSON, получаем текст
      errorText = await response.text().catch(() => 'Unknown error');
    }

    console.error(`API HTTP error (${context}): ${errorStatus} - ${errorText}`);

    // Создаем конкретный тип ошибки в зависимости от статуса
    switch (errorStatus) {
      case 404:
        throw new NotFoundError(context);
      case 401:
      case 403:
        throw new AuthenticationError(errorText);
      case 422:
        throw new ValidationError(errorText);
      default:
        throw new ApiError(errorText, errorStatus);
    }
  }
  return response;
};

/**
 * Базовая функция для запросов к API
 */
async function fetchApi<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: object,
  context = 'API request'
): Promise<T> {
  const config = getApiConfig();
  const url = `${config.baseUrl}${endpoint}`;

  console.log(`[API] ${method} ${url}`);

  try {
    const response = await fetch(url, {
      method,
      headers: config.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    await checkResponse(response, context);
    const data = await response.json();
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof TypeError || (error as Error).message?.includes('network')) {
      console.error(`[API] Network error in ${context}:`, error);
      throw new NetworkError(`Сетевая ошибка: ${(error as Error).message}`);
    }

    console.error(`[API] Error in ${context}:`, error);
    throw new ApiError(`Ошибка при ${context}: ${(error as Error).message}`);
  }
}

/**
 * Получение списка заказов
 * @param status - опциональный фильтр по статусу заказа
 * @returns Promise с массивом заказов
 */
export const fetchOrders = async (status?: string): Promise<Order[]> => {
  try {
    // Используем Electron API для обхода CORS
    if (window.electronAPI) {
      console.log('[API] Используем Electron API для запроса заказов');
      const api = window.electronAPI as ElectronAPI;
      const result = await api.fetchOrders(status);

      if (result.success && result.data) {
        const response = result.data as OrdersResponse | Order[];

        // Проверяем структуру ответа (соответствие новой структуре API)
        if ('result' in response && Array.isArray(response.result)) {
          // Конвертируем ApiOrder в Order (добавляем шаблон, если его нет)
          return response.result.map(apiOrder => {
            const order: Order = {
              id: apiOrder.id,
              orderNumber: apiOrder.orderNumber,
              deliveryDate: apiOrder.deliveryDate,
              status: apiOrder.status,
              consignee: apiOrder.consignee,
              address: apiOrder.address,
              // Если шаблон отсутствует, используем шаблон по умолчанию
              template: apiOrder.template || generateDefaultTemplate(),
            };
            return order;
          });
        } else if (Array.isArray(response)) {
          // Если API возвращает массив напрямую (для совместимости со старым API)
          console.warn('[API] Получен ответ в устаревшем формате (массив)');
          return response as unknown as Order[];
        } else {
          console.warn('[API] Неожиданный формат ответа:', response);
          return [];
        }
      } else {
        throw new ApiError(result.error || 'Ошибка при запросе заказов через Electron API');
      }
    } else {
      // Запасной вариант для случаев, когда Electron API недоступно (например, тесты)
      // Формируем запрос с учетом фильтра по статусу, если он указан
      const endpoint = status ? `${API_ENDPOINTS.orders}?status=${status}` : API_ENDPOINTS.orders;
      const response = await fetchApi<OrdersResponse>(endpoint, 'GET', undefined, 'fetchOrders');

      // Проверяем структуру ответа (соответствие новой структуре API)
      if (response.result && Array.isArray(response.result)) {
        // Конвертируем ApiOrder в Order (добавляем шаблон, если его нет)
        return response.result.map(apiOrder => {
          const order: Order = {
            id: apiOrder.id,
            orderNumber: apiOrder.orderNumber,
            deliveryDate: apiOrder.deliveryDate,
            status: apiOrder.status,
            consignee: apiOrder.consignee,
            address: apiOrder.address,
            // Если шаблон отсутствует, используем шаблон по умолчанию
            template: apiOrder.template || generateDefaultTemplate(),
          };
          return order;
        });
      } else if (Array.isArray(response)) {
        // Если API возвращает массив напрямую (для совместимости со старым API)
        console.warn('[API] Получен ответ в устаревшем формате (массив)');
        return response as unknown as Order[];
      } else {
        console.warn('[API] Неожиданный формат ответа:', response);
        return [];
      }
    }
  } catch (error) {
    // В случае ошибки в development режиме возвращаем моковые данные
    if (getEnvironment().mode === 'development') {
      console.warn('[API] Ошибка при запросе к API, используем моковые данные:', error);
      const { mockOrders } = await import('../models/orders');
      if (status) {
        return mockOrders.filter(order => order.status === status);
      }
      return mockOrders;
    }

    // Пробрасываем ошибки API
    if (error instanceof ApiError) {
      throw error;
    }

    return handleApiError(error, 'fetchOrders');
  }
};

/**
 * Генерирует шаблон ZPL по умолчанию для заказа
 */
function generateDefaultTemplate(): string {
  return '^XA ^CI28 ^FO0,35^GB799,2,2^FS ^FO0,359^GB799,2,2^FS ^FO0,223^GB799,2,2^FS ^FO571,36^GB2,324,2^FS ^FO360,223^GB2,136,2^FS ^FT8,18^A@N,11,10,46055637.FNT^FH\\^CI28^FDООО "РЭБЕЛ ЭППЛ"^FS^CI27 ^FT8,30^A@N,11,11,59303640.FNT^FH\\^CI28^FD1-й Силикатный пр-д, 10, стр. 2, Москва, Россия, 123308^FS^CI27 ^FO715,4^GFA,293,348,12,:Z64:eJzrWgUCK1asYmBgCIWAq1eB7AUMEMAIxA5I7FNdGquaVnUprASyXefXXGR8ft/gIpDdP0vvcfOz0woLQeITTBwZ0+8bHASyz8/QO9z87vyCAyDxGzUHGVPvF4DE+3cAxZ+9VmiEqD8IVz9L5zVQ/YoTIHF5hPn8s/ReNz/rMgDbKwA0P03CwBFs/jqg+RwGcPNTZMDm9M3W+/34GYfdTyDbRZAhkJGFQUQQyD7AwAEkOTD8lbX7/+79u3fv/w/lEwZKixZ1rYJxRBDiWqtWda0AswCuvV5n:A85F ^FO8,58^A@N,11,10,46055637.FNT^FH\\^CI28^FDКому:^FS ^FO8,75^FB550,23^A@N,39,39,46055637.FNT^FH\\^CI28^FD{{consignee}}^FS ^FO8,159,0^FB550,3^A@N,34,34,46055637.FNT^FH\\^CI28^FD{{address}}^FS ^FO8,246^A@N,11,10,46055637.FNT^FH\\^CI28^FDЗаказ №:^FS ^FO8,286^A@N,50,50,46055637.FNT^FH\\^CI28^FD{{orderNumber}}^FS ^FO368,246^A@N,11,10,46055637.FNT^FH\\^CI28^FDДата:^FS ^FO368,286^FB160,2^A@N,40,40,46055637.FNT^FH\\^CI28^FD{{deliveryDate}}^FS ^FO579,58^A@N,11,10,46055637.FNT^FH\\^CI28^FDМесто:^FS ^FO585,110^FB220,1,0,C^A@N,113,112,46055637.FNT^FH\\^CI28^FD{{currentLabel}}^FS ^FO579,246^A@N,11,10,46055637.FNT^FH\\^CI28^FDВсего мест:^FS ^FO585,270^FB220,1,0,C^A@N,89,89,46055637.FNT^FH\\^CI28^FD{{totalLabels}}^FS ^FO100,380^FB700,1,0,L^A@N,15,15,59303640.FNT^FH\\^CI28^FD{{deliveryDateBarcode}}^FS ^FO0,380^FB700,1,0,R^A@N,15,15,59303640.FNT^FH\\^CI28^FD{{pieceNumberBarcode}}^FS ^LRY ^FO325,370^GB150,30,30,,3^FS ^FO0,375^FB800,1,0,C^A@N,24,24,46055637.FNT^FH\\^CI28^FD{{orderNumber}}^FS ^LRN ^BY3,3,60^FO50,415^BCN,,N,N ^FH\\^FD{{orderNumberBarcode}}^FS ^PQ1,0,1,Y ^XZ';
}

/**
 * Архивация заказа
 * @param id - ID заказа для архивации
 * @returns Promise с результатом операции
 */
export const archiveOrder = async (id: string): Promise<boolean> => {
  try {
    // Проверяем доступность Electron API для обхода CORS
    if (window.electronAPI) {
      console.log('[API] Используем Electron API для архивации заказа');
      const api = window.electronAPI as ElectronAPI;
      const result = await api.archiveOrder(id);

      if (result.success && result.data) {
        const response = result.data as ArchiveResponse;
        return response.success === true || response.status === 'success';
      } else {
        throw new ApiError(result.error || 'Ошибка при архивации заказа через Electron API');
      }
    } else {
      // Запасной вариант для случаев, когда Electron API недоступно
      const endpoint = `${API_ENDPOINTS.archive}/${id}`;
      const response = await fetchApi<ArchiveResponse>(
        endpoint,
        'PATCH',
        undefined,
        'archiveOrder'
      );

      return response.success === true || response.status === 'success';
    }
  } catch (error) {
    // В случае ошибки в development режиме имитируем успешный ответ
    if (getEnvironment().mode === 'development') {
      console.warn('[API] Ошибка при архивации заказа, имитируем успешный ответ:', error);
      return true;
    }

    // Пробрасываем ошибки API
    if (error instanceof ApiError) {
      throw error;
    }

    return handleApiError(error, 'archiveOrder');
  }
};

/**
 * Обновление статуса заказа
 * @param id - ID заказа для обновления
 * @param status - Новый статус заказа
 * @returns Promise с результатом операции
 * @updated 2025-06-08
 */
export const updateOrderStatus = async (
  id: string,
  status: 'NEW' | 'ARCHIVE'
): Promise<boolean> => {
  try {
    // Проверяем доступность Electron API для обхода CORS
    if (window.electronAPI) {
      console.log('[API] Используем Electron API для обновления статуса заказа');
      const api = window.electronAPI as ElectronAPI;
      const result = await api.updateOrderStatus(id, status);

      if (result.success && result.data) {
        const response = result.data as { success: boolean; result?: ApiOrder };
        return response.success === true;
      } else {
        throw new ApiError(result.error || 'Ошибка при обновлении статуса через Electron API');
      }
    } else {
      // Запасной вариант для случаев, когда Electron API недоступно
      const endpoint = `${API_ENDPOINTS.orders}/${id}`;
      const body = { status };
      const response = await fetchApi<{ success: boolean; result?: ApiOrder }>(
        endpoint,
        'PATCH',
        body,
        'updateOrderStatus'
      );

      return response.success === true;
    }
  } catch (error) {
    // В случае ошибки в development режиме имитируем успешный ответ
    if (getEnvironment().mode === 'development') {
      console.warn('[API] Ошибка при обновлении статуса заказа, имитируем успешный ответ:', error);
      return true;
    }
    // Пробрасываем ошибки API
    if (error instanceof ApiError) {
      throw error;
    }

    return handleApiError(error, 'updateOrderStatus');
  }
};
