import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Users, Zap, CreditCard, Activity, TrendingUp, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      label: 'Total Revendeurs',
      value: loading ? '...' : (stats?.resellers?.total ?? stats?.admins?.total ?? 0),
      icon: Users,
      gradient: true,
    },
    {
      label: 'Revendeurs Actifs',
      value: loading ? '...' : (stats?.resellers?.active ?? stats?.admins?.total ?? 0),
      icon: Activity,
      color: 'text-success',
    },
    {
      label: 'Comptes Créés',
      value: loading ? '...' : (stats?.clients?.total ?? 0),
      icon: CreditCard,
      color: 'text-warning',
    },
    {
      label: 'Protocoles Actifs',
      value: loading ? '...' : (stats?.protocol_stats?.length ?? 0),
      icon: Zap,
      color: 'text-accent',
    },
  ];

  const recentActions: Array<{ action: string; cnt: number }> = stats?.recent_actions ?? [];
  const protocolStats: Array<{ protocol: string; cnt: number }> = stats?.protocol_stats ?? [];

  const COLORS = ['#8A2BE2', '#FF0080', '#00FFCC', '#FFB300', '#FF3366', '#33CCFF'];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold tracking-tight">
          <span className="text-gradient-primary">Dashboard</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bienvenue, <span className="text-primary font-mono">{user?.username}</span>
          {user?.role === 'super_admin' && <span className="ml-2 text-warning text-xs">👑 Super Admin</span>}
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card-hover p-6 relative overflow-hidden group"
          >
            {stat.gradient && (
              <div
                className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -translate-y-1/2 translate-x-1/2 group-hover:opacity-20 transition-opacity"
                style={{ background: 'var(--gradient-primary)' }}
              />
            )}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">{stat.label}</span>
              <stat.icon className={`w-5 h-5 ${stat.gradient ? 'text-primary' : stat.color}`} />
            </div>
            <p className="stat-value text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Info & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 lg:col-span-1"
        >
          <h2 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            Répartition des Protocoles
          </h2>
          <div className="h-64 w-full">
            {protocolStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={protocolStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="cnt"
                    nameKey="protocol"
                    stroke="none"
                  >
                    {protocolStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 15, 20, 0.9)', border: '1px solid rgba(138, 43, 226, 0.2)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6 lg:col-span-1"
        >
          <h2 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Activité Récente
          </h2>
          <div className="space-y-3">
            {recentActions.length > 0 ? (
              recentActions.slice(0, 6).map((item, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gradient-primary animate-pulse-glow" />
                    <div>
                      <p className="text-sm text-foreground font-semibold">{item.action}</p>
                    </div>
                  </div>
                  <span className="protocol-badge border-primary/30 text-primary bg-primary/10">{item.cnt}×</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-3 py-3">
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                <p className="text-sm text-muted-foreground">Aucune activité récente</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* System Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6 lg:col-span-1"
        >
          <h2 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-success" />
            Résumé du Système
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-2 rounded-lg hover:bg-secondary/50 transition-colors">
              <span className="text-sm text-muted-foreground">Administrateurs</span>
              <span className="font-display font-bold text-foreground">{stats?.admins?.total ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg hover:bg-secondary/50 transition-colors">
              <span className="text-sm text-muted-foreground">Revendeurs actifs</span>
              <span className="font-display font-bold text-success">{stats?.resellers?.active ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg hover:bg-secondary/50 transition-colors">
              <span className="text-sm text-muted-foreground">Revendeurs inactifs</span>
              <span className="font-display font-bold text-destructive">{stats?.resellers?.suspended ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg hover:bg-secondary/50 transition-colors">
              <span className="text-sm text-muted-foreground">Comptes actifs</span>
              <span className="font-display font-bold text-primary">{stats?.clients?.active ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg hover:bg-secondary/50 transition-colors">
              <span className="text-sm text-muted-foreground">Comptes expirés</span>
              <span className="font-display font-bold text-muted-foreground">{stats?.clients?.expired ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg hover:bg-secondary/50 transition-colors">
              <span className="text-sm text-muted-foreground">Protocoles</span>
              <span className="font-display font-bold text-accent">{stats?.protocol_stats?.length ?? '—'}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
