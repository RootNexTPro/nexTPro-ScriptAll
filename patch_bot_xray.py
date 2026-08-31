import sys

file_path = "/tmp/repos/nexTPro-ScriptAll/nexus_core_bot/modules/xray_core.py"
with open(file_path, "r") as f:
    content = f.read()

target_details = """    client_id = data.get('uuid', 'N/A')
    exp_date = data.get('expiry', 'N/A')
    domain = get_domain()"""

new_details = """    client_id = data.get('uuid', 'N/A')
    exp_date = data.get('expiry', 'N/A')

    quota_limit, quota_used, max_logins = 0, 0, 1
    active_conn = 0
    try:
        import sqlite3
        conn = sqlite3.connect("/etc/nexus-tunnel-web/nexus.db")
        c = conn.cursor()
        c.execute("SELECT quota_limit_mb, quota_used_mb, max_logins FROM clients WHERE username = ? AND protocol = ?", (user, protocol))
        row = c.fetchone()
        if row:
            quota_limit, quota_used, max_logins = row
        conn.close()

        # Count IPs from access.log
        active_conn = subprocess.getoutput(f"tail -n 10000 /var/log/xray/access.log | grep '{user}' | awk '{{print $3}}' | cut -d: -f1 | sort | uniq | wc -l").strip()
    except Exception:
        pass

    domain = get_domain()"""

content = content.replace(target_details, new_details)


target_msg = """        f"⏳ <b>Expiry Date:</b> {exp_date}\\n"
        f"🖥️ <b>Host/IP:</b> <code>{domain}</code>\\n\""""

new_msg = """        f"⏳ <b>Expiry Date:</b> {exp_date}\\n"
        f"📊 <b>Quota:</b> {quota_used} Mo / {quota_limit} Mo\\n"
        f"👥 <b>Sessions (IPs) Actives:</b> {active_conn} / {max_logins}\\n"
        f"🖥️ <b>Host/IP:</b> <code>{domain}</code>\\n\""""

content = content.replace(target_msg, new_msg)

with open(file_path, "w") as f:
    f.write(content)
