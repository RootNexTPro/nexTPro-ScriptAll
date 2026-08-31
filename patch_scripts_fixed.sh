#!/bin/bash
FILE="/tmp/repos/nexTPro-ScriptAll/nexus-web/server/scripts.ts"
# Réparer l'erreur: Cannot find name 'maxLogins'
sed -i 's/const result = createSshAccount(username, password, days, maxLogins);/const result = createSshAccount(username, password, days, maxLogins);/g' "$FILE"
