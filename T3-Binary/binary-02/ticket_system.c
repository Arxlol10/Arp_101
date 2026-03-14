#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

// Dummy target for the format string overwrite
int is_admin = 0;

void print_ticket(char *input) {
    char buffer[256];
    strncpy(buffer, input, sizeof(buffer) - 1);
    buffer[sizeof(buffer) - 1] = '\0';

    printf("Processing ticket: ");
    // VULNERABILITY: Use of format string vulnerability
    printf(buffer);
    printf("\n");
}

void get_flag() {
    if (is_admin) {
        printf("[+] Admin access granted. Reading flag...\n");
        // We will execute a shell to make it easy, or just read the flag file.
        // It's SUID so we just drop into a shell.
        setresuid(geteuid(), geteuid(), geteuid());
        system("/bin/cat /home/engineer/.flag_binary02 2>/dev/null || echo 'FLAG{t3_fmt_str1ng_0v3rwr1t3_m9z}'");
    } else {
        printf("[-] You do not have admin access to view the flag.\n");
    }
}

int main(int argc, char *argv[]) {
    setvbuf(stdout, NULL, _IONBF, 0);

    printf("=== NexusCorp Legacy Ticket System ===\n");

    if (argc < 2) {
        printf("Usage: %s <ticket_content>\n", argv[0]);
        return 1;
    }

    print_ticket(argv[1]);

    get_flag();

    return 0;
}
