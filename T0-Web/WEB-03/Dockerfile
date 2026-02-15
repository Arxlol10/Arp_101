FROM php:7.4-apache

RUN a2enmod rewrite

# Copy challenge files
COPY challenge/ /var/www/html/

# Create flag file (VM path: /var/www/flags/web03/flag.txt)
RUN mkdir -p /var/www/flags/web03 && \
    echo 'FLAG{web_03_jwt_secret_leak_q2w8}' > /var/www/flags/web03/flag.txt && \
    chmod 644 /var/www/flags/web03/flag.txt && \
    chown www-data:www-data /var/www/flags/web03/flag.txt

# Apache rewrite for /api/login route
RUN echo '<Directory /var/www/html>\n\
    AllowOverride All\n\
    Require all granted\n\
    </Directory>' > /etc/apache2/conf-available/rewrite.conf && \
    a2enconf rewrite

# Create .htaccess for routing
RUN echo 'RewriteEngine On\n\
    RewriteRule ^api/login$ index.php [L,QSA]' > /var/www/html/.htaccess

EXPOSE 80
CMD ["apache2-foreground"]
