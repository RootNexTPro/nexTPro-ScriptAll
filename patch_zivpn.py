import sys

file_path = "/tmp/repos/nexTPro-ScriptAll/nexus_core_bot/modules/zivpn_core.py"
with open(file_path, "r") as f:
    content = f.read()

target_details = """    password = data.get('password', 'N/A')
    exp_date = data.get('expiry', 'N/A')
    domain = get_file('/etc/xray/domain', 'votre-domaine.com')
    myip = subprocess.getoutput("wget -qO- ipv4.icanhazip.com 2>/dev/null || curl -s ipv4.icanhazip.com")"""

new_details = """    password = data.get('password', 'N/A')
    exp_date = data.get('expiry', 'N/A')

    quota_limit, quota_used, max_logins = 0, 0, 1
    try:
        import sqlite3
        conn = sqlite3.connect("/etc/nexus-tunnel-web/nexus.db")
        c = conn.cursor()
        c.execute("SELECT quota_limit_mb, quota_used_mb, max_logins FROM clients WHERE username = ? AND protocol = ?", (user, "zipvpn"))
        row = c.fetchone()
        if row:
            quota_limit, quota_used, max_logins = row
        conn.close()
    except Exception:
        pass

    domain = get_file('/etc/xray/domain', 'votre-domaine.com')
    myip = subprocess.getoutput("wget -qO- ipv4.icanhazip.com 2>/dev/null || curl -s ipv4.icanhazip.com")"""

content = content.replace(target_details, new_details)

target_msg = """        f"⏳ <b>Expiry Date:</b> {exp_date}\\n"
        f"🖥️ <b>Host/IP:</b> <code>{myip}</code>\\n\""""

new_msg = """        f"⏳ <b>Expiry Date:</b> {exp_date}\\n"
        f"📊 <b>Quota:</b> {quota_used} Mo / {quota_limit} Mo\\n"
        f"👥 <b>Max Logins:</b> {max_logins}\\n"
        f"🖥️ <b>Host/IP:</b> <code>{myip}</code>\\n\""""

content = content.replace(target_msg, new_msg)

with open(file_path, "w") as f:
    f.write(content)
