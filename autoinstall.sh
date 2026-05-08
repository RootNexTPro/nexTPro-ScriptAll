#!/bin/bash
clear
echo -e "\e[36m====================================================\e[0m"
echo -e "\e[36m    DÉMARRAGE DE L'INSTALLATION: NEXUS TUNNEL PRO   \e[0m"
echo -e "\e[36m====================================================\e[0m"

# 1. Préparation des outils vitaux
apt-get update -y >/dev/null 2>&1
apt-get install -y wget curl >/dev/null 2>&1

# 2. Correction réseau (Forçage IPv4 pour la stabilité)
echo "[+] Optimisation des routes réseau..."
echo "precedence ::ffff:0:0/96  100" >> /etc/gai.conf
sysctl -w net.ipv6.conf.all.disable_ipv6=1 >/dev/null 2>&1
sysctl -w net.ipv6.conf.default.disable_ipv6=1 >/dev/null 2>&1

# 3. Téléchargement du Lanceur Principal depuis RootNexTPro
SERVER_HOST="https://raw.githubusercontent.com/RootNexTPro/nexTPro-ScriptAll/main"
echo "[+] Connexion au dépôt autonome Nexus..."
wget -qO /root/nexus.sh "$SERVER_HOST/nexus.sh"

# 4. Exécution Sécurisée
if [ -f /root/nexus.sh ]; then
    echo "[+] Fichier noyau intercepté avec succès. Lancement..."
    chmod +x /root/nexus.sh
    bash /root/nexus.sh
else
    echo "[-] ERREUR FATALE: Impossible d'atteindre le dépôt GitHub."
    exit 1
fi
