// User types
export interface User {
  id: string;
  email: string;
  full_name: string;
  role?: string;
  permissions: string[];
  is_active?: boolean;
  created_at?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  status: string;
  access_token: string;
  token_type: string;
  expires_in: number;
  message?: string;
  user?: User;
  admin?: {
    employee_id: string;
    full_name: string;
    role: string;
    status: string;
    email?: string;
  };
}

// Employee types (H23)
export interface Employee {
  employee_id: number;
  full_name: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  created_at: string;
  partner_id?: number;
}

export interface CreateEmployeeRequest {
  full_name: string;
  role_id: number;
  partner_id?: number | null;
}

export interface UpdateEmployeeRequest {
  full_name?: string;
  role_id?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
}

// Partner types (H24)
export interface Partner {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePartnerRequest {
  name: string;
  base_url: string;
}

export interface UpdatePartnerRequest {
  name?: string;
  api_key?: string;
  base_url?: string;
}

// Knowledge Update types (H22)
export interface KnowledgeUpdate {
  id: string;
  partner_id: string;
  status: 'pending' | 'approved' | 'rejected';
  validator_id: string | null;
  created_at: string;
  validated_at: string | null;
}

export interface KnowledgeUpdateDetail extends KnowledgeUpdate {
  faqs: FAQ[];
  packages: Package[];
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface Package {
  'Mã dịch vụ': string;
  'Thời gian thanh toán': string;
  'Các dịch vụ tiên quyết': string;
  'Giá (VNĐ)': number;
  'Chu kỳ (ngày)': number;
  '4G tốc độ tiêu chuẩn/ngày': number;
  '4G tốc độ cao/ngày': number;
  '4G tốc độ tiêu chuẩn/chu kỳ': number;
  '4G tốc độ cao/chu kỳ': number;
  'Gọi nội mạng': string;
  'Gọi ngoại mạng': string;
  'Tin nhắn': string;
  'Chi tiết': string;
  'Tự động gia hạn': string;
  'Cú pháp đăng ký': string;
}

export interface KnowledgeUpdateListResponse {
  status: string;
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
  updates: KnowledgeUpdate[];
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

// Metrics types (H21)
export interface TotalUsersMetrics {
  status: string;
  total_customers: number;
  from_date: string;
  to_date: string;
}

export interface ConversationSummaryMetrics {
  status: string;
  total_conversations: number;
  texting_conversations: number;
  calling_conversations: number;
  from_date: string;
  to_date: string;
}

export interface SatisfactionMetrics {
  status: string;
  total_conversations: number;
  satisfaction_distribution: {
    satisfaction_1: number;
    satisfaction_2: number;
    satisfaction_3: number;
    satisfaction_4: number;
    satisfaction_5: number;
  };
  average_rating: number;
  from_date: string;
  to_date: string;
}

export interface OffloadRateMetrics {
  status: string;
  total_conversations: number;
  ai_failed_conversation: number;
  offloaded_conversations: number;
  offload_rate_percentage: number;
  from_date: string;
  to_date: string;
}

export interface PartnerOffloadMetrics {
  partner_id: string;
  partner_name: string;
  total_conversations: number;
  offloaded_conversations: number;
  ai_failed_conversations: number;
  offload_rate_percentage: number;
}

export interface OffloadByPartnerMetrics {
  status: string;
  partners: PartnerOffloadMetrics[];
  from_date: string;
  to_date: string;
}

// API Response types
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  error_code?: string;
  details?: string;
}
