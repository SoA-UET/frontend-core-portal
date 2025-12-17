import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Search, UserCheck, UserX, Lock } from 'lucide-react';
import { employeeService } from '../services';
import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest } from '../types';

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

function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateEmployeeRequest>({
    full_name: '',
    role_id: "694025ac0496f58b284da759", // Default ( Nhân viên kiểm duyệt dữ liệu )
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ROLES = [
    { id: '694025ac0496f58b284da758', name: 'ADMIN' },
    { id: '694025ac0496f58b284da759', name: 'Nhân viên kiểm duyệt dữ liệu' },
  ];

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const response = await employeeService.getEmployees();
      setEmployees(response.employees || []);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      setError('Không thể tải danh sách nhân viên');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await employeeService.createEmployee(formData);
      setIsCreateModalOpen(false);
      setFormData({ full_name: '', role_id: '694025ac0496f58b284da759' });
      fetchEmployees();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Không thể tạo nhân viên');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    setFormError(null);
    setIsSubmitting(true);

    try {
      const updateData: UpdateEmployeeRequest = {
        full_name: formData.full_name,
        role_id: formData.role_id,
      };
      await employeeService.updateEmployee(selectedEmployee.employee_id, updateData);
      setIsEditModalOpen(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Không thể cập nhật nhân viên');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`Bạn có chắc muốn khóa tài khoản "${employee.full_name}"?`)) return;

    try {
      await employeeService.deleteEmployee(employee.employee_id, true);
      fetchEmployees();
    } catch (err) {
      console.error('Failed to delete employee:', err);
      alert('Không thể khóa tài khoản nhân viên');
    }
  };

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    // Try to match employee role string with ROLES name
    const matched = ROLES.find((r) => 
      r.name.toLowerCase().includes(employee.role?.toLowerCase() || '')
    );
    setFormData({
      full_name: employee.full_name,
      role_id: matched ? matched.id : ROLES[1].id,
    });
    setIsEditModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge badge-success"><UserCheck size={14} className="mr-1" />Hoạt động</span>;
      case 'INACTIVE':
        return <span className="badge badge-warning"><UserX size={14} className="mr-1" />Chưa kích hoạt</span>;
      case 'LOCKED':
        return <span className="badge badge-error"><Lock size={14} className="mr-1" />Đã khóa</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const filteredEmployees = employees.filter((e) =>
    e.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Quản lý nhân viên</h1>
          <p className="text-text-muted">Quản lý tài khoản nhân viên Telcenter Core</p>
        </div>
        <button
          onClick={() => {
            setFormData({ full_name: '', role_id: '694025ac0496f58b284da759' });
            setIsCreateModalOpen(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={18} />
          Thêm nhân viên
        </button>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted z-10 pointer-events-none" size={20} />
          <input
            type="search"
            placeholder="Tìm kiếm theo tên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12"
          />
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
          <table>
            <thead className="bg-background">
              <tr>
                <th className="text-xs uppercase text-text-muted font-medium">Họ tên</th>
                <th className="text-xs uppercase text-text-muted font-medium">Vai trò</th>
                <th className="text-xs uppercase text-text-muted font-medium">Trạng thái</th>
                <th className="text-xs uppercase text-text-muted font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.map((employee) => (
                <tr key={employee.employee_id} className="hover:bg-gray-50">
                  <td className="font-medium text-text-main">{employee.full_name}</td>
                  <td>{employee.role}</td>
                  <td>{getStatusBadge(employee.status)}</td>
                  <td className="text-right">
                    <button
                      onClick={() => openEditModal(employee)}
                      className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-btn transition-colors mr-1"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(employee)}
                      className="p-2 text-text-muted hover:text-status-error hover:bg-red-50 rounded-btn transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-text-muted py-8">
                    Không tìm thấy nhân viên nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Thêm nhân viên mới"
      >
        <form onSubmit={handleCreate}>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-btn text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-main mb-2">Họ tên</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-main mb-2">Vai trò</label>
            <select
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
            >
              {ROLES.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
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
              {isSubmitting ? 'Đang xử lý...' : 'Thêm nhân viên'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Chỉnh sửa nhân viên"
      >
        <form onSubmit={handleUpdate}>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-btn text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-main mb-2">Họ tên</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-main mb-2">Vai trò</label>
            <select
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
            >
              {ROLES.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
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

export default EmployeesPage;
