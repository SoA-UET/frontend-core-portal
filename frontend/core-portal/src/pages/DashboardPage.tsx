import { useState, useEffect } from 'react';
import {
  Users,
  MessageSquare,
  Phone,
  Star,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { metricsService } from '../services';
import {
  TotalUsersMetrics,
  ConversationSummaryMetrics,
  SatisfactionMetrics,
  OffloadRateMetrics,
  OffloadByPartnerMetrics,
} from '../types';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color: string;
}

function MetricCard({ title, value, icon, trend, trendUp, color }: MetricCardProps) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-muted mb-1">{title}</p>
          <p className="text-3xl font-bold text-text-main">{value.toLocaleString()}</p>
          {trend && (
            <p className={`text-sm mt-2 ${trendUp ? 'text-status-success' : 'text-status-error'}`}>
              <TrendingUp size={14} className="inline mr-1" />
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-card ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

const SATISFACTION_COLORS = ['#EF4444', '#F59E0B', '#FBBF24', '#84CC16', '#10B981'];

function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [totalUsers, setTotalUsers] = useState<TotalUsersMetrics | null>(null);
  const [conversationSummary, setConversationSummary] = useState<ConversationSummaryMetrics | null>(null);
  const [satisfaction, setSatisfaction] = useState<SatisfactionMetrics | null>(null);
  const [offloadRate, setOffloadRate] = useState<OffloadRateMetrics | null>(null);
  const [offloadByPartner, setOffloadByPartner] = useState<OffloadByPartnerMetrics | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [usersRes, convRes, satRes, offloadRes, partnerRes] = await Promise.all([
        metricsService.getTotalUsers(),
        metricsService.getConversationSummary(),
        metricsService.getSatisfactionMetrics(),
        metricsService.getOffloadRate(),
        metricsService.getOffloadByPartner(),
      ]);

      setTotalUsers(usersRes);
      setConversationSummary(convRes);
      setSatisfaction(satRes);
      setOffloadRate(offloadRes);
      setOffloadByPartner(partnerRes);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError('Không thể tải dữ liệu thống kê. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  // Prepare satisfaction chart data
  const satisfactionData = satisfaction
    ? [
        { name: '1 sao', value: satisfaction?.satisfaction_distribution?.satisfaction_1 ?? 0, fill: SATISFACTION_COLORS[0] },
        { name: '2 sao', value: satisfaction?.satisfaction_distribution?.satisfaction_2 ?? 0, fill: SATISFACTION_COLORS[1] },
        { name: '3 sao', value: satisfaction?.satisfaction_distribution?.satisfaction_3 ?? 0, fill: SATISFACTION_COLORS[2] },
        { name: '4 sao', value: satisfaction?.satisfaction_distribution?.satisfaction_4 ?? 0, fill: SATISFACTION_COLORS[3] },
        { name: '5 sao', value: satisfaction?.satisfaction_distribution?.satisfaction_5 ?? 0, fill: SATISFACTION_COLORS[4] },
      ]
    : [];

  // Prepare partner offload chart data
  const partnerData = offloadByPartner?.partners.map((p) => ({
    name: p.partner_name || p.partner_id,
    offload_rate: p.offload_rate_percentage,
    total: p.total_conversations,
  })) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-status-error mb-4">{error}</p>
        <button onClick={fetchMetrics} className="btn btn-primary">
          <RefreshCw size={18} />
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Dashboard</h1>
          <p className="text-text-muted">Tổng quan hệ thống Telcenter Core</p>
        </div>
        <button onClick={fetchMetrics} className="btn btn-secondary">
          <RefreshCw size={18} />
          Làm mới
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <MetricCard
          title="Tổng người dùng"
          value={totalUsers?.total_customers || 0}
          icon={<Users className="text-blue-600" size={24} />}
          color="bg-blue-50"
        />
        <MetricCard
          title="Tổng hội thoại"
          value={conversationSummary?.total_conversations || 0}
          icon={<MessageSquare className="text-green-600" size={24} />}
          color="bg-green-50"
        />
        <MetricCard
          title="Hội thoại gọi"
          value={conversationSummary?.calling_conversations || 0}
          icon={<Phone className="text-purple-600" size={24} />}
          color="bg-purple-50"
        />
        <MetricCard
          title="Đánh giá trung bình"
          value={satisfaction?.average_rating?.toFixed(2) || 0}
          icon={<Star className="text-yellow-600" size={24} />}
          color="bg-yellow-50"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Satisfaction distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-text-main mb-4">
            Phân bố đánh giá hài lòng
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={satisfactionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {satisfactionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Offload rate */}
        <div className="card">
          <h3 className="text-lg font-semibold text-text-main mb-4">
            Tỷ lệ xử lý tự động
          </h3>
          <div className="flex items-center justify-center h-72">
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-48 h-48">
                  <circle
                    className="text-gray-200"
                    strokeWidth="12"
                    stroke="currentColor"
                    fill="transparent"
                    r="70"
                    cx="96"
                    cy="96"
                  />
                  <circle
                    className="text-status-success"
                    strokeWidth="12"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="70"
                    cx="96"
                    cy="96"
                    strokeDasharray={`${(offloadRate?.offload_rate_percentage || 0) * 4.4} 440`}
                    transform="rotate(-90 96 96)"
                  />
                </svg>
                <span className="absolute text-4xl font-bold text-text-main">
                  {offloadRate?.offload_rate_percentage?.toFixed(1)}%
                </span>
              </div>
              <p className="text-text-muted mt-4">
                {offloadRate?.offloaded_conversations?.toLocaleString()} / {offloadRate?.total_conversations?.toLocaleString()} hội thoại
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Partner offload rates */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-main mb-4">
          Tỷ lệ xử lý tự động theo đối tác
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={partnerData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} unit="%" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Tỷ lệ']}
              />
              <Bar dataKey="offload_rate" fill="#1E40AF" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
