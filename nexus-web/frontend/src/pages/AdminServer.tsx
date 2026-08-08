import { useState, useEffect, useRef } from 'react';
import { Terminal, Send, Server, Cpu, HardDrive, Clock, MemoryStick, Activity } from 'lucide-react';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';

export default function AdminServer() {
  const [config, setConfig] = useState({
    ip: '',
    domain: '',
    nsDomain: '',
    slowdnsPub: '',
    openvpnDownload: '',
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [command, setCommand] = useState('');
  const [termOutput, setTermOutput] = useState<{type: 'in' | 'out' | 'err', text: string}[]>([
    { type: 'out', text: 'Welcome to Nexus Tunnel Pro Web Terminal.\nType a command and press Enter.' }
  ]);
  const [isExecuting, setIsExecuting] = useState(false);
  const termEndRef = useRef<HTMLDivElement>(null);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [xrayLogs, setXrayLogs] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    termEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [termOutput]);

  const handleCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!command.trim() || isExecuting) return;

    const cmd = command;
    setCommand('');
    setTermOutput(prev => [...prev, { type: 'in', text: `root@nexus:~# ${cmd}` }]);
    setIsExecuting(true);

    try {
      const res = await api.executeCommand(cmd);
      setTermOutput(prev => [...prev, { type: 'out', text: res.output }]);
    } catch (err: any) {
      setTermOutput(prev => [...prev, { type: 'err', text: err.message || 'Execution failed' }]);
    }
    setIsExecuting(false);
  };

  useEffect(() => {
    api.getSettings()
      .then(data => {
        if (data?.server) {
          setConfig(prev => ({ ...prev, ...data.server }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch system info (assuming a new API endpoint)
    api.getSystemInfo?.()
      .then(data => setSystemInfo(data))
      .catch(() => {});

    fetchXrayLogs();
  }, []);

  const fetchXrayLogs = () => {
    setLogsLoading(true);
    api.getXrayLogs?.()
      .then(data => setXrayLogs(data.logs))
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  };

  const updateField = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSettings({ server: config });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-3xl font-display font-bold tracking-tight">
          <span className="text-gradient-primary">Serveur & Système</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Gérez le serveur et utilisez le terminal intégré</p>
      </motion.div>

      {/* System Monitor */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 flex flex-col items-center justify-center text-center">
          <Cpu className="w-8 h-8 text-primary mb-2" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">CPU</h3>
          <p className="stat-value text-foreground">{systemInfo?.cpu || '0%'}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 flex flex-col items-center justify-center text-center">
          <MemoryStick className="w-8 h-8 text-accent mb-2" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">RAM</h3>
          <p className="stat-value text-foreground">{systemInfo?.ram || '0 / 0 GB'}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 flex flex-col items-center justify-center text-center">
          <HardDrive className="w-8 h-8 text-warning mb-2" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Disque</h3>
          <p className="stat-value text-foreground">{systemInfo?.disk || '0%'}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6 flex flex-col items-center justify-center text-center">
          <Clock className="w-8 h-8 text-success mb-2" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Uptime</h3>
          <p className="text-lg font-bold text-foreground font-mono">{systemInfo?.uptime || '0 days'}</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Xray Logs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="glass-card flex flex-col h-[500px] overflow-hidden lg:col-span-2 border border-accent/20">
          <div className="bg-secondary p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent" />
              <h3 className="text-sm font-bold font-mono tracking-wider text-foreground">Xray Access Logs</h3>
            </div>
            <button onClick={fetchXrayLogs} disabled={logsLoading} className="text-xs btn-ghost py-1 px-2">
              {logsLoading ? 'Chargement...' : 'Rafraîchir'}
            </button>
          </div>
          <div className="flex-1 p-4 bg-[#0a0a0c] overflow-y-auto font-mono text-sm space-y-1 text-muted-foreground">
            {xrayLogs ? xrayLogs.split('\n').map((line, i) => (
               <div key={i} className="break-words whitespace-pre-wrap">{line}</div>
            )) : 'Aucun log trouvé.'}
          </div>
        </motion.div>

        {/* Terminal */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card flex flex-col h-[500px] overflow-hidden border border-primary/20 shadow-[0_0_15px_rgba(138,43,226,0.1)]">
          <div className="bg-secondary p-3 border-b border-border flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold font-mono tracking-wider text-foreground">Web Terminal</h3>
          </div>
          <div className="bg-secondary/50 p-2 border-b border-border flex gap-2 overflow-x-auto">
            <button onClick={() => { setCommand('systemctl restart xray'); handleCommand(); }} disabled={isExecuting} className="btn-outline text-[10px] px-2 py-1 whitespace-nowrap">Restart Xray</button>
            <button onClick={() => { setCommand('systemctl restart ssh'); handleCommand(); }} disabled={isExecuting} className="btn-outline text-[10px] px-2 py-1 whitespace-nowrap">Restart SSH</button>
            <button onClick={() => { setCommand('clear'); setTermOutput([]); }} disabled={isExecuting} className="btn-outline text-[10px] px-2 py-1 whitespace-nowrap border-warning text-warning hover:bg-warning/10">Clear Terminal</button>
            <button onClick={() => { setCommand('htop -b -n 1 | head -n 20'); handleCommand(); }} disabled={isExecuting} className="btn-outline text-[10px] px-2 py-1 whitespace-nowrap border-accent text-accent hover:bg-accent/10">Process List</button>
          </div>

          <div className="flex-1 p-4 bg-[#0a0a0c] overflow-y-auto font-mono text-sm space-y-2">
            {termOutput.map((out, idx) => (
              <div key={idx} className={`${out.type === 'in' ? 'text-accent' : out.type === 'err' ? 'text-destructive' : 'text-green-400'}`}>
                {out.text.split('\n').map((line, i) => (
                  <div key={i} className="break-words whitespace-pre-wrap">{line}</div>
                ))}
              </div>
            ))}
            <div ref={termEndRef} />
          </div>

          <form onSubmit={handleCommand} className="p-3 bg-secondary/50 border-t border-border flex gap-2">
            <span className="text-primary font-mono font-bold flex items-center">$&gt;</span>
            <input
              type="text"
              value={command}
              onChange={e => setCommand(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-foreground font-mono placeholder:text-muted-foreground/50"
              placeholder="Exécuter une commande..."
              autoComplete="off"
              disabled={isExecuting}
            />
            <button type="submit" disabled={isExecuting || !command.trim()} className="text-primary hover:text-accent disabled:opacity-50 transition-colors">
              <Send className="w-5 h-5" />
            </button>
          </form>
        </motion.div>

        {/* Server Config */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card p-6">
          <h3 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            Configuration Serveur
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">Adresse IP</label>
              <input
                value={config.ip}
                onChange={e => updateField('ip', e.target.value)}
                className="input-dark w-full font-mono"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">Domaine Principal</label>
              <input
                value={config.domain}
                onChange={e => updateField('domain', e.target.value)}
                className="input-dark w-full font-mono"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">NS Domain</label>
              <input
                value={config.nsDomain}
                onChange={e => updateField('nsDomain', e.target.value)}
                className="input-dark w-full font-mono"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">SlowDNS Public Key</label>
              <input
                value={config.slowdnsPub}
                onChange={e => updateField('slowdnsPub', e.target.value)}
                className="input-dark w-full font-mono"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">OpenVPN Download URL</label>
              <input
                value={config.openvpnDownload}
                onChange={e => updateField('openvpnDownload', e.target.value)}
                className="input-dark w-full font-mono"
              />
            </div>
            <div className="pt-4 flex items-center gap-3">
              <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
                {saving ? 'Sauvegarde...' : 'Enregistrer la Config'}
              </button>
              {saved && <span className="text-sm text-success shrink-0 font-bold whitespace-nowrap">✓ Enregistré</span>}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
