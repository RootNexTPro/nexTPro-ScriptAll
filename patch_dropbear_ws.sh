#!/bin/bash
FILE="/tmp/repos/nexTPro-ScriptAll/module/dropbear-ws.py"
sed -i '/def find_free_port(start_port=8880):/,/return 8880/d' "$FILE"
sed -i 's/LISTENING_PORT = int(sys.argv\[1\]) if len(sys.argv) > 1 else find_free_port(8880)/LISTENING_PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8880/' "$FILE"
