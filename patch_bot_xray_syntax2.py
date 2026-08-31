import sys

file_path = "/tmp/repos/nexTPro-ScriptAll/nexus_core_bot/modules/xray_core.py"
with open(file_path, "r") as f:
    content = f.read()

old_write = '        f.write(f"username={user}\nuuid={client_id}\nexpiry={exp_date}\ncreatedById={created_by_id}\ncreatedAt={datetime.utcnow().isoformat()}Z\nprotocol={protocol}\nstatus=active\n")'
new_write = '        f.write(f"username={user}\\nuuid={client_id}\\nexpiry={exp_date}\\ncreatedById={created_by_id}\\ncreatedAt={datetime.utcnow().isoformat()}Z\\nprotocol={protocol}\\nstatus=active\\n")'

content = content.replace(old_write, new_write)

old_write2 = '                f.write(f"expiry={new_exp}\n" if l.startswith("expiry=") else l)'
new_write2 = '                f.write(f"expiry={new_exp}\\n" if l.startswith("expiry=") else l)'

content = content.replace(old_write2, new_write2)

with open(file_path, "w") as f:
    f.write(content)
