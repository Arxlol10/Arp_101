#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

// Compiled with: gcc -m32 -fno-stack-protector -no-pie -o binary02_fmt binary02_fmt.c
// Or 64-bit: gcc -fno-stack-protector -no-pie -Wl,-z,relro,-z,lazy -o binary02_fmt binary02_fmt.c

void secret_backdoor() {
    printf("[*] Backdoor unlocked! Elevating privileges...\n");
    setreuid(0, 0);
    setregid(0, 0);
    system("/bin/sh");
}

int main(int argc, char **argv) {
    if (argc < 2) {
        printf("Usage: %s <log_message>\n", argv[0]);
        exit(1);
    }

    // Drop privileges initially if setuid (not strictly necessary since bash drops euid,
    // but we use setreuid in backdoor to regain it). Actually, better to just leave it 
    // and let the attacker get a shell with euid=0. Since system() usually drops euid, 
    // we use setreuid(0,0) in the backdoor.

    char buffer[512];
    strncpy(buffer, argv[1], sizeof(buffer) - 1);
    
    printf("Processing log entry: ");
    
    // VULNERABILITY: format string
    printf(buffer);
    printf("\n");

    // We can overwrite exit@GOT to point to secret_backdoor
    exit(0);
}
