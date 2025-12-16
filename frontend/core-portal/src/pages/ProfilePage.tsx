import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function ProfilePage() {
  const { user, setUser } = useAuth() as any;
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // For mock mode we'll just update local user object
    try {
      const updated = { ...user, full_name: fullName, email };
      // If avatarFile provided, in real app we'd upload and get URL
      if (avatarFile) {
        // simulate an avatar URL
        (updated as any).avatar = URL.createObjectURL(avatarFile);
      }
      setUser && setUser(updated);
      alert('Lưu thông tin thành công (mock)');
    } catch (err) {
      console.error(err);
      alert('Lỗi khi lưu thông tin');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Thông tin cá nhân</h2>
      <form onSubmit={onSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm text-text-muted mb-1">Ảnh đại diện</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted">No</div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Họ và tên</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border rounded-btn"
          />
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-btn"
          />
        </div>

        <div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProfilePage;
