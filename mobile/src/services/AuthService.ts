import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ApiService } from './ApiService';
import { User } from '../types/User';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  company: string;
}

export class AuthService {
  private static baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

  static async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        email,
        password,
      });

      const { token, refreshToken, user } = response.data;

      // Store tokens securely
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

      // Set default authorization header
      ApiService.setAuthToken(token);

      return { token, refreshToken, user };
    } catch (error) {
      throw error;
    }
  }

  static async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/register`, userData);

      const { token, refreshToken, user } = response.data;

      // Store tokens securely
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

      // Set default authorization header
      ApiService.setAuthToken(token);

      return { token, refreshToken, user };
    } catch (error) {
      throw error;
    }
  }

  static async logout(): Promise<void> {
    try {
      // Call logout endpoint
      await ApiService.post('/api/auth/logout');

      // Clear stored tokens
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);

      // Clear authorization header
      ApiService.clearAuthToken();
    } catch (error) {
      // Even if logout fails, clear local storage
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      ApiService.clearAuthToken();
    }
  }

  static async refreshToken(): Promise<AuthResponse> {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(`${this.baseURL}/api/auth/refresh`, {
        refreshToken,
      });

      const { token, refreshToken: newRefreshToken, user } = response.data;

      // Update stored tokens
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

      // Set default authorization header
      ApiService.setAuthToken(token);

      return { token, refreshToken: newRefreshToken, user };
    } catch (error) {
      // Clear tokens on refresh failure
      await this.logout();
      throw error;
    }
  }

  static async verifyToken(): Promise<AuthResponse> {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userData = await SecureStore.getItemAsync(USER_KEY);

      if (!token || !userData) {
        throw new Error('No stored authentication data');
      }

      // Set token for verification
      ApiService.setAuthToken(token);

      // Verify token with server
      const response = await ApiService.get('/api/auth/verify');
      const user = response.data.user;

      // Update stored user data
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

      return { token, refreshToken: '', user };
    } catch (error) {
      // Clear tokens on verification failure
      await this.logout();
      throw error;
    }
  }

  static async getStoredToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  }

  static async getStoredUser(): Promise<User | null> {
    const userData = await SecureStore.getItemAsync(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  static async forgotPassword(email: string): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/api/auth/forgot-password`, { email });
    } catch (error) {
      throw error;
    }
  }

  static async resetPassword(token: string, password: string): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/api/auth/reset-password`, {
        token,
        password,
      });
    } catch (error) {
      throw error;
    }
  }

  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await ApiService.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
    } catch (error) {
      throw error;
    }
  }

  static async resendVerificationEmail(): Promise<void> {
    try {
      await ApiService.post('/api/auth/resend-verification');
    } catch (error) {
      throw error;
    }
  }

  static async verifyEmail(token: string): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/api/auth/verify-email`, { token });
    } catch (error) {
      throw error;
    }
  }
}