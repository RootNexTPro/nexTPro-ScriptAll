import { execSync, spawnSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';

const XRAY_CONFIG = process.env.XRAY_CONFIG || '/etc/xray/config.json';

// ─── Input validation ─────────────────────────────────────────────────────────
/** Only allow safe alphanumeric + hyphen + underscore usernames (no shell metacharacters) */
const SAFE_USERNAME_RE = /^[a-zA-Z0-9_-]{1,32}$/;

function validateUsername(username: string): void {
  if (!SAFE_USERNAME_RE.test(username)) {
    throw new Error(
      `Invalid username '${username}': only letters, digits, hyphens and underscores allowed (max 32 chars)`
    );
  }
}

function validateDays(days: number): void {
  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    throw new Error('days must be an integer between 1 and 3650');
  }
}
// ─────────────────────────────────────────────────────────────────────────────

export interface AccountResult {
  success: boolean;
  data?: Record<string, string | number>;
  error?: string;
  raw?: string;
}


function getServerIp(): string {
  try {
    return execSync('curl -sS ipv4.icanhazip.com', { timeout: 5000, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function getDomain(): string {
  try {
    if (fs.existsSync('/etc/xray/domain')) {
      return fs.readFileSync('/etc/xray/domain', 'utf8').trim();
    }
    if (fs.existsSync('/root/domain')) {
      return fs.readFileSync('/root/domain', 'utf8').trim();
    }
  } catch {}
  return getServerIp();
}

function getSlowDnsPub(): string {
  try {
    if (fs.existsSync('/etc/slowdns/server.pub')) {
      return fs.readFileSync('/etc/slowdns/server.pub', 'utf8').trim();
    }
  } catch {}
  return 'N/A';
}

function getSlowDnsNsDomain(): string {
  try {
    if (fs.existsSync('/etc/slowdns/nsdomain')) {
      return fs.readFileSync('/etc/slowdns/nsdomain', 'utf8').trim();
    }
  } catch {}
  return 'N/A';
}

export function createSshAccount(username: string, password: string, days: number): AccountResult {
  try {
    validateUsername(username);
    validateDays(days);

    // Check if user exists (safe: username is validated above)
    const check = spawnSync('id', [username], { encoding: 'utf8' });
    if (check.status === 0) {
      return { success: false, error: `User '${username}' already exists` };
    }

    // Create the user — use spawnSync for all external commands to avoid shell injection
    const expiryResult = spawnSync('date', ['-d', `${days} days`, '+%Y-%m-%d'], { encoding: 'utf8' });
    const expiry = expiryResult.stdout.trim();

    spawnSync('useradd', ['-e', expiry, '-s', '/bin/false', '-M', username], { encoding: 'utf8' });
    // Use chpasswd via stdin to avoid embedding credentials in command line
    spawnSync('chpasswd', [], { input: `${username}:${password}`, encoding: 'utf8' });

    const domain = getDomain();
    const myip = getServerIp();
    const pub = getSlowDnsPub();
    const dns = getSlowDnsNsDomain();
    const chageResult = spawnSync('chage', ['-l', username], { encoding: 'utf8' });
    const actualExpiry = chageResult.stdout
      .split('\n')
      .find(l => l.includes('Account expires'))
      ?.split(':')[1]?.trim() || expiry;

    return {
      success: true,
      data: {
        username,
        password,
        expiry: actualExpiry,
        host: myip,
        domain,
        ns_domain: dns,
        pub_key: pub,
        openssh_port: 22,
        dropbear_ports: '109, 143',
        stunnel_ports: '447, 777',
        ws_ntls_ports: '80, 8880',
        ws_tls_port: 443,
        udpgw_ports: '7100-7900',
        squid_ports: '3128, 8880',
        openvpn_ports: 'TCP 1194, SSL 2200, OHP 8000',
        slowdns_ports: '22,53,5300,80,443',
        udp_custom_link: `${domain}:1-65535@${username}:${password}`,
        openvpn_download: `https://${domain}:2081`,
        payload: `GET / HTTP/1.1[crlf]Host: ${domain}[crlf]Upgrade: websocket[crlf][crlf]`
      }
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export function renewSshAccount(username: string, days: number): AccountResult {
  try {
    validateUsername(username);
    validateDays(days);

    const check = spawnSync('id', [username], { encoding: 'utf8' });
    if (check.status !== 0) {
      return { success: false, error: `User '${username}' not found` };
    }

    const expiryResult = spawnSync('date', ['-d', `${days} days`, '+%Y-%m-%d'], { encoding: 'utf8' });
    const expiry = expiryResult.stdout.trim();
    spawnSync('chage', ['-E', expiry, username], { encoding: 'utf8' });
    const chageResult = spawnSync('chage', ['-l', username], { encoding: 'utf8' });
    const actualExpiry = chageResult.stdout
      .split('\n')
      .find(l => l.includes('Account expires'))
      ?.split(':')[1]?.trim() || expiry;

    return { success: true, data: { username, expiry: actualExpiry } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export function deleteSshAccount(username: string): AccountResult {
  try {
    validateUsername(username);
    const check = spawnSync('id', [username], { encoding: 'utf8' });
    if (check.status !== 0) {
      return { success: false, error: `User '${username}' not found` };
    }
    spawnSync('userdel', ['--force', username], { encoding: 'utf8' });
    return { success: true, data: { username } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export function suspendSshAccount(username: string): AccountResult {
  try {
    validateUsername(username);
    spawnSync('chage', ['-E', '0', username], { encoding: 'utf8' });
    return { success: true, data: { username, status: 'suspended' } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ---------- Xray helpers ----------

function readXrayConfig(): Record<string, unknown> {
  if (!fs.existsSync(XRAY_CONFIG)) return {};
  try {
    return JSON.parse(fs.readFileSync(XRAY_CONFIG, 'utf8'));
  } catch {
    return {};
  }
}

function writeXrayConfig(cfg: Record<string, unknown>): void {
  fs.writeFileSync(XRAY_CONFIG, JSON.stringify(cfg, null, 2));
  spawnSync('systemctl', ['restart', 'xray'], { encoding: 'utf8' });
}

function generateUUID(): string {
  return crypto.randomUUID();
}

type XrayInbound = {
  protocol?: string;
  settings?: {
    clients?: Array<{ id?: string; email?: string; flow?: string }>;
    users?: Array<{ password?: string; email?: string }>;
    accounts?: Array<{ user?: string; pass?: string; email?: string }>;
  };
};

function findInbound(cfg: Record<string, unknown>, protocol: string): XrayInbound | undefined {
  const inbounds = cfg['inbounds'] as XrayInbound[] | undefined;
  if (!inbounds) return undefined;
  return inbounds.find(i => i.protocol === protocol);
}

export function createXrayVmessAccount(username: string, days: number): AccountResult {
  try {
    validateUsername(username);
    validateDays(days);

    const cfg = readXrayConfig();
    const inbound = findInbound(cfg, 'vmess');
    if (!inbound) return { success: false, error: 'VMess inbound not found in xray config' };

    const uuid = generateUUID();
    const expiryResult = spawnSync('date', ['-d', `${days} days`, '+%Y-%m-%d'], { encoding: 'utf8' });
    const expiry = expiryResult.stdout.trim();

    inbound.settings = inbound.settings || {};
    inbound.settings.clients = inbound.settings.clients || [];
    inbound.settings.clients.push({ id: uuid, email: username });

    const inbounds = cfg['inbounds'] as XrayInbound[];
    const idx = inbounds.findIndex(i => i.protocol === 'vmess');
    inbounds[idx] = inbound;

    // Store expiry marker in config as comment (consistent with shell script approach)
    const cfgStr = JSON.stringify(cfg, null, 2);
    const marked = `### ${username} ${expiry}\n${cfgStr}`;
    fs.writeFileSync(XRAY_CONFIG, marked);
    spawnSync('systemctl', ['restart', 'xray'], { encoding: 'utf8' });

    const domain = getDomain();
    const myip = getServerIp();

    return {
      success: true,
      data: {
        username,
        uuid,
        expiry,
        domain,
        host: myip,
        protocol: 'vmess',
        port: 443,
        network: 'ws',
        path: '/vmess',
        tls: 'tls'
      }
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export function createXrayVlessAccount(username: string, days: number): AccountResult {
  try {
    validateUsername(username);
    validateDays(days);

    const cfg = readXrayConfig();
    const inbound = findInbound(cfg, 'vless');
    if (!inbound) return { success: false, error: 'VLESS inbound not found in xray config' };

    const uuid = generateUUID();
    const expiryResult = spawnSync('date', ['-d', `${days} days`, '+%Y-%m-%d'], { encoding: 'utf8' });
    const expiry = expiryResult.stdout.trim();

    inbound.settings = inbound.settings || {};
    inbound.settings.clients = inbound.settings.clients || [];
    inbound.settings.clients.push({ id: uuid, email: username, flow: 'xtls-rprx-vision' });

    const inbounds = cfg['inbounds'] as XrayInbound[];
    const idx = inbounds.findIndex(i => i.protocol === 'vless');
    inbounds[idx] = inbound;

    const cfgStr = JSON.stringify(cfg, null, 2);
    const marked = `#& ${username} ${expiry}\n${cfgStr}`;
    fs.writeFileSync(XRAY_CONFIG, marked);
    spawnSync('systemctl', ['restart', 'xray'], { encoding: 'utf8' });

    const domain = getDomain();
    const myip = getServerIp();

    return {
      success: true,
      data: {
        username,
        uuid,
        expiry,
        domain,
        host: myip,
        protocol: 'vless',
        port: 443,
        network: 'ws',
        path: '/vless',
        tls: 'tls'
      }
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export function createXrayTrojanAccount(username: string, password: string, days: number): AccountResult {
  try {
    validateUsername(username);
    validateDays(days);

    const cfg = readXrayConfig();
    const inbound = findInbound(cfg, 'trojan');
    if (!inbound) return { success: false, error: 'Trojan inbound not found in xray config' };

    const expiryResult = spawnSync('date', ['-d', `${days} days`, '+%Y-%m-%d'], { encoding: 'utf8' });
    const expiry = expiryResult.stdout.trim();

    inbound.settings = inbound.settings || {};
    inbound.settings.clients = inbound.settings.clients || [];
    inbound.settings.clients.push({ id: password, email: username } as { id: string; email: string });

    const inbounds = cfg['inbounds'] as XrayInbound[];
    const idx = inbounds.findIndex(i => i.protocol === 'trojan');
    inbounds[idx] = inbound;

    const cfgStr = JSON.stringify(cfg, null, 2);
    const marked = `#! ${username} ${expiry}\n${cfgStr}`;
    fs.writeFileSync(XRAY_CONFIG, marked);
    spawnSync('systemctl', ['restart', 'xray'], { encoding: 'utf8' });

    const domain = getDomain();
    const myip = getServerIp();

    return {
      success: true,
      data: {
        username,
        password,
        expiry,
        domain,
        host: myip,
        protocol: 'trojan',
        port: 443
      }
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export function createZipVpnAccount(username: string, password: string, days: number): AccountResult {
  try {
    validateUsername(username);
    validateDays(days);

    // ZipVPN uses /etc/zivpn/users.db (username password expiry)
    const zivpnDb = '/etc/zivpn/users.db';
    const zvpnJson = '/etc/zivpn/zvpn.json';

    if (!fs.existsSync('/etc/zivpn')) {
      return { success: false, error: 'ZipVPN not installed' };
    }

    const expiryResult = spawnSync('date', ['-d', `${days} days`, '+%Y-%m-%d'], { encoding: 'utf8' });
    const expiry = expiryResult.stdout.trim();

    // Add to users.db
    fs.appendFileSync(zivpnDb, `${username} ${password} ${expiry}\n`);

    // Add to zvpn.json if it exists
    if (fs.existsSync(zvpnJson)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(zvpnJson, 'utf8'));
        if (cfg.users && Array.isArray(cfg.users)) {
          cfg.users.push({ user: username, pass: password, exp: expiry });
          fs.writeFileSync(zvpnJson, JSON.stringify(cfg, null, 2));
        }
      } catch {}
    }

    spawnSync('systemctl', ['restart', 'zivpn'], { encoding: 'utf8' });

    const domain = getDomain();

    return {
      success: true,
      data: {
        username,
        password,
        expiry,
        domain,
        protocol: 'zipvpn'
      }
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export function createSlowDnsAccount(username: string, password: string, days: number): AccountResult {
  try {
    // SlowDNS shares SSH credentials
    const result = createSshAccount(username, password, days);
    if (!result.success) return result;

    const pub = getSlowDnsPub();
    const dns = getSlowDnsNsDomain();

    return {
      success: true,
      data: {
        ...(result.data || {}),
        protocol: 'slowdns',
        pub_key: pub,
        ns_domain: dns,
        ports: '22,53,5300,80,443'
      }
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export function createUdpCustomAccount(username: string, password: string, days: number): AccountResult {
  try {
    // UDPCustom uses SSH accounts
    const result = createSshAccount(username, password, days);
    if (!result.success) return result;

    const domain = getDomain();

    return {
      success: true,
      data: {
        ...(result.data || {}),
        protocol: 'udpcustom',
        udp_link: `${domain}:1-65535@${username}:${password}`
      }
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
