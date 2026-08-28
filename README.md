# Nexus Tunnel Pro
- Nexus Tunnel Pro — Free Script
This script is provided free of charge and may be used without a license or domain/IP registration. It is intended for testing purposes only. The author and distributor accept no responsibility for losses, damages, or legal issues arising from its use. Use at your own risk.

### TELEGRAM
- https://t.me/nexustunnelpro

## Default Ports

| Service  | Transport |   TLS       |   NTLS      |
|----------|-----------|-------------|-------------|
| VLESS    | gRPC      | 443         | -           |
| VLESS    | WebSocket | 443         | 80          |
| VMESS    | gRPC      | 443         | -           |
| VMESS    | WebSocket | 443         | 80          |
| Trojan   | gRPC      | 443         | -           |
| Trojan   | WebSocket | 443         | 80          |
| SOCKS    | gRPC      | 443         | -           |
| SOCKS    | WebSocket | 443         | 80          |
| SSH      | WebSocket | 443         | 80          |
| SQUID    | -         | 3128, 8080  | -           |
| OpenVPN  | TCP/UDP   | 1194        | 2200        |
| OHP      | TCP       | -           | 8000        |
| ZIVPN    | UDP       | 5667        | 5667        |
| SLDNS    | -         | ALL PORT    | ALL PORT    |


## Custom path or NO path info 
- Allow configuration of custom paths or no path only for the following ports:
  
| Protocol | Type | Port |     Custom Path    |   Multi-Path Support   |
| -------- | ---- | ---- | ------------------ | -----------------------|
| VMESS    | TLS  | 2083 | / or `/<anytext>`  |  ✅ Yes `/<any>/<any>`   |
| VMESS    | NTLS | 2082 | / or `/<anytext>`  |  ✅ Yes `/<any>/<any>`   |
| VLESS    | TLS  | 2087 | / or `/<anytext>`  |  ✅ Yes `/<any>/<any>`   |
| VLESS    | NTLS | 2086 | / or `/<anytext>`  |  ✅ Yes `/<any>/<any>`   |

## Protocols & Multi-Path Support (WebSocket TLS & Non-TLS)

| Protocol       | Example Path       | Port TLS/NTLS  |   Multi-Path Support    |
|----------------|--------------------|----------------|-------------------------|
| **VMess (WS)** |      `/vmess`      |   443/80       | ⚠️ Partial (some port) |
| **VLESS (WS)** |      `/vless`      |   443/80       | ⚠️ Partial (some port) |
| **Trojan (WS)**|      `/trws`       |   443/80       | ⚠️ Partial (some port) |
| **Socks (WS)** |      `/ssws`       |   443/80       | ⚠️ Partial (some port) |
| **SSH (WS)**   |      `/<anypath>`  |   443/80       | ✅ Yes                 |



## Info:  
- ✅ All working: The tunnel works fully without issues.  
- ⚠️ Partial: Some features (e.g., SSH over WebSocket) may not work properly.  

## Ubuntu:
- 20 ✅ All working
- 22 ✅ All working
- 24 ⚠️ Partial (⚠️ SSH not working)

## Debian:
- 10 ✅ All working
- 11 ✅ All working
- 12 ⚠️ Partial (⚠️ SSH not working)

## Installation
 
<pre>
<code>wget -O /root/nexus.sh https://raw.githubusercontent.com/RootNexTPro/nexTPro-ScriptAll/main/nexus.sh && chmod +x /root/nexus.sh && bash /root/nexus.sh</code>
</pre>

## Nexus Tunnel Web Panel

The web panel provides a professional administration interface with:
- **Super Admin** → creates Admins and Resellers, full control
- **Admin** → manages resellers and their protocol quotas
- **Reseller** → creates VPN accounts based on assigned bouquet (protocol quotas)
- Server-side timestamps (no device-time manipulation)
- JWT authentication with 24h sessions

To install the web panel, run the menu (`menu`) and select `[18] NEXUS TUNNEL WEB`.

### Known Bugs (will fix later, too lazy now 😅)
- Active user count for Xray (VLESS, VMess, Trojan, SOCKS) not displayed correctly
- Automatic deletion of expired accounts not working
 
## Changelog

### 📅 [2025-09-03]
- Initial script release
  
### 📅 [2025-09-04]
- Added support for custom multipath
- Fixed gRPC connection issues
- Updated Nginx configuration (single file)
- Fixed issue where user data could not be saved to JSON file

### 📅 [2025-09-06]  
- Added automatic blocking of torrent sites (BitTorrent traffic, trackers, etc.)  
- Added automatic blocking of adult (pornographic) sites  
- Added ad-blocking functionality (ads, popups, tracking scripts)

### 📅 [2025-09-10]  
- Add new ports for VMESS & VLESS.
- Support custom paths or no path for a specific port.
- Remove NetGuard, Use Default host blocker
- Remove Xray multi-path on ports 443 and 80

### 📅 2025-09-11
- Added OpenVPN support (TCP / UDP / SSL)
- Added Squid Proxy (3128 / 8080)
- Added OHP (Open HTTP Puncher) over TCP

### 📅 2025-09-12
- Added support for ZIVPN panel
- Added support for SlowDNS

### 📅 2025-09-13
- Fixed bug in SSH WebSocket
- Fixed bug in SlowDNS
- Added support for UDP Custom
- Added auto delete expiry account

### 📅 2025-09-16
- Updated from stunnel4 to stunnel5

## 🚀 Dernières Nouveautés (Mise à jour)

### 1. Correction et Amélioration du Port WebSocket (8880)
- **Conflit Résolu :** Squid Proxy écoute désormais uniquement sur le port 3128.
- **Port Intelligent :** Le script de proxy WebSocket (Dropbear & Stunnel) utilise par défaut le port 8880 ou 700. Si ce port est déjà occupé, le script **cherche automatiquement le prochain port libre** et s'y attache, garantissant une création de compte SSH fluide.

### 2. Menu Sécurité Avancée & Blocage d'IP (Web Panel)
- **Historique en temps réel :** Visualisez les tentatives de connexion au panel (réussites en vert, échecs en rouge) avec les adresses IP, identifiants et mots de passe essayés.
- **Blocage Manuel :** Bloquez des adresses IP suspectes pour une durée déterminée (en minutes) ou de façon définitive (basé sur l'heure du serveur protégé contre les manipulations côté client).
- **Gestion des Permissions :** L'Admin Suprême (Super Admin) possède le monopole de ce menu, mais peut **autoriser ou révoquer l'accès** de ce menu à n'importe quel Admin Simple via l'interface.

### 3. Suppression Intégrale Automatisée
- Le Cron job d'expiration nocturne (`/usr/bin/xp`) a été réécrit. Désormais, tout compte (SSH, Xray, ZipVPN, etc.) arrivé à expiration n'est plus seulement verrouillé, mais **définitivement supprimé** (fichiers, sessions actives, terminal, bot Telegram et bases de données SQLite du Web Panel nettoyés simultanément).
