FROM php:8.5.9-fpm-alpine3.23

RUN apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/edge/main \
    nginx=1.30.4-r3 mariadb=11.8.8-r0 mariadb-client=11.8.8-r0 bash file pax-utils \
  && mkdir -p /stage/root /stage/bin /stage/lib \
  && curl -fsSLo /tmp/wp-cli.phar https://github.com/wp-cli/wp-cli/releases/download/v2.12.0/wp-cli-2.12.0.phar \
  && echo 'ce34ddd838f7351d6759068d09793f26755463b4a4610a5a5c0a97b68220d85c  /tmp/wp-cli.phar' | sha256sum -c -

RUN docker-php-ext-install -j2 mysqli pdo_mysql

COPY stage-runtime.sh /usr/local/bin/stage-runtime
RUN chmod +x /usr/local/bin/stage-runtime && /usr/local/bin/stage-runtime

FROM scratch AS export
COPY --from=0 /stage/ /
