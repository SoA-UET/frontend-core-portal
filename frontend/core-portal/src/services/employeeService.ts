import apiClient, { API_URLS } from './apiClient';
import {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  ApiResponse,
} from '../types';
import { mockEmployees } from './mockData';

const EMPLOYEES_BASE = `${API_URLS.identity}/api/v1/core-employees`;

export const employeeService = {
  /**
   * Get list of employees (H23 Endpoint 2)
   */
  async getEmployees(): Promise<{ employees: Employee[] }> {
    // REAL API CALL
    const response = await apiClient.get<{ status: string; total: number; employees: Employee[] }>(EMPLOYEES_BASE);
    // Return only the employees array to match frontend expectation
    return { employees: response.data.employees };
  },

  /**
   * Create new employee (H23 Endpoint 3)
   */
  async createEmployee(data: CreateEmployeeRequest): Promise<ApiResponse<{ employee_id: number }>> {
    // REAL API CALL
    const response = await apiClient.post<{ status: string; employee_id: number; message: string }>(EMPLOYEES_BASE, data);
    return {
      status: response.data.status as 'success' | 'error',
      data: { employee_id: response.data.employee_id },
      message: response.data.message,
    };
  },

  /**
   * Update employee (H23 Endpoint 4)
   */
  async updateEmployee(
    employeeId: number,
    data: UpdateEmployeeRequest
  ): Promise<ApiResponse<null>> {
    // REAL API CALL
    const response = await apiClient.put<{ status: string; message: string }>(`${EMPLOYEES_BASE}/${employeeId}`, data);
    return {
      status: response.data.status as 'success' | 'error',
      data: null,
      message: response.data.message,
    };
  },

  /**
   * Delete/disable employee (H23 Endpoint 5)
   */
  async deleteEmployee(
    employeeId: number,
    lockOnly: boolean = true
  ): Promise<ApiResponse<null>> {
    // REAL API CALL
    const response = await apiClient.delete<{ status: string; message: string }>(
      `${EMPLOYEES_BASE}/${employeeId}`,
      { params: lockOnly ? { lock_only: true } : undefined }
    );
    return {
      status: response.data.status as 'success' | 'error',
      data: null,
      message: response.data.message,
    };
  },
};

export default employeeService;
