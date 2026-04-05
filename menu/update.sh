#!/bin/bash
clear
LN='\e[34m'
NC='\e[0m'
GR='\e[32m'
RD='\e[31m'
SERVER_HOST="https://raw.githubusercontent.com/naomierachel031-lab/Clone-script-all-buddy/main"

echo -e "${LN}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
echo -e "${LN}┃${NC} ${GR}       MISE À JOUR OTA (OVER-THE-AIR)             ${NC}${LN}┃${NC}"
echo -e "${LN}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"
echo -e "\n [*] Connexion au dépôt GitHub central..."
echo -e " [*] Déploiement des modules..."

MODULES=(dns zivpn expiry domain iptools menu socks ssh status trojan vless vmess netguard port log tgbot uninstall update)

for script in "${MODULES[@]}"; do
    wget -q -O "/usr/local/sbin/$script" "${SERVER_HOST}/menu/${script}.sh"
    chmod +x "/usr/local/sbin/$script"
    echo -e "  -> Module $script [OK]"
done

echo -e "\n${LN}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${NC}"
echo -e "${LN}┃${NC} ${GR}      CORRECTIF SSH PORT 8181 (Stunnel TLS)       ${NC}${LN}┃${NC}"
echo -e "${LN}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${NC}"

echo -e "\n ${GR}[+] Mise à jour OTA terminée avec succès !${NC}"
sleep 2
menu
