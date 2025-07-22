import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { showMessage } from 'react-native-flash-message';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface ApiError {
  message: string;
  details?: any;
  statusCode?: number;
}

class ApiServiceClass {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      async (config) => {
        // Add auth token if available
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Handle 401 errors (token expired)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Try to refresh token
            const refreshToken = await SecureStore.getItemAsync('refresh_token');
            if (refreshToken) {
              const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
                refreshToken,
              });

              const { token } = response.data;
              await SecureStore.setItemAsync('auth_token', token);

              // Retry original request
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.instance(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, clear tokens and redirect to login
            await SecureStore.deleteItemAsync('auth_token');
            await SecureStore.deleteItemAsync('refresh_token');
            await SecureStore.deleteItemAsync('user_data');
            
            // You might want to dispatch a logout action here
            showMessage({
              message: 'Sessão expirada',
              description: 'Faça login novamente',
              type: 'warning',
            });
          }
        }

        // Handle other errors
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  private handleError(error: AxiosError) {
    const errorMessage = this.getErrorMessage(error);
    
    // Don't show error messages for certain endpoints
    const silentEndpoints = ['/api/auth/verify', '/api/auth/refresh'];
    const shouldShowError = !silentEndpoints.some(endpoint => 
      error.config?.url?.includes(endpoint)
    );

    if (shouldShowError) {
      showMessage({
        message: 'Erro',
        description: errorMessage,
        type: 'danger',
      });
    }
  }

  private getErrorMessage(error: AxiosError): string {
    if (error.response?.data) {
      const data = error.response.data as any;
      return data.message || data.error || 'Erro desconhecido';
    }

    if (error.request) {
      return 'Erro de conexão. Verifique sua internet.';
    }

    return error.message || 'Erro inesperado';
  }

  // Public methods
  async get<T = any>(url: string, config?: any): Promise<AxiosResponse<T>> {
    return this.instance.get(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    return this.instance.post(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    return this.instance.put(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    return this.instance.patch(url, data, config);
  }

  async delete<T = any>(url: string, config?: any): Promise<AxiosResponse<T>> {
    return this.instance.delete(url, config);
  }

  // Upload with progress
  async upload<T = any>(
    url: string,
    data: FormData,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<AxiosResponse<T>> {
    return this.instance.post(url, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
  }

  // Download with progress
  async download(
    url: string,
    onDownloadProgress?: (progressEvent: any) => void
  ): Promise<AxiosResponse<Blob>> {
    return this.instance.get(url, {
      responseType: 'blob',
      onDownloadProgress,
    });
  }

  // Set auth token
  setAuthToken(token: string) {
    this.instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Clear auth token
  clearAuthToken() {
    delete this.instance.defaults.headers.common['Authorization'];
  }

  // Get base URL
  getBaseURL(): string {
    return API_BASE_URL;
  }

  // Cancel request
  cancelRequest(source: any) {
    source.cancel('Request cancelled by user');
  }

  // Get cancel token
  getCancelToken() {
    return axios.CancelToken.source();
  }
}

export const ApiService = new ApiServiceClass();