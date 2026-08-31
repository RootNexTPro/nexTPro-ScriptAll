import sys

file_path = "/tmp/repos/nexTPro-ScriptAll/nexus_core_bot/modules/xray_core.py"
with open(file_path, "r") as f:
    content = f.read()

# Fix multi-line f-string syntax in xray_core.py
old_write = """            f.write(f"username={user}\\n
uuid={client_id}
expiry={exp_date}
createdById={created_by_id}
createdAt={datetime.utcnow().isoformat()}Z
protocol={protocol}
status=active
")"""

new_write = """            f.write(f"username={user}\\n"
                    f"uuid={client_id}\\n"
                    f"expiry={exp_date}\\n"
                    f"createdById={created_by_id}\\n"
                    f"createdAt={datetime.utcnow().isoformat()}Z\\n"
                    f"protocol={protocol}\\n"
                    f"status=active\\n")"""

content = content.replace(old_write, new_write)

old_write2 = """                f.write(f"expiry={new_exp}\\n
" if l.startswith("expiry=") else l)"""

new_write2 = '                f.write(f"expiry={new_exp}\\n" if l.startswith("expiry=") else l)'
content = content.replace(old_write2, new_write2)

with open(file_path, "w") as f:
    f.write(content)
