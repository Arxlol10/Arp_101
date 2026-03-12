# Privilege Escalation Notes

## Target: analyst → engineer

### Attempt 1: Kernel exploit
- Kernel: 6.5.0-14-generic
- Checked exploit-db — no public exploits for this version
- **FAILED**

### Attempt 2: Docker socket
- Docker socket at /var/run/docker.sock
- analyst is NOT in docker group
- **FAILED**

### Attempt 3: Cron job abuse
- Found writable script in /opt/maintenance/cleanup.sh
- Runs as engineer every 5 minutes
- Injected reverse shell → got engineer access!
- **Key found:** `FLAG{t2_n0tes_g0tcha}`

### Next Steps
- Use engineer access to look for root escalation vectors
- Check for kernel module loading capabilities
