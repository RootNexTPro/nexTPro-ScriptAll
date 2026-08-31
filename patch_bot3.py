import sys

file_path = "/tmp/repos/nexTPro-ScriptAll/nexus_core_bot/modules/ssh_core.py"
with open(file_path, "r") as f:
    content = f.read()

# Replace SSH user creation to include PAM limit
target_cmd = "cmd = f\"useradd -e $(date -d '{days} days' +'%Y-%m-%d') -s /bin/false -M {user} && echo '{user}:{password}' | chpasswd\""
new_cmd = "cmd = f\"useradd -e $(date -d '{days} days' +'%Y-%m-%d') -s /bin/false -M {user} && echo '{user}:{password}' | chpasswd && echo '{user} hard maxlogins 2' >> /etc/security/limits.conf\""
content = content.replace(target_cmd, new_cmd)

# Add quota and active connections info to view details
target_details = """    password = data.get('password', 'N/A')
    exp_date = data.get('expiry', 'N/A')
    domain, pub_key, ns_domain, myip = _server_info()"""

new_details = """    password = data.get('password', 'N/A')
    exp_date = data.get('expiry', 'N/A')

    quota_limit, quota_used = 0, 0
    active_conn = 0
    try:
        import sqlite3
        conn = sqlite3.connect("/etc/nexus-tunnel-web/nexus.db")
        c = conn.cursor()
        c.execute("SELECT quota_limit_mb, quota_used_mb FROM clients WHERE username = ? AND protocol = ?", (user, "ssh"))
        row = c.fetchone()
        if row:
            quota_limit, quota_used = row
        conn.close()

        active_conn = subprocess.getoutput(f"ps -u {user} | grep sshd | wc -l").strip()
    except Exception:
        pass

    domain, pub_key, ns_domain, myip = _server_info()"""

content = content.replace(target_details, new_details)

target_msg = """        f"⏳ <b>Expiry Date:</b> {exp_date}\\n"
        f"🖥️ <b>Host/IP:</b> <code>{myip}</code>\\n\""""

new_msg = """        f"⏳ <b>Expiry Date:</b> {exp_date}\\n"
        f"📊 <b>Quota:</b> {quota_used} Mo / {quota_limit} Mo\\n"
        f"👥 <b>Sessions Actives:</b> {active_conn}\\n"
        f"🖥️ <b>Host/IP:</b> <code>{myip}</code>\\n\""""

content = content.replace(target_msg, new_msg)

with open(file_path, "w") as f:
    f.write(content)
