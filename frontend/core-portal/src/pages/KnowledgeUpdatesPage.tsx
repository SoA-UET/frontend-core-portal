import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, ChevronRight, RefreshCw, Filter } from 'lucide-react';
import { knowledgeUpdateService } from '../services';
import { KnowledgeUpdate, KnowledgeUpdateListResponse } from '../types';
import { format } from 'date-fns';

function KnowledgeUpdatesPage() {
  const [data, setData] = useState<KnowledgeUpdateListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('');
  const [page, setPage] = useState(1);

  const fetchUpdates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await knowledgeUpdateService.getUpdates({
        status: statusFilter || undefined,
        pageNumber: page,
        pageSize: 20,
      });
      setData(response);
    } catch (err) {
      console.error('Failed to fetch updates:', err);
      setError('Không thể tải danh sách cập nhật');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, [statusFilter, page]);

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

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Cập nhật kiến thức</h1>
          <p className="text-text-muted">Duyệt các bản cập nhật kiến thức từ đối tác</p>
        </div>
        <button onClick={fetchUpdates} className="btn btn-secondary">
          <RefreshCw size={18} />
          Làm mới
        </button>
      </div>

      {/* Summary cards */}
      {data?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div
            className={`card cursor-pointer transition-all ${
              statusFilter === '' ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setStatusFilter('')}
          >
            <p className="text-sm text-text-muted">Tổng số</p>
            <p className="text-2xl font-bold text-text-main">{data.summary.total}</p>
          </div>
          <div
            className={`card cursor-pointer transition-all ${
              statusFilter === 'pending' ? 'ring-2 ring-status-warning' : ''
            }`}
            onClick={() => setStatusFilter('pending')}
          >
            <p className="text-sm text-text-muted">Chờ duyệt</p>
            <p className="text-2xl font-bold text-status-warning">{data.summary.pending}</p>
          </div>
          <div
            className={`card cursor-pointer transition-all ${
              statusFilter === 'approved' ? 'ring-2 ring-status-success' : ''
            }`}
            onClick={() => setStatusFilter('approved')}
          >
            <p className="text-sm text-text-muted">Đã duyệt</p>
            <p className="text-2xl font-bold text-status-success">{data.summary.approved}</p>
          </div>
          <div
            className={`card cursor-pointer transition-all ${
              statusFilter === 'rejected' ? 'ring-2 ring-status-error' : ''
            }`}
            onClick={() => setStatusFilter('rejected')}
          >
            <p className="text-sm text-text-muted">Từ chối</p>
            <p className="text-2xl font-bold text-status-error">{data.summary.rejected}</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-text-muted" />
            <span className="text-sm font-medium text-text-main">Lọc theo trạng thái:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setPage(1);
            }}
            className="w-48"
          >
            <option value="">Tất cả</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-status-error">{error}</div>
        ) : (
          <>
            <table>
              <thead className="bg-background">
                <tr>
                  <th className="text-xs uppercase text-text-muted font-medium">ID</th>
                  <th className="text-xs uppercase text-text-muted font-medium">Đối tác</th>
                  <th className="text-xs uppercase text-text-muted font-medium">Trạng thái</th>
                  <th className="text-xs uppercase text-text-muted font-medium">Người duyệt</th>
                  <th className="text-xs uppercase text-text-muted font-medium">Ngày tạo</th>
                  <th className="text-xs uppercase text-text-muted font-medium">Ngày duyệt</th>
                  <th className="text-xs uppercase text-text-muted font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.updates.map((update) => (
                  <tr key={update.id} className="hover:bg-gray-50">
                    <td className="font-mono text-sm text-text-muted">
                      {update.id.substring(0, 8)}...
                    </td>
                    <td className="font-medium text-text-main">{update.partner_id}</td>
                    <td>{getStatusBadge(update.status)}</td>
                    <td className="text-text-muted">{update.validator_id || '-'}</td>
                    <td className="text-sm text-text-muted">
                      {format(new Date(update.created_at), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="text-sm text-text-muted">
                      {update.validated_at
                        ? format(new Date(update.validated_at), 'dd/MM/yyyy HH:mm')
                        : '-'}
                    </td>
                    <td className="text-right">
                      <Link
                        to={`/knowledge-updates/${update.id}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                      >
                        Xem chi tiết
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {data?.updates.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-text-muted py-8">
                      Không có bản cập nhật nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {data && data.total_pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-text-muted">
                  Trang {data.page} / {data.total_pages} (Tổng: {data.total_count} bản ghi)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="btn btn-secondary text-sm disabled:opacity-50"
                  >
                    Trang trước
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                    disabled={page >= data.total_pages}
                    className="btn btn-secondary text-sm disabled:opacity-50"
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default KnowledgeUpdatesPage;
