import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileCheck2,
  LogOut,
  Phone,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard size={20} />,
  },
  {
    label: 'Nhân viên',
    path: '/employees',
    icon: <Users size={20} />,
  },
  {
    label: 'Đối tác',
    path: '/partners',
    icon: <Building2 size={20} />,
  },
  {
    label: 'Cập nhật kiến thức',
    path: '/knowledge-updates',
    icon: <FileCheck2 size={20} />,
  },
];

function Sidebar() {
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('sidebar.collapsed');
      return v === '1';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sidebar.collapsed', collapsed ? '1' : '0');
    } catch (e) {}
    document.documentElement.style.setProperty('--sidebar-width', collapsed ? '72px' : '260px');
  }, [collapsed]);

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-primary text-white flex flex-col transition-width duration-200 ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
      aria-expanded={!collapsed}
    >
      {/* Logo + toggle */}
      <div className="h-16 flex items-center px-3 border-b border-white/10">
        <button
          onClick={() => setCollapsed((s) => !s)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setCollapsed((s) => !s); }}
          aria-label={collapsed ? 'Mở sidebar' : 'Thu nhỏ sidebar'}
          className="flex items-center justify-center w-10 rounded-full hover:bg-white/10 focus:outline-none cursor-pointer"
          title="Toggle sidebar"
        >
          <Phone size={24} />
        </button>
        {!collapsed && <span className="text-lg font-semibold ml-3">Telcenter Core</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-btn transition-colors ${
                    isActive ? 'bg-white/20 font-medium' : 'hover:bg-white/10'
                  }`
                }
              >
                <div className="flex items-center justify-center w-6">{item.icon}</div>
                <span className={`${collapsed ? 'hidden' : 'block'}`}>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout button */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-btn hover:bg-white/10 transition-colors text-left"
        >
          <LogOut size={20} />
          <span className={`${collapsed ? 'hidden' : 'block'}`}>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
