import sys

file_path = "/tmp/repos/nexTPro-ScriptAll/nexus_core_bot/modules/ssh_core.py"
with open(file_path, "r") as f:
    content = f.read()

# Fix syntax error in ssh_core.py that existed before our modifications!
content = content.replace('f.write(f"username={user}\n', 'f.write(f"username={user}\\n"\n')
content = content.replace('f.write(f"expiry={new_exp}\n"', 'f.write(f"expiry={new_exp}\\n"')

with open(file_path, "w") as f:
    f.write(content)
