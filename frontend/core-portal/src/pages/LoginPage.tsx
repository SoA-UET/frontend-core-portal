import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ username, password });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
        if (axiosError.response?.status === 401) {
          setError('Sai tên đăng nhập hoặc mật khẩu');
        } else if (axiosError.response?.status === 403) {
          setError('Tài khoản bị khóa hoặc chưa được kích hoạt');
        } else {
          setError(axiosError.response?.data?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
        }
      } else {
        setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12">
        <div className="text-white text-center">
          <div className="flex items-center justify-center mb-8">
            <Phone size={64} />
          </div>
          <h1 className="text-4xl font-bold mb-4">Telcenter Core</h1>
          <p className="text-xl text-white/80 max-w-md">
            Hệ thống quản lý tổng đài tư vấn viễn thông thông minh
          </p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
              <Phone className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-text-main">Telcenter Core</h1>
          </div>

          <div className="card">
            <h2 className="text-2xl font-bold text-text-main mb-2">Đăng nhập</h2>
            <p className="text-text-muted mb-6">
              Đăng nhập vào hệ thống quản trị Telcenter Core
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-btn flex items-start gap-3">
                <AlertCircle className="text-status-error flex-shrink-0 mt-0.5\" size={20} />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-text-main mb-2"
                >
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  required
                  autoComplete="username"
                  className="w-full"
                />
              </div>

              <div className="mb-6">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-text-main mb-2"
                >
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    required
                    autoComplete="current-password"
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-text-main"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Đăng nhập'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <a href="#" className="text-sm text-primary hover:underline">
                Quên mật khẩu?
              </a>
            </div>
          </div>

          <p className="text-center text-text-muted text-sm mt-6">
            © 2025 Telcenter. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
