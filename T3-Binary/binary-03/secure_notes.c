#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

char *notes[10];

void secret_admin_shell() {
    printf("[!] WARNING: Unauthorized admin function invoked!\n");
    setresuid(geteuid(), geteuid(), geteuid());
    system("/bin/cat /home/engineer/.flag_binary03 2>/dev/null || echo 'FLAG{t3_h34p_tc4ch3_p01s0n1ng_n9k4}'");
    exit(0);
}

void print_menu() {
    printf("\n--- Secure Note Taker v1.0 ---\n");
    printf("1. Create Note\n");
    printf("2. Delete Note\n");
    printf("3. View Note\n");
    printf("4. Edit Note\n");
    printf("5. Exit\n");
    printf("> ");
}

void create_note() {
    for (int i = 0; i < 10; i++) {
        if (!notes[i]) {
            notes[i] = malloc(0x40);
            printf("Enter content: ");
            read(0, notes[i], 0x3f);
            notes[i][strcspn(notes[i], "\n")] = 0;
            printf("Note %d created.\n", i);
            return;
        }
    }
    printf("[-] Storage full.\n");
}

void delete_note() {
    int idx;
    char buf[16];
    printf("Index to delete: ");
    read(0, buf, sizeof(buf));
    idx = atoi(buf);

    if (idx >= 0 && idx < 10) {
        if (notes[idx]) {
            free(notes[idx]);
            printf("Note %d deleted.\n", idx);
            // VULNERABILITY: Use-After-Free (UAF) - Does not set pointer to NULL
            // notes[idx] = NULL; 
        } else {
            printf("[-] Note is already empty.\n");
        }
    }
}

void view_note() {
    int idx;
    char buf[16];
    printf("Index to view: ");
    read(0, buf, sizeof(buf));
    idx = atoi(buf);

    if (idx >= 0 && idx < 10 && notes[idx]) {
        printf("Note %d: %s\n", idx, notes[idx]);
    } else {
        printf("[-] Invalid index or empty note.\n");
    }
}

void edit_note() {
    int idx;
    char buf[16];
    printf("Index to edit: ");
    read(0, buf, sizeof(buf));
    idx = atoi(buf);

    if (idx >= 0 && idx < 10 && notes[idx]) {
        printf("Enter new content: ");
        // VULNERABILITY: Writing to a freed chunk (Tcache poisoning)
        read(0, notes[idx], 0x3f);
        notes[idx][strcspn(notes[idx], "\n")] = 0;
        printf("Note %d updated.\n", idx);
    } else {
        printf("[-] Invalid index or empty note.\n");
    }
}

int main() {
    setvbuf(stdout, NULL, _IONBF, 0);
    setvbuf(stdin, NULL, _IONBF, 0);
    char buf[16];
    int choice;

    while (1) {
        print_menu();
        read(0, buf, sizeof(buf));
        choice = atoi(buf);

        switch (choice) {
            case 1: create_note(); break;
            case 2: delete_note(); break;
            case 3: view_note(); break;
            case 4: edit_note(); break;
            case 5: printf("Goodbye.\n"); exit(0);
            default: printf("[-] Invalid choice.\n");
        }
    }
    return 0;
}
