FROM nginx:1.24-alpine

# Install PHP-FPM
RUN apk add --no-cache php7 php7-fpm php7-json php7-session php7-fileinfo php7-ctype

# Nginx config — enables .pht execution (the vulnerability)
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /var/www/html; \
    index index.php index.html; \
    \
    location / { \
        try_files $uri $uri/ /index.php?$query_string; \
    } \
    \
    location ~ \.(php|pht)$ { \
        fastcgi_pass 127.0.0.1:9000; \
        fastcgi_index index.php; \
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name; \
        include fastcgi_params; \
    } \
    \
    location ~ ^/uploads/.*\.php$ { \
        deny all; \
    } \
    \
    client_max_body_size 10M; \
}' > /etc/nginx/conf.d/default.conf

# Copy challenge files
COPY challenge/ /var/www/html/

# Create flag file (VM path: /var/www/flags/web01/flag.txt)
RUN mkdir -p /var/www/flags/web01 && \
    echo 'FLAG{web_01_polyglot_upload_bypass_k8m3}' > /var/www/flags/web01/flag.txt && \
    chmod 644 /var/www/flags/web01/flag.txt && \
    chown nobody:nobody /var/www/flags/web01/flag.txt

# Ensure uploads directory is writable
RUN mkdir -p /var/www/html/uploads && \
    chown -R nobody:nobody /var/www/html/uploads && \
    chmod 755 /var/www/html/uploads

# ── HARDENING (mirrors VM setup_ctf.sh) ──
# Disable dangerous PHP functions via php.ini
RUN echo '[PHP]' > /etc/php7/conf.d/99-hardening.ini && \
    echo 'disable_functions = exec,system,passthru,shell_exec,popen,proc_open,proc_close,proc_get_status,pcntl_exec,pcntl_fork,pcntl_signal,curl_exec,curl_multi_exec,parse_ini_file,show_source,dl,fsockopen,pfsockopen,stream_socket_client,stream_socket_server,stream_socket_pair,socket_create,socket_connect,mail,putenv,symlink,link,chgrp,chown,chmod' >> /etc/php7/conf.d/99-hardening.ini && \
    echo 'open_basedir = /var/www/html/:/var/www/flags/web01/:/tmp/' >> /etc/php7/conf.d/99-hardening.ini && \
    echo 'allow_url_fopen = Off' >> /etc/php7/conf.d/99-hardening.ini && \
    echo 'allow_url_include = Off' >> /etc/php7/conf.d/99-hardening.ini

# Start script
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'php-fpm7 && nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

EXPOSE 80
CMD ["/start.sh"]
