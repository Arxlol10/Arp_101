/*
 * =============================================================================
 * log_reader.c — "Safe" Log Reader Utility
 * =============================================================================
 * Intended use: Read application log files for troubleshooting.
 * Installed at: /usr/local/bin/log_reader
 *
 * VULNERABILITY: When compiled and given cap_dac_read_search=ep capability,
 * this binary can read ANY file on the system, bypassing DAC read permissions.
 * =============================================================================
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_LINE 4096

void print_usage(const char *prog) {
    printf("Usage: %s <logfile>\n", prog);
    printf("  Reads and displays the contents of a log file.\n");
    printf("  Example: %s /var/log/app/access.log\n", prog);
}

int main(int argc, char *argv[]) {
    FILE *fp;
    char line[MAX_LINE];

    if (argc != 2) {
        print_usage(argv[0]);
        return 1;
    }

    if (strcmp(argv[1], "--help") == 0 || strcmp(argv[1], "-h") == 0) {
        print_usage(argv[0]);
        return 0;
    }

    fp = fopen(argv[1], "r");
    if (fp == NULL) {
        perror("Error opening file");
        return 1;
    }

    while (fgets(line, sizeof(line), fp) != NULL) {
        printf("%s", line);
    }

    fclose(fp);
    return 0;
}
