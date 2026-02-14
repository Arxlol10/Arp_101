FROM php:7.4-apache

# Enable necessary modules
RUN a2enmod rewrite

# Copy challenge files
COPY challenge/ /var/www/html/

# Create flag file
RUN echo 'FLAG{web_01_polyglot_upload_x7k2}' > /var/www/flag.txt && \
    chmod 444 /var/www/flag.txt

# Ensure uploads directory is writable
RUN mkdir -p /var/www/html/uploads && \
    chown -R www-data:www-data /var/www/html/uploads && \
    chmod 755 /var/www/html/uploads

# Allow PHP execution in uploads (the vulnerability)
RUN echo '<Directory /var/www/html/uploads>\n\
    Options -Indexes\n\
    AllowOverride None\n\
    <FilesMatch "\\.php$">\n\
        SetHandler application/x-httpd-php\n\
    </FilesMatch>\n\
</Directory>' > /etc/apache2/conf-available/uploads.conf && \
    a2enconf uploads

EXPOSE 80
CMD ["apache2-foreground"]
