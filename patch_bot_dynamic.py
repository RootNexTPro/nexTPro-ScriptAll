import sys

file_path = "/tmp/repos/nexTPro-ScriptAll/nexus_core_bot/modules/ssh_core.py"
with open(file_path, "r") as f:
    content = f.read()

# Update signature
content = content.replace(
    'def create_ssh_account(user, password, days, created_by_id=None):',
    'def create_ssh_account(user, password, days, created_by_id=None, max_logins=1):'
)

# Update PAM injection command
old_cmd = 'cmd = f"useradd -e $(date -d \'{days} days\' +\'%Y-%m-%d\') -s /bin/false -M {user} && echo \'{user}:{password}\' | chpasswd && echo \'{user} hard maxlogins 2\' >> /etc/security/limits.conf"'
new_cmd = 'cmd = f"useradd -e $(date -d \'{days} days\' +\'%Y-%m-%d\') -s /bin/false -M {user} && echo \'{user}:{password}\' | chpasswd && echo \'{user} hard maxlogins {max_logins}\' >> /etc/security/limits.conf"'
content = content.replace(old_cmd, new_cmd)


with open(file_path, "w") as f:
    f.write(content)
