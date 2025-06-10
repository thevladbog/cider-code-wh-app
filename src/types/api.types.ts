// Расширенная модель заказа с полями из API
export interface ApiOrder {
  id: string;
  orderNumber: string;
  deliveryDate: string;
  status: 'NEW' | 'ARCHIVE';
  consignee: string;
  address: string;
  template?: string; // Может отсутствовать в API
  created: string;
  modified: string;
}

/**
 * Базовые типы для API-ответов
 */
export interface ApiResponse {
  success?: boolean;
  status?: string;
  message?: string;
}

/**
 * API-ответ для списка заказов
 */
export interface OrdersResponse {
  result: ApiOrder[];
  total: number;
  page: number;
  limit: number;
  totalPage: number;
  labelTemplate?: string; // Опциональный шаблон этикетки
}

/**
 * API-ответ для операции архивации заказа
 */
export interface ArchiveResponse {
  success: boolean;
  status?: string;
  message?: string;
}

/**
 * Параметры запроса для списка заказов
 */
export interface OrdersQueryParams {
  status?: 'NEW' | 'ARCHIVE';
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Параметры запроса для изменения статуса заказа
 */
export interface OrderStatusUpdateParams {
  status: 'NEW' | 'ARCHIVE';
}

/**
 * API-ответ для операции изменения статуса заказа
 */
export interface UpdateOrderResponse {
  success: boolean;
  result?: ApiOrder;
  message?: string;
}

/**
 * Типы ошибок API
 */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export class NetworkError extends ApiError {
  constructor(message: string) {
    super(message, 0);
    this.name = 'NetworkError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(`Ресурс не найден: ${resource}`, 404);
    this.name = 'NotFoundError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message = 'Ошибка аутентификации') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends ApiError {
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message, 422);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}
