FROM php:7.4-apache

COPY challenge/ /var/www/html/

# Remove internal API from public web root (it runs in separate container)
RUN rm -f /var/www/html/internal_api.php

# Create flag file
RUN echo 'FLAG{web_03_ssrf_internal_d8v5}' > /var/www/flag.txt && \
    chmod 444 /var/www/flag.txt

RUN a2enmod rewrite

EXPOSE 80
CMD ["apache2-foreground"]
