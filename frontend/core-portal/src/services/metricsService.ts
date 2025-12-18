import apiClient, { API_URLS } from './apiClient';
import {
  TotalUsersMetrics,
  ConversationSummaryMetrics,
  SatisfactionMetrics,
  OffloadRateMetrics,
  OffloadByPartnerMetrics,
} from '../types';
import { mockMetrics } from './mockData';

const METRICS_BASE = `${API_URLS.metrics}/api/v1`;

interface DateRangeParams {
  from_date?: string;
  to_date?: string;
}

export const metricsService = {
  /**
   * Get total users (H21.1)
   */
  async getTotalUsers(params?: DateRangeParams): Promise<TotalUsersMetrics> {
    // REAL API CALL
    const response = await apiClient.get(`${METRICS_BASE}/core/metrics/users/total`, { params });
    return response.data;
  },

  /**
   * Get conversation summary (H21.2)
   */
  async getConversationSummary(
    params?: DateRangeParams
  ): Promise<ConversationSummaryMetrics> {
    // REAL API CALL
    const response = await apiClient.get(`${METRICS_BASE}/core/metrics/conversations/summary`, { params });
    return response.data;
  },

  /**
   * Get satisfaction distribution (H21.3)
   */
  async getSatisfactionMetrics(
    params?: DateRangeParams
  ): Promise<SatisfactionMetrics> {
    // REAL API CALL
    const response = await apiClient.get(`${METRICS_BASE}/core/metrics/consultations/satisfaction`, { params });
    return response.data;
  },

  /**
   * Get offload rate (H21.4)
   */
  async getOffloadRate(params?: DateRangeParams): Promise<OffloadRateMetrics> {
    // REAL API CALL
    const response = await apiClient.get(`${METRICS_BASE}/core/metrics/consultations/offload-rate`, { params });
    return response.data;
  },

  /**
   * Get offload rate by partner (H21.5)
   */
  async getOffloadByPartner(
    params?: DateRangeParams & { partner_id?: string }
  ): Promise<OffloadByPartnerMetrics> {
    // REAL API CALL
    const response = await apiClient.get(`${METRICS_BASE}/core/metrics/consultations/offload-rate-by-partner`, { params });
    return response.data;
  },
};

export default metricsService;
