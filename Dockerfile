FROM debian:trixie-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx \
    && rm -rf /var/lib/apt/lists/*

COPY index.html script.js styles.css /usr/share/nginx/html/

# Replace Debian's default site with one that listens on the internal port 8080
RUN rm -f /etc/nginx/sites-enabled/default \
    && printf '%s\n' \
        'server {' \
        '    listen 8080;' \
        '    server_name _;' \
        '    root /usr/share/nginx/html;' \
        '    index index.html;' \
        '    location / {' \
        '        try_files $uri $uri/ =404;' \
        '    }' \
        '}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
