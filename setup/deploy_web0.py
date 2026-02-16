import paramiko
import os
from scp import SCPClient

def create_ssh_client(server, port, user, password):
    client = paramiko.SSHClient()
    client.load_system_host_keys()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(server, port, user, password)
    return client

def transfer_files(ssh, local_path, remote_path):
    print(f"[*] uploading {local_path} to {remote_path}...")
    with SCPClient(ssh.get_transport()) as scp:
        scp.put(local_path, remote_path=remote_path, recursive=True)
    print(f"[+] uploaded {local_path} successfully.")

def execute_command(ssh, command, sudo_password=None):
    if sudo_password:
        command = f"echo {sudo_password} | sudo -S {command}"
    
    stdin, stdout, stderr = ssh.exec_command(command)
    exit_status = stdout.channel.recv_exit_status()
    
    print(f"[*] Executing: {command}")
    print(stdout.read().decode())
    err = stderr.read().decode()
    if err:
        print(f"[-] Error: {err}")
    
    return exit_status

def main():
    HOST = "192.168.29.4"
    PORT = 22
    USER = "REDTEAM"
    PASS = "1234"
    LOCAL_PATH = r"e:\REDTEAM_CTF\repo\T0-Web"
    REMOTE_PATH = "/home/REDTEAM/T0-Web"
    
    try:
        ssh = create_ssh_client(HOST, PORT, USER, PASS)
        print("[+] SSH Connection Established")
        
        # Ensure remote directory exists
        ssh.exec_command(f"mkdir -p {REMOTE_PATH}")

        # Transfer files
        transfer_files(ssh, LOCAL_PATH, "/home/REDTEAM")
        
        # Install dos2unix and fix line endings
        print("[*] Installing dos2unix and fixing line endings...")
        execute_command(ssh, "apt-get install -y dos2unix", sudo_password=PASS)
        execute_command(ssh, f"dos2unix {REMOTE_PATH}/setup_ctf.sh")
        
        # Make script executable
        execute_command(ssh, f"chmod +x {REMOTE_PATH}/setup_ctf.sh")
        
        # Run setup script
        print("[*] Running setup script (this might take a while)...")
        execute_command(ssh, f"bash {REMOTE_PATH}/setup_ctf.sh", sudo_password=PASS)
        
        ssh.close()
        print("[+] Deployment Complete")
        
    except Exception as e:
        print(f"[-] Deployment Failed: {e}")

if __name__ == "__main__":
    main()
