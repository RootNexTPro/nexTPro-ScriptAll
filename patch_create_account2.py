import sys

file_path = "/tmp/repos/nexTPro-ScriptAll/nexus-web/frontend/src/pages/ResellerCreateAccount.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add states
content = content.replace(
    "const [password, setPassword] = useState('');",
    "const [password, setPassword] = useState('');\n  const [quotaLimitMb, setQuotaLimitMb] = useState('0');\n  const [maxLogins, setMaxLogins] = useState('1');"
)

# Update payload
content = content.replace(
    "protocol: selectedProtocol,\n        days,",
    "protocol: selectedProtocol,\n        days,\n        quota_limit_mb: parseInt(quotaLimitMb) || 0,\n        max_logins: parseInt(maxLogins) || 1,"
)

# Update grid
content = content.replace(
    "className=\"grid grid-cols-1 md:grid-cols-3 gap-4\"",
    "className=\"grid grid-cols-1 md:grid-cols-5 gap-4\""
)

# Insert inputs
target = """            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">
                Validité"""

new_inputs = """            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">Quota (Mo) <span className="text-muted-foreground normal-case font-normal">(0 = illimité)</span></label>
              <input
                type="number"
                value={quotaLimitMb}
                onChange={e => setQuotaLimitMb(e.target.value)}
                className="input-dark w-full font-mono"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">Max Logins / IPs</label>
              <input
                type="number"
                value={maxLogins}
                onChange={e => setMaxLogins(e.target.value)}
                className="input-dark w-full font-mono"
                placeholder="1"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-semibold">
                Validité"""

content = content.replace(target, new_inputs)

with open(file_path, "w") as f:
    f.write(content)
