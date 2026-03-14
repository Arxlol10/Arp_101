#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

// Compiled with: gcc -o binary03_heap binary03_heap.c
// Needs recent libc (e.g., Ubuntu 18.04+) for tcache
// Note: SUID binaries dump privileges if allocating glibc heaps via malicious env vars, 
// but heap overflows themselves are exploitable once loaded.

typedef struct {
    char name[64];
    int size;
    char *data;
} Request;

void win() {
    printf("[*] Access Granted. Here is your shell!\n");
    setreuid(0, 0);
    setregid(0, 0);
    system("/bin/sh");
}

int main() {
    setvbuf(stdout, NULL, _IONBF, 0);
    setvbuf(stdin,  NULL, _IONBF, 0);

    /*
     * We allocate three chunks. 
     * The vulnerability is a classic heap overflow where you can write 
     * out of bounds on chunk1 into chunk2's metadata.
     * We provide a simple "Add", "Edit", "Delete" interface.
     */

    char *chunks[10];
    int sizes[10];
    int num_chunks = 0;

    printf("--- T3 Advanced Heap Manager ---\n");
    printf("[!] Note: SUID privs active. Do not exploit.\n");
    printf("win() function located at %p\n", win);

    while (1) {
        printf("\n1. Alloc\n2. Edit\n3. Free\n4. Exit\n> ");
        int choice;
        if (scanf("%d", &choice) != 1) exit(1);

        if (choice == 1) {
            if (num_chunks >= 10) {
                printf("Max chunks reached\n");
                continue;
            }
            printf("Size: ");
            int size;
            if (scanf("%d", &size) != 1) exit(1);
            if (size > 1024) size = 1024;
            
            chunks[num_chunks] = malloc(size);
            sizes[num_chunks] = size;
            printf("Allocated chunk %d at %p\n", num_chunks, chunks[num_chunks]);
            num_chunks++;
        } 
        else if (choice == 2) {
            printf("Index: ");
            int idx;
            if (scanf("%d", &idx) != 1) exit(1);
            if (idx < 0 || idx >= num_chunks || !chunks[idx]) {
                printf("Invalid chunk\n");
                continue;
            }
            printf("Data: ");
            // VULN: Read up to sizes[idx] + 32 bytes! Heap overflow +32 bytes (enough to overwrite next chunk header/fd ptr)
            read(0, chunks[idx], sizes[idx] + 32); 
            printf("Updated.\n");
        } 
        else if (choice == 3) {
            printf("Index: ");
            int idx;
            if (scanf("%d", &idx) != 1) exit(1);
            if (idx < 0 || idx >= num_chunks || !chunks[idx]) {
                printf("Invalid chunk\n");
                continue;
            }
            // VULN: UAF! Does not clear the chunk pointer after free
            free(chunks[idx]); 
            // chunks[idx] = NULL; // Missing!
            printf("Freed chunk %d.\n", idx);
        }
        else {
            break;
        }
    }

    return 0;
}
