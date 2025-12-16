import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Search, ExternalLink, Key, Copy, Check } from 'lucide-react';
import { partnerService } from '../services';
import { Partner, CreatePartnerRequest, UpdatePartnerRequest } from '../types';
import { format } from 'date-fns';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

function Modal({ isOpen, onClose, children, title }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-card shadow-elevated w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-text-main">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-background rounded-btn">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreatePartnerRequest>({
    name: '',
    base_url: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPartners = async () => {
    setIsLoading(true);
    try {
      const response = await partnerService.getPartners();
      setPartners(response.data || []);
    } catch (err) {
      console.error('Failed to fetch partners:', err);
      setError('Không thể tải danh sách đối tác');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await partnerService.createPartner(formData);
      setIsCreateModalOpen(false);
      setFormData({ name: '', base_url: '' });
      fetchPartners();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Không thể tạo đối tác');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;

    setFormError(null);
    setIsSubmitting(true);

    try {
      const updateData: UpdatePartnerRequest = {
        name: formData.name,
        base_url: formData.base_url,
      };
      await partnerService.updatePartner(selectedPartner.id, updateData);
      setIsEditModalOpen(false);
      setSelectedPartner(null);
      fetchPartners();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Không thể cập nhật đối tác');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (partner: Partner) => {
    if (!confirm(`Bạn có chắc muốn xóa đối tác "${partner.name}"?`)) return;

    try {
      await partnerService.deletePartner(partner.id);
      fetchPartners();
    } catch (err) {
      console.error('Failed to delete partner:', err);
      alert('Không thể xóa đối tác');
    }
  };

  const openEditModal = (partner: Partner) => {
    setSelectedPartner(partner);
    setFormData({
      name: partner.name,
      base_url: partner.base_url,
    });
    setIsEditModalOpen(true);
  };

  const copyApiKey = async (apiKey: string, partnerId: string) => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopiedId(partnerId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const filteredPartners = partners.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.base_url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Quản lý đối tác</h1>
          <p className="text-text-muted">Quản lý kết nối với các đối tác viễn thông</p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: '', base_url: '' });
            setIsCreateModalOpen(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={18} />
          Thêm đối tác
        </button>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted z-10 pointer-events-none" size={20} />
          <input
            type="search"
            placeholder="Tìm kiếm theo tên hoặc URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12"
          />
        </div>
      </div>

      {/* Partner cards */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 text-status-error">{error}</div>
      ) : filteredPartners.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-text-muted">Không tìm thấy đối tác nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPartners.map((partner) => (
            <div key={partner.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-card flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">
                      {partner.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-main">{partner.name}</h3>
                    <p className="text-sm text-text-muted">ID: {partner.id}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditModal(partner)}
                    className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-btn transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(partner)}
                    className="p-2 text-text-muted hover:text-status-error hover:bg-red-50 rounded-btn transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-text-muted uppercase mb-1">Base URL</p>
                  <a
                    href={partner.base_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    {partner.base_url}
                    <ExternalLink size={14} />
                  </a>
                </div>

                <div>
                  <p className="text-xs text-text-muted uppercase mb-1">API Key</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-background px-3 py-2 rounded-btn">
                      <Key size={14} className="text-text-muted" />
                      <span className="text-sm font-mono text-text-main truncate">
                        {partner.api_key.substring(0, 20)}...
                      </span>
                    </div>
                    <button
                      onClick={() => copyApiKey(partner.api_key, partner.id)}
                      className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-btn transition-colors"
                    >
                      {copiedId === partner.id ? (
                        <Check size={16} className="text-status-success" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-text-muted">
                    Tạo lúc: {format(new Date(partner.created_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Thêm đối tác mới"
      >
        <form onSubmit={handleCreate}>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-btn text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-main mb-2">Tên đối tác</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Viettel, Vinaphone..."
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-main mb-2">Base URL</label>
            <input
              type="url"
              value={formData.base_url}
              onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
              placeholder="https://partner.example.com/api"
              required
            />
            <p className="text-xs text-text-muted mt-1">
              Endpoint API của hệ thống Partner
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="btn btn-secondary"
            >
              Hủy
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? 'Đang xử lý...' : 'Thêm đối tác'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Chỉnh sửa đối tác"
      >
        <form onSubmit={handleUpdate}>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-btn text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-main mb-2">Tên đối tác</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-main mb-2">Base URL</label>
            <input
              type="url"
              value={formData.base_url}
              onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="btn btn-secondary"
            >
              Hủy
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? 'Đang xử lý...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default PartnersPage;
