FROM alpine:3.19

# Install required packages
RUN apk add --no-cache \
    postgresql16-client \
    aws-cli \
    gnupg \
    gzip \
    bash \
    curl \
    jq \
    dcron \
    docker-cli \
    tzdata

# Set timezone
ENV TZ=UTC

# Create backup user and directories
RUN addgroup -g 1000 backup && \
    adduser -D -u 1000 -G backup backup && \
    mkdir -p /backup/scripts /backup/keys /var/log/renderowl /var/lib/node_exporter/textfile_collector && \
    chown -R backup:backup /backup /var/log/renderowl

# Copy entrypoint and cron setup
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY crontab /etc/crontabs/backup

RUN chmod +x /usr/local/bin/entrypoint.sh && \
    chown backup:backup /etc/crontabs/backup

# Switch to backup user
USER backup

WORKDIR /backup

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["crond", "-f", "-l", "2"]
