import sys

file_path = "/tmp/repos/nexTPro-ScriptAll/nexus.sh"
with open(file_path, "r") as f:
    content = f.read()

# Update run_scripts to skip executing the quota scripts, just download them to /root
old_run = """        if wget -q "$url" -O "$script"; then
            chmod +x "$script"
            echo "[INFO] Running $script..."
            ./"$script"
        else"""

new_run = """        if wget -q "$url" -O "/root/$script"; then
            chmod +x "/root/$script"
            echo "[INFO] Processed $script"
            # Only execute if not a quota manager script
            if [[ "$script" != *"quota_manager.sh"* ]]; then
                echo "[INFO] Running $script..."
                cd /root && ./"$script"
            fi
        else"""

content = content.replace(old_run, new_run)

with open(file_path, "w") as f:
    f.write(content)
