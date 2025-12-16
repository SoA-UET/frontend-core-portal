import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  HelpCircle,
  User,
  Calendar,
  Building2,
} from 'lucide-react';
import { knowledgeUpdateService } from '../services';
import { KnowledgeUpdateDetail } from '../types';
import { format } from 'date-fns';

function KnowledgeUpdateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [update, setUpdate] = useState<KnowledgeUpdateDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'packages' | 'faqs'>('packages');

  const fetchUpdate = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await knowledgeUpdateService.getUpdateDetail(id);
      setUpdate(response.update);
    } catch (err) {
      console.error('Failed to fetch update:', err);
      setError('Không thể tải chi tiết bản cập nhật');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdate();
  }, [id]);

  const handleApprove = async () => {
    if (!id || !confirm('Bạn có chắc muốn duyệt bản cập nhật này?')) return;

    setIsProcessing(true);
    try {
      await knowledgeUpdateService.approveUpdate(id);
      fetchUpdate();
    } catch (err) {
      console.error('Failed to approve update:', err);
      alert('Không thể duyệt bản cập nhật');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!id || !confirm('Bạn có chắc muốn từ chối bản cập nhật này?')) return;

    setIsProcessing(true);
    try {
      await knowledgeUpdateService.rejectUpdate(id);
      fetchUpdate();
    } catch (err) {
      console.error('Failed to reject update:', err);
      alert('Không thể từ chối bản cập nhật');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="badge badge-warning">
            <Clock size={14} className="mr-1" />
            Chờ duyệt
          </span>
        );
      case 'approved':
        return (
          <span className="badge badge-success">
            <CheckCircle size={14} className="mr-1" />
            Đã duyệt
          </span>
        );
      case 'rejected':
        return (
          <span className="badge badge-error">
            <XCircle size={14} className="mr-1" />
            Từ chối
          </span>
        );
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !update) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-status-error mb-4">{error || 'Không tìm thấy bản cập nhật'}</p>
        <button onClick={() => navigate('/knowledge-updates')} className="btn btn-primary">
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/knowledge-updates"
            className="p-2 hover:bg-background rounded-btn transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-main">Chi tiết bản cập nhật</h1>
            <p className="text-text-muted font-mono text-sm">{update.id}</p>
          </div>
        </div>
        {update.status === 'pending' && (
          <div className="flex gap-3">
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="btn btn-danger disabled:opacity-50"
            >
              <XCircle size={18} />
              Từ chối
            </button>
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="btn btn-success disabled:opacity-50"
            >
              <CheckCircle size={18} />
              Duyệt
            </button>
          </div>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-btn">
              <Building2 className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase">Đối tác</p>
              <p className="font-medium text-text-main">{update.partner_id}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-btn">
              <Clock className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase">Trạng thái</p>
              {getStatusBadge(update.status)}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-btn">
              <Calendar className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase">Ngày tạo</p>
              <p className="font-medium text-text-main">
                {format(new Date(update.created_at), 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-btn">
              <User className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase">Người duyệt</p>
              <p className="font-medium text-text-main">{update.validator_id || 'Chưa có'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="flex border-b border-gray-100 mb-4">
          <button
            onClick={() => setActiveTab('packages')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'packages'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-text-muted hover:text-text-main'
            }`}
          >
            <Package size={18} />
            Gói cước ({update.packages?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('faqs')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'faqs'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-text-muted hover:text-text-main'
            }`}
          >
            <HelpCircle size={18} />
            FAQ ({update.faqs?.length || 0})
          </button>
        </div>

        {/* Packages tab */}
        {activeTab === 'packages' && (
          <div className="overflow-x-auto">
            {update.packages?.length === 0 ? (
              <p className="text-text-muted text-center py-8">Không có gói cước nào</p>
            ) : (
              <table className="min-w-full">
                <thead className="bg-background">
                  <tr>
                    <th className="text-xs uppercase text-text-muted font-medium">Mã dịch vụ</th>
                    <th className="text-xs uppercase text-text-muted font-medium">Giá (VNĐ)</th>
                    <th className="text-xs uppercase text-text-muted font-medium">Chu kỳ</th>
                    <th className="text-xs uppercase text-text-muted font-medium">4G/ngày</th>
                    <th className="text-xs uppercase text-text-muted font-medium">Gia hạn</th>
                    <th className="text-xs uppercase text-text-muted font-medium">Cú pháp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {update.packages?.map((pkg, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="font-medium text-text-main">{pkg['Mã dịch vụ']}</td>
                      <td>{pkg['Giá (VNĐ)']?.toLocaleString()}</td>
                      <td>{pkg['Chu kỳ (ngày)']} ngày</td>
                      <td>
                        {pkg['4G tốc độ cao/ngày']}GB cao / {pkg['4G tốc độ tiêu chuẩn/ngày']}GB chuẩn
                      </td>
                      <td>{pkg['Tự động gia hạn']}</td>
                      <td className="font-mono text-sm">{pkg['Cú pháp đăng ký']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* FAQs tab */}
        {activeTab === 'faqs' && (
          <div>
            {update.faqs?.length === 0 ? (
              <p className="text-text-muted text-center py-8">Không có FAQ nào</p>
            ) : (
              <div className="space-y-4">
                {update.faqs?.map((faq, idx) => (
                  <div key={idx} className="p-4 bg-background rounded-card">
                    <p className="font-medium text-text-main mb-2">
                      <span className="text-primary">Q{idx + 1}:</span> {faq.question}
                    </p>
                    <p className="text-text-muted pl-4 border-l-2 border-primary/30">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default KnowledgeUpdateDetailPage;
