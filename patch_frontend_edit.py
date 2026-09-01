import sys

file_path = "/tmp/repos/nexTPro-ScriptAll/nexus-web/frontend/src/pages/ResellerAccounts.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. State Variables
old_states = """  const [reduceLoading, setReduceLoading] = useState(false);
  const [reduceError, setReduceError] = useState('');"""

new_states = """  const [reduceLoading, setReduceLoading] = useState(false);
  const [reduceError, setReduceError] = useState('');

  const [editQuotaMb, setEditQuotaMb] = useState('');
  const [editMaxLogins, setEditMaxLogins] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');"""

content = content.replace(old_states, new_states)

# 2. Reset states on modal open
old_open = """    setRenewDays('30');
    setReduceDays('1');
    setRenewError('');
    setReduceError('');"""

new_open = """    setRenewDays('30');
    setReduceDays('1');
    setRenewError('');
    setReduceError('');

    // Initialiser les valeurs du quota/sessions
    if (client) {
      setEditQuotaMb(client.quota_limit_mb?.toString() || '0');
      setEditMaxLogins(client.max_logins?.toString() || '1');
      setEditError('');
    }"""

content = content.replace(old_open, new_open)

# 3. Add handleUpdate function
old_handle = """  const handleDetailReduce = async () => {"""

new_handle = """  const handleDetailUpdate = async () => {
    if (!detailClient) return;
    const q = parseInt(editQuotaMb) || 0;
    const l = parseInt(editMaxLogins) || 1;
    setEditLoading(true);
    setEditError('');
    try {
      await api.updateClient(detailClient.id, { quota_limit_mb: q, max_logins: l });
      await loadAccounts();
      setDetailClient(prev => prev ? { ...prev, quota_limit_mb: q, max_logins: l } : null);
    } catch (e: any) {
      setEditError(e.message || 'Erreur lors de la mise à jour');
    }
    setEditLoading(false);
  };

  const handleDetailReduce = async () => {"""

content = content.replace(old_handle, new_handle)

# 4. Add UI block
old_ui = """                  </div>

                  {/* Config */}"""

new_ui = """                  </div>

                  {/* Update Quota & MaxLogins */}
                  <div className="border border-border rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-display font-semibold text-foreground">⚙️ Modifier Quota & Sessions</h3>
                    {editError && (
                      <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">{editError}</p>
                    )}
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground mb-1 block">Quota (Mo) 0=Illimité</label>
                        <input
                          type="number"
                          value={editQuotaMb}
                          onChange={e => setEditQuotaMb(e.target.value)}
                          className="input-dark w-full"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground mb-1 block">Max Logins</label>
                        <input
                          type="number"
                          value={editMaxLogins}
                          onChange={e => setEditMaxLogins(e.target.value)}
                          className="input-dark w-full"
                          placeholder="1"
                        />
                      </div>
                      <div className="flex items-end">
                          <button
                            onClick={handleDetailUpdate}
                            disabled={editLoading}
                            className="btn-primary py-2 px-4 h-[38px] flex items-center gap-2"
                          >
                            {editLoading ? '...' : 'Sauvegarder'}
                          </button>
                      </div>
                    </div>
                  </div>

                  {/* Config */}"""

content = content.replace(old_ui, new_ui)

with open(file_path, "w") as f:
    f.write(content)
