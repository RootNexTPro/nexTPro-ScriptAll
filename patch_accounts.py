import sys

file_path = "/tmp/repos/nexTPro-ScriptAll/nexus-web/frontend/src/pages/ResellerAccounts.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add Quota and Connections in the table grid
content = content.replace(
    'className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_auto] gap-4 p-4 border-b border-border text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold"',
    'className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 p-4 border-b border-border text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold"'
)
content = content.replace(
    'className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_auto] gap-4 p-4 border-b border-border last:border-0 hover:bg-secondary/20 transition-all items-center"',
    'className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 p-4 border-b border-border last:border-0 hover:bg-secondary/20 transition-all items-center"'
)

# Header Table
content = content.replace(
    '<span>Expiration</span>\n          <span>Statut</span>',
    '<span>Expiration</span>\n          <span>Quota</span>\n          <span>Sessions</span>\n          <span>Statut</span>'
)

# Values Table
target_values = """<span className="text-sm font-mono text-muted-foreground">{acc.expires_at}</span>
                <span className={`protocol-badge w-fit ${isActive(acc) ? 'border-success/30 text-success bg-success/10' : 'border-destructive/30 text-destructive bg-destructive/10'}`}>"""

new_values = """<span className="text-sm font-mono text-muted-foreground">{acc.expires_at}</span>
                <span className="text-sm font-mono text-muted-foreground">{acc.quota_limit_mb ? `${acc.quota_used_mb || 0} / ${acc.quota_limit_mb} Mo` : 'Illimité'}</span>
                <span className="text-sm font-mono text-muted-foreground">{acc.active_connections || 0} / {acc.max_logins || 1}</span>
                <span className={`protocol-badge w-fit ${isActive(acc) ? 'border-success/30 text-success bg-success/10' : 'border-destructive/30 text-destructive bg-destructive/10'}`}>"""

content = content.replace(target_values, new_values)

# Details Modal
target_modal = """{ label: 'Protocole', value: detailClient.protocol?.toUpperCase() },
                      { label: 'Statut',    value: isActive(detailClient) ? '✅ Actif' : '❌ Expiré' },
                      { label: 'Expiration', value: detailClient.expires_at },
                      { label: 'Créé le',   value: detailClient.created_at?.split('T')[0] },"""

new_modal = """{ label: 'Protocole', value: detailClient.protocol?.toUpperCase() },
                      { label: 'Statut',    value: isActive(detailClient) ? '✅ Actif' : '❌ Expiré' },
                      { label: 'Expiration', value: detailClient.expires_at },
                      { label: 'Quota',     value: detailClient.quota_limit_mb ? `${detailClient.quota_used_mb || 0} / ${detailClient.quota_limit_mb} Mo` : 'Illimité' },
                      { label: 'Sessions',  value: `${detailClient.active_connections || 0} / ${detailClient.max_logins || 1}` },
                      { label: 'Créé le',   value: detailClient.created_at?.split('T')[0] },"""

content = content.replace(target_modal, new_modal)

with open(file_path, "w") as f:
    f.write(content)

# UPDATE lib/api.ts
api_path = "/tmp/repos/nexTPro-ScriptAll/nexus-web/frontend/src/lib/api.ts"
with open(api_path, "r") as f:
    api_content = f.read()

api_content = api_content.replace(
    "getClient: (id: string) => apiRequest<any>('GET', `/clients/${id}`),",
    "getClient: (id: string) => apiRequest<any>('GET', `/clients/${id}`),\n  updateClient: (id: string, data: any) => apiRequest<any>('PUT', `/clients/${id}`, data),"
)

with open(api_path, "w") as f:
    f.write(api_content)
