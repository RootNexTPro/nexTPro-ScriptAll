import sys

file_path = "/tmp/repos/nexTPro-ScriptAll/menu/update.sh"
with open(file_path, "r") as f:
    content = f.read()

target = """echo -e "\n${LN}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
echo -e "${LN}┃${NC} ${GR}         MISE À JOUR NEXUS TUNNEL WEB            ${NC}${LN}┃${NC}\""""

new_download = """# Téléchargement et application des scripts de quotas
echo -e " [*] Déploiement des scripts de Quota & Multi-Login..."
wget -q -O "/root/quota_manager.sh" "${SERVER_HOST}/core/quota_manager.sh"
wget -q -O "/root/xray_quota_manager.sh" "${SERVER_HOST}/core/xray_quota_manager.sh"
chmod +x /root/quota_manager.sh /root/xray_quota_manager.sh

grep -q "/root/quota_manager.sh" /etc/crontab || echo "* * * * * root /root/quota_manager.sh >/dev/null 2>&1" >> /etc/crontab
grep -q "/root/xray_quota_manager.sh" /etc/crontab || echo "* * * * * root /root/xray_quota_manager.sh >/dev/null 2>&1" >> /etc/crontab
echo -e "  -> Modules Quota & Cronjob [OK]"

echo -e "\\n${LN}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
echo -e "${LN}┃${NC} ${GR}         MISE À JOUR NEXUS TUNNEL WEB            ${NC}${LN}┃${NC}\""""

content = content.replace(target, new_download)

with open(file_path, "w") as f:
    f.write(content)
