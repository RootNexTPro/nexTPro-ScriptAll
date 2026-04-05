import { ProtocolType, ServerConfig } from './types';

interface AccountData {
  username: string;
  password: string;
  expiryDate: string;
  protocol: ProtocolType;
}

const LINE = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

export function formatConfig(data: AccountData, server: ServerConfig): string {
  switch (data.protocol) {
    case 'ssh': return formatSSH(data, server);
    case 'vmess': return formatXray('VMESS', data, server);
    case 'vless': return formatXray('VLESS', data, server);
    case 'trojan': return formatXray('TROJAN', data, server);
    case 'socks': return formatXray('SOCKS', data, server);
    case 'openvpn': return formatOpenVPN(data, server);
    case 'slowdns': return formatSlowDNS(data, server);
    case 'udp-custom': return formatUDPCustom(data, server);
    default: return '';
  }
}

function formatSSH(data: AccountData, server: ServerConfig): string {
  return `┏${LINE}┓
┃               SSH ACCOUNT DETAILS                ┃
┗${LINE}┛
┏${LINE}┓
┃ Username    : ${data.username}
┃ Password    : ${data.password}
┃ Expiry Date : ${data.expiryDate}
┃ Host/IP     : ${server.ip}
┃ Domain      : ${server.domain}
┃ NS Domain   : ${server.nsDomain}
●${LINE}●
┃ OpenSSH      : 22
┃ Dropbear     : 109, 143
┃ Stunnel      : 447, 777
┃ WS NTLS      : 80
┃ WS TLS       : 443
┃ UDPGW        : 7100–7900
┃ Squid        : 3128, 8080
┃ OpenVPN      : TCP 1194, SSL 2200, OHP 8000
┃ Slow DNS     : 22,53,5300,80,443
●${LINE}●
┃ UDP Custom
┃ ${server.domain}:1-65535@${data.username}:${data.password}
●${LINE}●
┃ Slow DNS
┃ PUB : ${server.slowdnsPub}
●${LINE}●
┃ OpenVPN File
┃ Download     : ${server.openvpnDownload}
●${LINE}●
┃ Payload
┃ GET / HTTP/1.1[crlf]Host: ${server.domain}[crlf]Upgrade: websocket[crlf][crlf]
┗${LINE}┛`;
}

function formatXray(name: string, data: AccountData, server: ServerConfig): string {
  const path = name === 'VMESS' ? '/vmess' : name === 'VLESS' ? '/vless' : name === 'TROJAN' ? '/trws' : '/ssws';
  return `┏${LINE}┓
┃            ${name} ACCOUNT DETAILS              ┃
┗${LINE}┛
┏${LINE}┓
┃ Remarks     : ${data.username}
┃ Domain      : ${server.domain}
┃ Port TLS    : 443
┃ Port NTLS   : 80
┃ UUID/Pass   : ${data.password}
┃ Path        : ${path}
┃ Expiry Date : ${data.expiryDate}
●${LINE}●
┃ gRPC
┃ Service Name: ${name.toLowerCase()}-grpc
┃ Port        : 443
●${LINE}●
┃ Link
┃ [Généré automatiquement]
┗${LINE}┛`;
}

function formatOpenVPN(data: AccountData, server: ServerConfig): string {
  return `┏${LINE}┓
┃           OPENVPN ACCOUNT DETAILS              ┃
┗${LINE}┛
┏${LINE}┓
┃ Username    : ${data.username}
┃ Password    : ${data.password}
┃ Expiry Date : ${data.expiryDate}
┃ Host/IP     : ${server.ip}
●${LINE}●
┃ OpenVPN TCP  : 1194
┃ OpenVPN SSL  : 2200
┃ OHP          : 8000
●${LINE}●
┃ Config File
┃ Download     : ${server.openvpnDownload}
┗${LINE}┛`;
}

function formatSlowDNS(data: AccountData, server: ServerConfig): string {
  return `┏${LINE}┓
┃           SLOW DNS ACCOUNT DETAILS             ┃
┗${LINE}┛
┏${LINE}┓
┃ Username    : ${data.username}
┃ Password    : ${data.password}
┃ Expiry Date : ${data.expiryDate}
┃ NS Domain   : ${server.nsDomain}
●${LINE}●
┃ Ports       : 22,53,5300,80,443
┃ PUB Key     : ${server.slowdnsPub}
┗${LINE}┛`;
}

function formatUDPCustom(data: AccountData, server: ServerConfig): string {
  return `┏${LINE}┓
┃          UDP CUSTOM ACCOUNT DETAILS            ┃
┗${LINE}┛
┏${LINE}┓
┃ Username    : ${data.username}
┃ Password    : ${data.password}
┃ Expiry Date : ${data.expiryDate}
●${LINE}●
┃ Auth String
┃ ${server.domain}:1-65535@${data.username}:${data.password}
┗${LINE}┛`;
}
