// Mock data for frontend testing without backend services

import {
  Employee,
  Partner,
  KnowledgeUpdate,
  KnowledgeUpdateDetail,
  MetricsResponse,
} from '../types';

export const mockEmployees: Employee[] = [
  {
    id: 'emp-001',
    username: 'admin',
    email: 'admin@telcenter.com',
    full_name: 'Nguyễn Văn Admin',
    role: 'core_admin',
    permissions: ['read:all', 'write:all', 'delete:all'],
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'emp-002',
    username: 'validator01',
    email: 'validator@telcenter.com',
    full_name: 'Trần Thị Kiểm Duyệt',
    role: 'knowledge_validator',
    permissions: ['read:knowledge', 'validate:knowledge'],
    is_active: true,
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'emp-003',
    username: 'viewer01',
    email: 'viewer@telcenter.com',
    full_name: 'Lê Văn Xem',
    role: 'viewer',
    permissions: ['read:dashboard'],
    is_active: false,
    created_at: '2025-03-20T00:00:00Z',
  },
];

export const mockPartners: Partner[] = [
  {
    id: 'partner-001',
    name: 'Viettel Telecom',
    api_key: 'vt_api_key_abc123xyz789',
    contact_email: 'contact@viettel.com.vn',
    contact_phone: '0123456789',
    is_active: true,
    created_at: '2025-01-10T00:00:00Z',
  },
  {
    id: 'partner-002',
    name: 'Vinaphone',
    api_key: 'vp_api_key_def456uvw012',
    contact_email: 'support@vinaphone.com.vn',
    contact_phone: '0987654321',
    is_active: true,
    created_at: '2025-02-05T00:00:00Z',
  },
  {
    id: 'partner-003',
    name: 'MobiFone',
    api_key: 'mb_api_key_ghi789rst345',
    contact_email: 'info@mobifone.vn',
    contact_phone: '0369852147',
    is_active: false,
    created_at: '2025-03-12T00:00:00Z',
  },
];

export const mockKnowledgeUpdates: KnowledgeUpdate[] = [
  {
    id: 'update-001',
    partner_id: 'partner-001',
    status: 'pending',
    validator_id: null,
    created_at: '2025-12-16T08:30:00Z',
    validated_at: null,
  },
  {
    id: 'update-002',
    partner_id: 'partner-002',
    status: 'approved',
    validator_id: 'emp-002',
    created_at: '2025-12-15T14:20:00Z',
    validated_at: '2025-12-15T16:45:00Z',
  },
  {
    id: 'update-003',
    partner_id: 'partner-001',
    status: 'pending',
    validator_id: null,
    created_at: '2025-12-15T10:15:00Z',
    validated_at: null,
  },
  {
    id: 'update-004',
    partner_id: 'partner-003',
    status: 'rejected',
    validator_id: 'emp-002',
    created_at: '2025-12-14T09:00:00Z',
    validated_at: '2025-12-14T11:30:00Z',
  },
  {
    id: 'update-005',
    partner_id: 'partner-002',
    status: 'approved',
    validator_id: 'emp-001',
    created_at: '2025-12-13T15:45:00Z',
    validated_at: '2025-12-13T17:00:00Z',
  },
];

export const mockUpdateDetail: KnowledgeUpdateDetail = {
  id: 'update-001',
  partner_id: 'partner-001',
  status: 'pending',
  validator_id: null,
  created_at: '2025-12-16T08:30:00Z',
  validated_at: null,
  packages: [
    {
      'Mã dịch vụ': 'ST70K',
      'Giá (VNĐ)': 70000,
      'Chu kỳ (ngày)': 30,
      '4G tốc độ cao/ngày': 2,
      '4G tốc độ tiêu chuẩn/ngày': 3,
      'Tự động gia hạn': 'Có',
      'Cú pháp đăng ký': 'ST70K',
    },
    {
      'Mã dịch vụ': 'ST90K',
      'Giá (VNĐ)': 90000,
      'Chu kỳ (ngày)': 30,
      '4G tốc độ cao/ngày': 3,
      '4G tốc độ tiêu chuẩn/ngày': 4,
      'Tự động gia hạn': 'Có',
      'Cú pháp đăng ký': 'ST90K',
    },
    {
      'Mã dịch vụ': 'MAX200',
      'Giá (VNĐ)': 200000,
      'Chu kỳ (ngày)': 30,
      '4G tốc độ cao/ngày': 6,
      '4G tốc độ tiêu chuẩn/ngày': 10,
      'Tự động gia hạn': 'Có',
      'Cú pháp đăng ký': 'MAX200',
    },
  ],
  faqs: [
    {
      question: 'Làm thế nào để đăng ký gói cước ST70K?',
      answer: 'Soạn tin ST70K gửi 191 để đăng ký gói cước này.',
    },
    {
      question: 'Gói cước có tự động gia hạn không?',
      answer: 'Có, tất cả các gói cước đều được tự động gia hạn khi hết hạn nếu tài khoản đủ số dư.',
    },
    {
      question: 'Khi hết dung lượng 4G tốc độ cao thì sao?',
      answer: 'Bạn vẫn có thể sử dụng với tốc độ tiêu chuẩn cho đến hết chu kỳ.',
    },
  ],
};

export const mockMetrics: MetricsResponse = {
  total_partners: 15,
  active_partners: 12,
  total_updates: 248,
  pending_updates: 18,
  approved_updates: 205,
  rejected_updates: 25,
  updates_by_status: [
    { status: 'pending', count: 18 },
    { status: 'approved', count: 205 },
    { status: 'rejected', count: 25 },
  ],
  updates_by_partner: [
    { partner_id: 'partner-001', partner_name: 'Viettel', count: 95 },
    { partner_id: 'partner-002', partner_name: 'Vinaphone', count: 78 },
    { partner_id: 'partner-003', partner_name: 'MobiFone', count: 45 },
    { partner_id: 'partner-004', partner_name: 'Vietnamobile', count: 30 },
  ],
  updates_timeline: [
    { date: '2025-12-09', count: 8 },
    { date: '2025-12-10', count: 12 },
    { date: '2025-12-11', count: 15 },
    { date: '2025-12-12', count: 10 },
    { date: '2025-12-13', count: 18 },
    { date: '2025-12-14', count: 14 },
    { date: '2025-12-15', count: 20 },
    { date: '2025-12-16', count: 16 },
  ],
  period: {
    start: '2025-12-01',
    end: '2025-12-16',
  },
};
