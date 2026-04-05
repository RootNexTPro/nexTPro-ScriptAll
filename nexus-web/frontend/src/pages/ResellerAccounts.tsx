import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Search, Trash2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Client {
  id: string;
  username: string;
  protocol: string;
  expires_at: string;
  status: string;
  created_at: string;
}

export default function ResellerAccounts() {
  const [accounts, setAccounts] = useState<Client[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [renewingId, setRenewingId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await api.listClients({ mine: true });
      setAccounts(data);
    } catch {}
    setLoadingList(false);
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteClient(id);
      await loadAccounts();
    } catch {}
  };

  const handleRenew = async (id: string) => {
    setRenewingId(id);
    try {
      await api.renewClient(id, 30);
      await loadAccounts();
    } catch {}
    setRenewingId(null);
  };

  const filtered = accounts.filter(a =>
    a.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isActive = (client: Client) =>
    client.status === 'active' && new Date(client.expires_at) > new Date();

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          <span className="text-gradient-primary">Mes Comptes Créés</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{accounts.length} comptes au total</p>
      </motion.div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="input-dark w-full pl-10"
          placeholder="Rechercher..."
        />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-5 gap-4 p-4 border-b border-border text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
          <span>Utilisateur</span>
          <span>Protocole</span>
          <span>Expiration</span>
          <span>Statut</span>
          <span className="text-right">Actions</span>
        </div>
        {loadingList ? (
          <div className="p-8 text-center text-muted-foreground">Chargement...</div>
        ) : (
          <AnimatePresence>
            {filtered.map((acc, i) => (
              <motion.div
                key={acc.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.05 }}
                className="grid grid-cols-5 gap-4 p-4 border-b border-border last:border-0 hover:bg-secondary/20 transition-all items-center"
              >
                <span className="text-sm font-mono text-foreground font-semibold">{acc.username}</span>
                <span className="protocol-badge border-primary/30 text-primary bg-primary/10 w-fit">
                  {acc.protocol?.toUpperCase()}
                </span>
                <span className="text-sm font-mono text-muted-foreground">{acc.expires_at}</span>
                <span className={`protocol-badge w-fit ${isActive(acc) ? 'border-success/30 text-success bg-success/10' : 'border-destructive/30 text-destructive bg-destructive/10'}`}>
                  {isActive(acc) ? 'Actif' : 'Expiré'}
                </span>
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleRenew(acc.id)}
                    disabled={renewingId === acc.id}
                    className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                    title="Renouveler 30j"
                  >
                    <RefreshCw className={`w-4 h-4 ${renewingId === acc.id ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleDelete(acc.id)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        {!loadingList && filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">Aucun compte trouvé</div>
        )}
      </div>
    </div>
  );
}
