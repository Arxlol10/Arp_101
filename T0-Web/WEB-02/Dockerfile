FROM nginx:1.24-alpine

# Install PHP-FPM
RUN apk add --no-cache php7 php7-fpm php7-json php7-session

# Nginx config for PHP
RUN echo 'server { \
    listen 80; \
    root /var/www/html; \
    index index.php; \
    \
    location / { \
        try_files $uri $uri/ /index.php?$query_string; \
    } \
    \
    location ~ \.php$ { \
        fastcgi_pass 127.0.0.1:9000; \
        fastcgi_index index.php; \
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name; \
        include fastcgi_params; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Copy challenge files
COPY challenge/ /var/www/html/

# Create flag file (not in web root)
RUN echo 'FLAG{web_02_lfi_chain_rce_m4p9}' > /var/www/flag.txt && \
    chmod 444 /var/www/flag.txt

# Make access log readable for log poisoning
RUN chmod 644 /var/log/nginx/access.log 2>/dev/null || true

# Start script
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'php-fpm7 && nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

EXPOSE 80
CMD ["/start.sh"]
