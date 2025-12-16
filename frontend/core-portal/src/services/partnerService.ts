import apiClient, { API_URLS } from './apiClient';
import {
  Partner,
  CreatePartnerRequest,
  UpdatePartnerRequest,
  ApiResponse,
} from '../types';
import { mockPartners } from './mockData';

const PARTNERS_BASE = `${API_URLS.partnerManagement}/api/v1/partners`;

export const partnerService = {
  /**
   * Get list of partners (H24 GET /api/v1/partners)
   */
  async getPartners(): Promise<{ data: Partner[] }> {
    // REAL API CALL
    const response = await apiClient.get(PARTNERS_BASE);
    return response.data;
  },

  /**
   * Create new partner (H24 POST /api/v1/partners)
   */
  async createPartner(data: CreatePartnerRequest): Promise<ApiResponse<Partner>> {
    // REAL API CALL
    const response = await apiClient.post(PARTNERS_BASE, data);
    return response.data;
  },

  /**
   * Update partner (H24 PATCH /api/v1/partners/:id)
   */
  async updatePartner(
    partnerId: string,
    data: UpdatePartnerRequest
  ): Promise<ApiResponse<Partner>> {
    // REAL API CALL
    const response = await apiClient.patch(`${PARTNERS_BASE}/${partnerId}`, data);
    return response.data;
  },

  /**
   * Delete partner (H24 DELETE /api/v1/partners/:id)
   */
  async deletePartner(partnerId: string): Promise<ApiResponse<null>> {
    // REAL API CALL
    const response = await apiClient.delete(`${PARTNERS_BASE}/${partnerId}`);
    return response.data;
  },
};

export default partnerService;
