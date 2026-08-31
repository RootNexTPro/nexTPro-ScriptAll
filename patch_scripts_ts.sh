#!/bin/bash
FILE="/tmp/repos/nexTPro-ScriptAll/nexus-web/server/scripts.ts"

# Modifier la signature de la fonction createSshAccount
sed -i 's/export function createSshAccount(username: string, password: string, days: number): AccountResult {/export function createSshAccount(username: string, password: string, days: number, maxLogins: number = 1): AccountResult {/g' "$FILE"

# Modifier la signature de la fonction createSlowDnsAccount
sed -i 's/export function createSlowDnsAccount(username: string, password: string, days: number): AccountResult {/export function createSlowDnsAccount(username: string, password: string, days: number, maxLogins: number = 1): AccountResult {/g' "$FILE"

# Remplacer le "2" hardcodé par la variable dynamiquement
sed -i 's/`echo "${username} hard maxlogins 2" >> \/etc\/security\/limits.conf`/`echo "${username} hard maxlogins ${maxLogins}" >> \/etc\/security\/limits.conf`/g' "$FILE"

# Injecter la variable maxLogins depuis l'appel parent dans createSlowDnsAccount
sed -i 's/const result = createSshAccount(username, password, days);/const result = createSshAccount(username, password, days, maxLogins);/g' "$FILE"
