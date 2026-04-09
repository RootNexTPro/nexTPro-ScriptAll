import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Calendar, Zap, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

function formatCountdown(secs: number): string {
  if (secs <= 0) return 'Expiré';
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const hh = hours.toString().padStart(2, '0');
  const mm = mins.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return days > 0 ? `${days}j ${hh}h ${mm}m ${ss}s` : `${hh}h ${mm}m ${ss}s`;
}

export default function ResellerDashboard() {
  const { user } = useAuth();
  const [recentClients, setRecentClients] = useState<any[]>([]);
  const [serverUnix, setServerUnix] = useState<number | null>(null);

  // Real-time countdown state — seeded from remaining_seconds (server-authoritative)
  const [countdown, setCountdown] = useState<string>('--');
  const remainingSecsRef = useRef<number | null>(null);

  useEffect(() => {
    api.listClients({ mine: true })
      .then(data => setRecentClients(data.slice(0, 5)))
      .catch(() => {});
    // Fetch server time once for client status display
    api.getServerTime()
      .then(({ unix }) => setServerUnix(unix))
      .catch(() => {});
  }, []);

  // Seed countdown from server-authoritative remaining_seconds
  useEffect(() => {
    if (user?.remainingSeconds != null) {
      remainingSecsRef.current = user.remainingSeconds;
      setCountdown(formatCountdown(user.remainingSeconds));
    }
  }, [user?.remainingSeconds]);

  // Tick every second, decrementing from the server-seeded value
  useEffect(() => {
    if (remainingSecsRef.current === null) return;
    const interval = setInterval(() => {
      remainingSecsRef.current = Math.max(0, (remainingSecsRef.current ?? 0) - 1);
      setCountdown(formatCountdown(remainingSecsRef.current));
    }, 1000);
    return () => clearInterval(interval);
  }, [user?.remainingSeconds]); // re-init when server value refreshes

  const bouquetCount = user?.bouquet?.length || 0;
  const totalUsed = user?.bouquet?.reduce((a, b) => a + (b.usedAccounts || 0), 0) || 0;
  const totalMax = user?.bouquet?.reduce((a, b) => a + b.maxAccounts, 0) || 0;

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold tracking-tight">
          Bienvenue, <span className="text-gradient-primary">{user?.username}</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Votre espace revendeur</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Temps Restant',
            value: countdown,
            icon: Calendar,
            sub: 'décompte en temps réel (serveur)',
            small: true,
          },
          { label: 'Protocoles', value: bouquetCount, icon: Zap, sub: 'dans votre bouquet' },
          { label: 'Comptes Créés', value: totalUsed, icon: TrendingUp, sub: `/ ${totalMax} max` },
          { label: 'Expiration', value: user?.expiryDate || '-', icon: Clock, sub: "date d'expiration (serveur)", small: true },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card-hover p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">{stat.label}</span>
              <stat.icon className="w-5 h-5 text-primary" />
            </div>
            <p className={`font-display font-bold text-foreground ${stat.small ? 'text-lg' : 'stat-value'}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Bouquet Details */}
      {user?.bouquet && user.bouquet.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">📦 Mon Bouquet</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {user.bouquet.map(b => (
              <div key={b.protocolId} className="rounded-xl border border-border p-4 bg-card/30 hover:border-primary/30 transition-all">
                <p className="text-sm font-display font-bold text-foreground uppercase">{b.protocolId}</p>
                <div className="mt-2">
                  <p className="text-2xl font-display font-bold text-primary">{b.usedAccounts || 0}</p>
                  <p className="text-xs text-muted-foreground">/ {b.maxAccounts} comptes</p>
                </div>
                <div className="w-full bg-secondary rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      background: 'var(--gradient-primary)',
                      width: `${((b.usedAccounts || 0) / b.maxAccounts) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-6"
      >
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">Derniers Comptes Créés</h2>
        <div className="space-y-3">
          {recentClients.length > 0 ? (
            recentClients.map((client, i) => {
              // Use server time (unix seconds) for active status check
              const expiresUnix = client.expires_at
                ? Math.floor(new Date(client.expires_at + 'T23:59:59Z').getTime() / 1000)
                : 0;
              const now = serverUnix ?? Math.floor(Date.now() / 1000);
              const isActive = client.status === 'active' && expiresUnix > now;
              return (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--gradient-primary)' }} />
                    <span className="text-sm font-mono text-foreground">{client.username}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="protocol-badge border-primary/30 text-primary bg-primary/10">
                      {client.protocol?.toUpperCase()}
                    </span>
                    <span className={`protocol-badge ${isActive ? 'border-success/30 text-success bg-success/10' : 'border-destructive/30 text-destructive bg-destructive/10'}`}>
                      {isActive ? 'Actif' : 'Expiré'}
                    </span>
                    <span className="text-xs text-muted-foreground">{client.expires_at}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun compte créé pour l'instant</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
