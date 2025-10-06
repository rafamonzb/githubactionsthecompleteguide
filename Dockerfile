FROM nginx:1.27-alpine

COPY ./config/docker/daemon.json /etc/docker/daemon.json
COPY ./config/docker/site.conf /etc/nginx/conf.d/site.conf
COPY --chown=nginx:nginx . /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/health || exit 1