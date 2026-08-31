#!/bin/bash
FILE="/tmp/repos/nexTPro-ScriptAll/nexus_core_bot/modules/ssh_core.py"
sed -i 's/cmd = f"useradd -e \$(date -d ./cmd = f"useradd -e \$(date -d /' "$FILE"
sed -i 's/| chpasswd"/| chpasswd \\&\\& echo \\"{user} hard maxlogins 2\\" >> \/etc\/security\/limits.conf"/' "$FILE"
