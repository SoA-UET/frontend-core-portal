import { useState } from 'react';
import { Bell, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function TopBar() {
  const { user } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex-1">
        {/* optional left area, page title could be placed here */}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 text-text-muted hover:text-text-main hover:bg-background rounded-btn transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-status-error rounded-full"></span>
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-2 hover:bg-background rounded-btn transition-colors"
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white">
              <User size={18} />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-text-main">
                {user?.full_name || 'Admin'}
              </p>
              <p className="text-xs text-text-muted">{user?.email || 'admin@telcenter.vn'}</p>
            </div>
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-card shadow-elevated border border-gray-100 py-2 z-20">
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-sm text-text-main hover:bg-background"
                >
                  Thông tin cá nhân
                </Link>
                <Link
                  to="#"
                  className="block px-4 py-2 text-sm text-text-main hover:bg-background"
                >
                  Đổi mật khẩu
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopBar;
