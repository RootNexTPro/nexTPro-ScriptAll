import sys

file_path = "/tmp/repos/nexTPro-ScriptAll/nexus.sh"
with open(file_path, "r") as f:
    content = f.read()

# Update run_scripts
old_scripts = 'scripts=("sshws.sh" "xray.sh" "vpn.sh" "websocket.sh" "setup_zivpn.sh" "setup_dns.sh" "setup_udp.sh" "validator.sh")'
new_scripts = 'scripts=("sshws.sh" "xray.sh" "vpn.sh" "websocket.sh" "setup_zivpn.sh" "setup_dns.sh" "setup_udp.sh" "validator.sh" "quota_manager.sh" "xray_quota_manager.sh")'

content = content.replace(old_scripts, new_scripts)

old_cron = """setup_autoexp() {
    local cronjob="55 23 * * * root /usr/local/sbin/expiry"
    grep -q "/usr/local/sbin/expiry" /etc/crontab || echo "$cronjob" >> /etc/crontab
}"""

new_cron = """setup_autoexp() {
    local cronjob="55 23 * * * root /usr/local/sbin/expiry"
    grep -q "/usr/local/sbin/expiry" /etc/crontab || echo "$cronjob" >> /etc/crontab

    # Injection des cronjobs pour les Quotas & Multi-logins
    grep -q "/root/quota_manager.sh" /etc/crontab || echo "* * * * * root /root/quota_manager.sh >/dev/null 2>&1" >> /etc/crontab
    grep -q "/root/xray_quota_manager.sh" /etc/crontab || echo "* * * * * root /root/xray_quota_manager.sh >/dev/null 2>&1" >> /etc/crontab
}"""

content = content.replace(old_cron, new_cron)

with open(file_path, "w") as f:
    f.write(content)
