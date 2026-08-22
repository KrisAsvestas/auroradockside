FROM php:8.5.9-fpm-alpine3.23

RUN apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/edge/main \
    nginx=1.30.4-r3 mariadb=11.8.8-r0 mariadb-client=11.8.8-r0 bash file pax-utils \
  && mkdir -p /stage/root /stage/bin /stage/lib

COPY stage-runtime.sh /usr/local/bin/stage-runtime
RUN chmod +x /usr/local/bin/stage-runtime && /usr/local/bin/stage-runtime

FROM scratch AS export
COPY --from=0 /stage/ /
