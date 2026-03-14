#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/fs.h>
#include <linux/uaccess.h>
#include <linux/cred.h>

#define DEVICE_NAME "nexus_auth"
#define MAGIC_PASS "nexus_root_grant"

MODULE_LICENSE("GPL");
MODULE_AUTHOR("NexusCorp Developer");
MODULE_DESCRIPTION("NexusCorp internal authentication module");
MODULE_VERSION("1.0");

static int major_num;

static ssize_t dev_write(struct file *file, const char __user *buffer, size_t len, loff_t *offset) {
    char kbuf[32];
    struct cred *new_cred;

    if (len >= sizeof(kbuf)) {
        return -EINVAL;
    }

    if (copy_from_user(kbuf, buffer, len)) {
        return -EFAULT;
    }
    kbuf[len] = '\0';

    // VULNERABILITY: Writing the magic string elevates the credentials of the calling process to root
    if (strncmp(kbuf, MAGIC_PASS, strlen(MAGIC_PASS)) == 0) {
        printk(KERN_INFO "nexus_auth: Magic password received. Granting root...\n");
        
        new_cred = prepare_creds();
        if (new_cred != NULL) {
            new_cred->uid.val = new_cred->gid.val = 0;
            new_cred->euid.val = new_cred->egid.val = 0;
            new_cred->suid.val = new_cred->sgid.val = 0;
            new_cred->fsuid.val = new_cred->fsgid.val = 0;
            commit_creds(new_cred);
        }
    } else {
        printk(KERN_INFO "nexus_auth: Invalid auth attempt.\n");
    }

    return len;
}

static struct file_operations fops = {
    .write = dev_write,
};

static int __init nexus_auth_init(void) {
    major_num = register_chrdev(0, DEVICE_NAME, &fops);
    if (major_num < 0) {
        printk(KERN_ALERT "nexus_auth: Failed to register device\n");
        return major_num;
    }
    printk(KERN_INFO "nexus_auth: Loaded with major number %d\n", major_num);
    return 0;
}

static void __exit nexus_auth_exit(void) {
    unregister_chrdev(major_num, DEVICE_NAME);
    printk(KERN_INFO "nexus_auth: Unloaded\n");
}

module_init(nexus_auth_init);
module_exit(nexus_auth_exit);
