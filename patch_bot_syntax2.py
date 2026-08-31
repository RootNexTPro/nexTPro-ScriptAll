import sys

file_path = "/tmp/repos/nexTPro-ScriptAll/nexus_core_bot/modules/ssh_core.py"
with open(file_path, "r") as f:
    content = f.read()

# Fix multi-line f-string syntax properly using """
old_write = """            f.write(f"username={user}\\n"
password={password}
expiry={exp_date}
createdById={created_by_id}
createdAt={datetime.utcnow().isoformat()}Z
protocol=ssh
status=active
")"""

new_write = """            f.write(f"username={user}\\n"
                    f"password={password}\\n"
                    f"expiry={exp_date}\\n"
                    f"createdById={created_by_id}\\n"
                    f"createdAt={datetime.utcnow().isoformat()}Z\\n"
                    f"protocol=ssh\\n"
                    f"status=active\\n")"""

content = content.replace(old_write, new_write)

old_write2 = """                f.write(f"expiry={new_exp}\\n" if l.startswith("expiry=") else l)"""
# It seems ok, but let's make sure it doesn't have hidden newlines
new_write2 = '                f.write(f"expiry={new_exp}\\n" if l.startswith("expiry=") else l)'
content = content.replace(old_write2, new_write2)

with open(file_path, "w") as f:
    f.write(content)
