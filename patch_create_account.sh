#!/bin/bash
FILE="/tmp/repos/nexTPro-ScriptAll/nexus-web/frontend/src/pages/ResellerCreateAccount.tsx"

# Ajouter les variables d'état
sed -i '/const \[password, setPassword\] = useState(.);/a\
  const [quotaLimitMb, setQuotaLimitMb] = useState("0");\
  const [maxLogins, setMaxLogins] = useState("1");' "$FILE"

# Modifier api.createClient
sed -i 's/protocol: selectedProtocol,/protocol: selectedProtocol,\n        quota_limit_mb: parseInt(quotaLimitMb) || 0,\n        max_logins: parseInt(maxLogins) || 1,/g' "$FILE"

# Ajouter les inputs dans le grid (après Mot de Passe, avant Validité, en augmentant le grid)
sed -i 's/className="grid grid-cols-1 md:grid-cols-3 gap-4"/className="grid grid-cols-1 md:grid-cols-5 gap-4"/g' "$FILE"

sed -i '/<div>\n *<label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">\n *Validité/i\
            <div>\n              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">Quota (Mo) <span className="text-muted-foreground normal-case font-normal">(0 = illimité)</span></label>\n              <input\n                type="number"\n                value={quotaLimitMb}\n                onChange={e => setQuotaLimitMb(e.target.value)}\n                className="input-dark w-full font-mono"\n                placeholder="0"\n              />\n            </div>\n            <div>\n              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">Max Logins / IPs</label>\n              <input\n                type="number"\n                value={maxLogins}\n                onChange={e => setMaxLogins(e.target.value)}\n                className="input-dark w-full font-mono"\n                placeholder="1"\n              />\n            </div>' "$FILE"
