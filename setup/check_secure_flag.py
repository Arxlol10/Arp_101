import paramiko

def create_ssh_client(server, port, user, password):
    client = paramiko.SSHClient()
    client.load_system_host_keys()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(server, port, user, password)
    return client

def execute_command(ssh, command, sudo_password=None):
    if sudo_password:
        command = f"echo {sudo_password} | sudo -S {command}"
    
    stdin, stdout, stderr = ssh.exec_command(command)
    print(f"[*] Executing: {command}")
    print(stdout.read().decode())
    err = stderr.read().decode()
    if err:
        print(f"[-] Error: {err}")

def main():
    HOST = "192.168.29.4"
    USER = "REDTEAM"
    PASS = "1234"
    
    try:
        ssh = create_ssh_client(HOST, 22, USER, PASS)
        print("[+] SSH Connection Established")
        
        # Check flag location and permissions
        print("[*] Checking secure flag location...")
        execute_command(ssh, "ls -l /var/www/flags/web01/flag.txt", sudo_password=PASS)
        
        # Check config to ensure it points correctly
        print("[*] Checking config.php flag path...")
        execute_command(ssh, "grep FLAG_PATH /var/www/web01/config.php", sudo_password=PASS)
        
        ssh.close()
    except Exception as e:
        print(f"[-] Failed: {e}")

if __name__ == "__main__":
    main()
