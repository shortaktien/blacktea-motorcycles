FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock* ./
RUN composer install --no-interaction --no-progress --prefer-dist --no-dev

FROM php:8.4-cli-alpine
WORKDIR /app
COPY --from=vendor /app/vendor ./vendor
COPY . .
EXPOSE 8000
CMD ["php", "-S", "0.0.0.0:8000", "-t", "public", "public/index.php"]
