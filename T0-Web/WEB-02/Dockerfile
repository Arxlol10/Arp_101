FROM php:7.4-apache

# Install ImageMagick (vulnerable version for ImageTragick CVE-2016-3714)
RUN apt-get update && \
    apt-get install -y imagemagick libmagickwand-dev iptables && \
    rm -rf /var/lib/apt/lists/*

# Vulnerable ImageMagick policy — allows dangerous delegates
RUN echo '<policymap>\n\
    <policy domain="resource" name="memory" value="256MiB"/>\n\
    <policy domain="resource" name="time" value="30"/>\n\
    <policy domain="coder" rights="read|write" pattern="*" />\n\
    <policy domain="delegate" rights="read|write" pattern="*" />\n\
    <policy domain="path" rights="read|write" pattern="@*" />\n\
    </policymap>' > /etc/ImageMagick-6/policy.xml

# Copy challenge files
COPY challenge/ /var/www/html/

# Create flag file (VM path: /var/www/flags/web02/flag.txt)
RUN mkdir -p /var/www/flags/web02 && \
    echo 'FLAG{web_02_imagetragick_rce_p9n7}' > /var/www/flags/web02/flag.txt && \
    chmod 644 /var/www/flags/web02/flag.txt && \
    chown www-data:www-data /var/www/flags/web02/flag.txt

# Ensure uploads directory
RUN mkdir -p /var/www/html/uploads && \
    chown -R www-data:www-data /var/www/html/uploads && \
    chmod 755 /var/www/html/uploads

# ── HARDENING (mirrors VM setup_ctf.sh) ──

# Create safe_convert wrapper
RUN echo '#!/bin/bash\n\
    INPUT="$1"\n\
    OUTPUT="$2"\n\
    [ $# -ne 2 ] && exit 1\n\
    case "$INPUT" in /var/www/html/uploads/*) ;; *) exit 1 ;; esac\n\
    case "$OUTPUT" in /var/www/html/uploads/*) ;; *) exit 1 ;; esac\n\
    echo "$INPUT" | grep -q "\\.\\." && exit 1\n\
    echo "$OUTPUT" | grep -q "\\.\\." && exit 1\n\
    /usr/bin/convert "$INPUT" -resize 200x200 "$OUTPUT" 2>&1' > /usr/local/bin/safe_convert && \
    chmod 755 /usr/local/bin/safe_convert

# Disable dangerous PHP functions (exec stays enabled for safe_convert)
RUN echo 'disable_functions = system,passthru,shell_exec,popen,proc_open,pcntl_exec,pcntl_fork,fsockopen,pfsockopen,stream_socket_client,stream_socket_server,dl,mail,putenv,symlink,link' > /usr/local/etc/php/conf.d/99-hardening.ini && \
    echo 'open_basedir = /var/www/html/:/var/www/flags/web02/:/tmp/' >> /usr/local/etc/php/conf.d/99-hardening.ini && \
    echo 'allow_url_fopen = Off' >> /usr/local/etc/php/conf.d/99-hardening.ini && \
    echo 'allow_url_include = Off' >> /usr/local/etc/php/conf.d/99-hardening.ini

# Restrict dangerous binaries
RUN for bin in nc ncat netcat socat wget curl telnet python3 perl ruby; do \
    path=$(which $bin 2>/dev/null) || true; \
    [ -n "$path" ] && [ -f "$path" ] && chmod 750 "$path" && chown root:root "$path"; \
    done || true

RUN a2enmod rewrite

EXPOSE 80
CMD ["apache2-foreground"]
