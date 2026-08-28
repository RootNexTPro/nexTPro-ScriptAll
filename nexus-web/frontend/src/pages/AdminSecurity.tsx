import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Shield, ShieldAlert, ShieldBan, ShieldCheck, Clock, User, AlertCircle, Settings2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';

export default function AdminSecurity() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [blockedIps, setBlockedIps] = useState<any[]>([]);
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blockForm, setBlockForm] = useState({ ip: '', durationMinutes: 0, reason: '' });

  const fetchData = async () => {
    try {
      const permRes = await api.getMySecurityPermission();
      setHasPermission(permRes.canManage);
      if (permRes.canManage) {
        const data = await api.getSecurityLogs();
        setLogs(data.logs || []);
        setBlockedIps(data.blocked || []);
        if (user?.role === 'super_admin') {
          const adminsData = await api.getAdminSecurityPermissions();
          setAdminsList(adminsData.admins || []);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockForm.ip) return;
    try {
      await api.blockIp(blockForm);
      setBlockForm({ ip: '', durationMinutes: 0, reason: '' });
      fetchData();
    } catch (err: any) { alert("Erreur: " + err.message); }
  };

  const handleUnblock = async (ip: string) => {
    try { await api.unblockIp({ ip }); fetchData(); } catch (err: any) { alert("Erreur: " + err.message); }
  };

  const handleTogglePermission = async (adminId: string, currentVal: boolean) => {
    try { await api.updateAdminSecurityPermission({ adminId, canManage: !currentVal }); fetchData(); } catch (err: any) { alert("Erreur: " + err.message); }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;

  if (!hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold text-gradient-primary">Accès Refusé</h1>
        <p className="text-muted-foreground max-w-md">Vous n'avez pas les permissions nécessaires pour gérer la sécurité du site. Veuillez contacter l'Administrateur Suprême.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2"><ShieldAlert className="w-8 h-8 text-destructive" /><span className="text-gradient-primary">Sécurité & Blocages</span></h1>
        <p className="text-muted-foreground text-sm mt-1">Surveillance des connexions au panel et gestion des blocages IP</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><ShieldBan className="w-5 h-5 text-destructive" />Bloquer une IP</h2>
            <form onSubmit={handleBlock} className="space-y-4">
              <div><label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Adresse IP</label><input type="text" className="input-dark w-full" value={blockForm.ip} onChange={e => setBlockForm({...blockForm, ip: e.target.value})} placeholder="Ex: 192.168.1.1" required /></div>
              <div><label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Durée (Minutes, 0 = Définitif)</label><input type="number" className="input-dark w-full" value={blockForm.durationMinutes} onChange={e => setBlockForm({...blockForm, durationMinutes: parseInt(e.target.value) || 0})} min="0" /></div>
              <div><label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Motif</label><input type="text" className="input-dark w-full" value={blockForm.reason} onChange={e => setBlockForm({...blockForm, reason: e.target.value})} placeholder="Ex: Tentatives suspectes" /></div>
              <button type="submit" className="btn-primary w-full bg-destructive hover:bg-destructive/90 text-white border-none flex items-center justify-center gap-2"><ShieldBan className="w-4 h-4" /> Bloquer l'IP</button>
            </form>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-warning" />IP Bloquées ({blockedIps.length})</h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {blockedIps.map((b, i) => {
                const isForever = b.blocked_until === 'forever';
                const isExpired = !isForever && new Date(b.blocked_until).getTime() < Date.now();
                return (
                  <div key={i} className={`p-3 rounded-lg border ${isExpired ? 'border-muted bg-muted/10' : 'border-destructive/30 bg-destructive/10'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono text-sm font-semibold text-foreground">{b.ip}</p>
                        <p className="text-xs text-muted-foreground mt-1">Motif: {b.reason}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Clock className="w-3 h-3" />{isForever ? 'Définitif' : `Jusqu'au ${new Date(b.blocked_until).toLocaleString()}`}{isExpired && <span className="text-success ml-1">(Expiré)</span>}</p>
                      </div>
                      <button onClick={() => handleUnblock(b.ip)} className="text-xs btn-outline hover:bg-success hover:text-white px-2 py-1 h-auto">Débloquer</button>
                    </div>
                  </div>
                );
              })}
              {blockedIps.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Aucune IP bloquée.</p>}
            </div>
          </div>

          {user?.role === 'super_admin' && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Settings2 className="w-5 h-5 text-primary" />Permissions Admins Simples</h2>
              <div className="space-y-3">
                {adminsList.map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border">
                    <span className="font-semibold text-sm">{a.username}</span>
                    <button onClick={() => handleTogglePermission(a.id, !!a.can_manage_security)} className={`text-xs px-3 py-1 rounded-full ${a.can_manage_security ? 'bg-success/20 text-success' : 'bg-muted/20 text-muted-foreground'}`}>{a.can_manage_security ? 'Autorisé' : 'Non Autorisé'}</button>
                  </div>
                ))}
                {adminsList.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Aucun admin simple trouvé.</p>}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><User className="w-5 h-5 text-primary" />Historique des Tentatives de Connexion</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="p-3 font-medium">Statut</th><th className="p-3 font-medium">Date</th><th className="p-3 font-medium">IP</th><th className="p-3 font-medium">Username</th><th className="p-3 font-medium">Mot de passe (si échec)</th><th className="p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {logs.map((log, i) => (
                  <tr key={i} className={`border-b border-border/50 hover:bg-secondary/20 transition-colors ${log.success ? '' : 'bg-destructive/5'}`}>
                    <td className="p-3">{log.success ? <span className="flex items-center gap-1 text-success"><ShieldCheck className="w-4 h-4" /> Réussi</span> : <span className="flex items-center gap-1 text-destructive"><AlertCircle className="w-4 h-4" /> Échec</span>}</td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground text-xs">{new Date(log.created_at + 'Z').toLocaleString()}</td>
                    <td className="p-3 font-mono text-xs">{log.ip}</td>
                    <td className="p-3 font-semibold">{log.username}</td>
                    <td className="p-3 font-mono text-xs text-destructive">{!log.success ? log.password_used : '***'}</td>
                    <td className="p-3"><button onClick={() => setBlockForm(prev => ({...prev, ip: log.ip}))} className="text-xs text-warning hover:underline">Bloquer IP</button></td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Aucun historique disponible.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
