import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';

function MainLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div style={{ marginLeft: 'var(--sidebar-width, 260px)' }}>
        <TopBar />
        
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
