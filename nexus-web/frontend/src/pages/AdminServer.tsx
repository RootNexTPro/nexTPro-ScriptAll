import { useState, useEffect, useRef } from 'react';
import { Terminal, Send } from 'lucide-react';
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
  }, []);

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
    <div className="space-y-6">

    </div>
  );
}
