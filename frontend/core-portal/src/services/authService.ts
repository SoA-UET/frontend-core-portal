import apiClient, { API_URLS } from './apiClient';
import { LoginCredentials, AuthResponse, User } from '../types';

const AUTH_BASE = `${API_URLS.identity}/api/v1`;

export const authService = {
  /**
   * Login with username and password (H23 Endpoint 1)
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      `${AUTH_BASE}/core-auth/login`,
      credentials
    );
    return response.data;
  },

  /**
   * Store auth data in localStorage
   */
  setAuthData(token: string, user: User): void {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  /**
   * Get current user from localStorage
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Get access token
   */
  getToken(): string | null {
    return localStorage.getItem('access_token');
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  /**
   * Logout - clear auth data
   */
  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  },
};

export default authService;
