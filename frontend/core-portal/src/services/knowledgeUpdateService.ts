import apiClient, { API_URLS } from './apiClient';
import {
  KnowledgeUpdate,
  KnowledgeUpdateDetail,
  KnowledgeUpdateListResponse,
  ApiResponse,
} from '../types';
import { mockKnowledgeUpdates, mockUpdateDetail } from './mockData';

const UPDATES_BASE = `${API_URLS.knowledgeValidator}/api/v1/partner-updates`;

interface ListParams {
  status?: 'pending' | 'approved' | 'rejected';
  partner_id?: string;
  pageNumber?: number;
  pageSize?: number;
}

export const knowledgeUpdateService = {
  /**
   * Get list of knowledge updates (H22 GET /api/v1/partner-updates)
   */
  async getUpdates(params?: ListParams): Promise<KnowledgeUpdateListResponse> {
    // REAL API CALL
    const response = await apiClient.get(UPDATES_BASE, { params });
    return response.data;
  },

  /**
   * Get update details (H22 GET /api/v1/partner-updates/{update_id})
   */
  async getUpdateDetail(
    updateId: string
  ): Promise<{ status: string; update: KnowledgeUpdateDetail }> {
    // REAL API CALL
    const response = await apiClient.get(`${UPDATES_BASE}/${updateId}`);
    return response.data;
  },

  /**
   * Approve update (H22 POST /api/v1/partner-updates/{update_id}/approve)
   */
  async approveUpdate(
    updateId: string
  ): Promise<{ status: string; update: KnowledgeUpdate }> {
    // REAL API CALL
    const response = await apiClient.post(`${UPDATES_BASE}/${updateId}/approve`, {});
    return response.data;
  },

  /**
   * Reject update (H22 POST /api/v1/partner-updates/{update_id}/reject)
   */
  async rejectUpdate(
    updateId: string
  ): Promise<{ status: string; update: KnowledgeUpdate }> {
    // REAL API CALL
    const response = await apiClient.post(`${UPDATES_BASE}/${updateId}/reject`, {});
    return response.data;
  },
};

export default knowledgeUpdateService;
