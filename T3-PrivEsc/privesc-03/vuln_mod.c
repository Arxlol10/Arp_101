#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/fs.h>
#include <linux/uaccess.h>
#include <linux/miscdevice.h>
#include <linux/cred.h>

#define DEVICE_NAME "vuln_device"
#define IOCTL_GET_ROOT 0x1337

// VULNERABLE KERNEL MODULE FOR CTF
// Players must find /dev/vuln_device and send the ioctl command IOCTL_GET_ROOT
// to elevate their process credentials to root.
// 
// Compile with Makefile: make -C /lib/modules/$(uname -r)/build M=$(pwd) modules
// Load with: insmod vuln_mod.ko

MODULE_LICENSE("GPL");
MODULE_AUTHOR("RedTeam CTF");
MODULE_DESCRIPTION("Vulnerable kernel module for T3-PrivEsc-03");

static long vuln_ioctl(struct file *file, unsigned int cmd, unsigned long arg) {
    struct cred *new_creds;

    if (cmd == IOCTL_GET_ROOT) {
        printk(KERN_INFO "vuln_device: IOCTL_GET_ROOT received. Elevating to root...\n");
        
        // VULNERABILITY: Arbitrary credential elevation without checks
        new_creds = prepare_creds();
        if (new_creds != NULL) {
            new_creds->uid.val = 0;
            new_creds->gid.val = 0;
            new_creds->euid.val = 0;
            new_creds->egid.val = 0;
            new_creds->suid.val = 0;
            new_creds->sgid.val = 0;
            new_creds->fsuid.val = 0;
            new_creds->fsgid.val = 0;
            
            commit_creds(new_creds);
            return 0; // Success
        }
    }
    return -EINVAL;
}

static const struct file_operations vuln_fops = {
    .owner = THIS_MODULE,
    .unlocked_ioctl = vuln_ioctl,
};

static struct miscdevice vuln_misc = {
    .minor = MISC_DYNAMIC_MINOR,
    .name = DEVICE_NAME,
    .fops = &vuln_fops,
    .mode = 0666, // World readable/writable so players can interact
};

static int __init vuln_init(void) {
    int ret;
    ret = misc_register(&vuln_misc);
    if (ret) {
        printk(KERN_ERR "vuln_device: Failed to register device\n");
        return ret;
    }
    printk(KERN_INFO "vuln_device: Loaded. /dev/%s created. Waiting for ioctl 0x1337...\n", DEVICE_NAME);
    return 0;
}

static void __exit vuln_exit(void) {
    misc_deregister(&vuln_misc);
    printk(KERN_INFO "vuln_device: Unloaded.\n");
}

module_init(vuln_init);
module_exit(vuln_exit);
