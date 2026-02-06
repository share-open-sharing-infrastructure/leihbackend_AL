FROM alpine:latest

ARG PB_VERSION=0.36.2  # bump whenever needed

RUN apk add --no-cache \
    unzip \
    ca-certificates \
    wget && \
    wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip -O /tmp/pb.zip && \
    unzip /tmp/pb.zip -d /pb/ && \
    rm /tmp/pb.zip && \
    chmod +x /pb/pocketbase

COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks

WORKDIR /pb

ENV DRY_MODE=true \
    IMPORT_MODE=false \
    LOG_LEVEL=4 \
    LL_INACTIVE_MONTHS=24 \
    LL_DELETION_GRACE_PERIOD_DAYS=7 \
    LL_NO_WELCOME=false \
    LL_NO_DELETE_INACTIVE=false

EXPOSE 8090

VOLUME /pb/pb_data

ENTRYPOINT ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
