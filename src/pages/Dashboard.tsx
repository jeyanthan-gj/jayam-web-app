import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Smartphone, Users, Package, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({ brands: 0, models: 0, staff: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [brandsRes, modelsRes, staffRes] = await Promise.all([
        supabase.from('brands').select('id', { count: 'exact', head: true }),
        supabase.from('models').select('id', { count: 'exact', head: true }),
        isAdmin
          ? supabase.from('staff').select('id', { count: 'exact', head: true })
          : Promise.resolve({ count: 0 }),
      ]);
      setStats({
        brands: brandsRes.count || 0,
        models: modelsRes.count || 0,
        staff: (staffRes as any).count || 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, [isAdmin]);

  const cards = [
    { label: 'Total Brands', value: stats.brands, icon: Package, color: 'gradient-primary' },
    { label: 'Total Models', value: stats.models, icon: Smartphone, color: 'gradient-accent' },
    ...(isAdmin ? [{ label: 'Staff Members', value: stats.staff, icon: Users, color: 'gradient-primary' }] : []),
    { label: 'Role', value: user?.role?.toUpperCase() || '', icon: TrendingUp, color: 'gradient-accent' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold font-display">
          Welcome, <span className="text-gradient-primary">{user?.name || 'User'}</span>
        </h1>
        <p className="text-muted-foreground mt-1">Here's your shop overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="glass-card rounded-xl p-5 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <div className={`w-9 h-9 rounded-lg ${card.color} flex items-center justify-center`}>
                <card.icon className="w-4 h-4 text-primary-foreground" />
              </div>
            </div>
            <p className="text-2xl font-bold font-display">
              {loading ? '—' : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="glass-card rounded-xl p-6">
        <h2 className="text-lg font-semibold font-display mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <a href="/smartphones" className="p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-center">
            <Smartphone className="w-6 h-6 mx-auto mb-2 text-primary" />
            <span className="text-sm font-medium">Browse Phones</span>
          </a>
          {isAdmin && (
            <>
              <a href="/smartphones" className="p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-center">
                <Package className="w-6 h-6 mx-auto mb-2 text-accent" />
                <span className="text-sm font-medium">Manage Models</span>
              </a>
              <a href="/staff" className="p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                <span className="text-sm font-medium">Manage Staff</span>
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
