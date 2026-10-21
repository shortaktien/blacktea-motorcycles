FROM php:8.4.27-cli-alpine AS php-base
WORKDIR /app
RUN apk add --no-cache curl \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS curl-dev \
    && docker-php-ext-install -j"$(nproc)" curl \
    && apk del .build-deps
COPY scripts/check-php-runtime.php ./scripts/check-php-runtime.php
RUN php scripts/check-php-runtime.php

FROM php-base AS vendor
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
RUN apk add --no-cache unzip
COPY composer.json composer.lock* ./
RUN composer install --no-interaction --no-progress --prefer-dist --no-dev \
    && composer check-platform-reqs --no-dev

FROM php-base
COPY --from=vendor /app/vendor ./vendor
COPY . .
EXPOSE 8000
CMD ["php", "-S", "0.0.0.0:8000", "-t", "public", "public/index.php"]
