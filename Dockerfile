FROM docker.io/library/node:22

LABEL maintainer="docker@elementia.me"

ENV DEBIAN_FRONTEND noninteractive


WORKDIR /app
ADD . /app

RUN mkdir /data
RUN chown node:node /app /app/*
#RUN chown -R node:node /data

USER node
RUN /usr/local/bin/npm install
RUN /usr/local/bin/npm test
RUN /usr/local/bin/npm run build

EXPOSE 3030/tcp

ENV DB_CLIENT="postgresql" \
    DB_HOST="postgresql" \
    DB_DATABASE="postgresql" \
    DB_USER="postgresql" \
    DB_PASSWORD="please let me in" \
    DB_FILENAME="docker_database.sqlite3" \
    OPENWEATHER_APPID=''\
    OPENWEATHER_LOCATION='London,UK'

VOLUME /data
WORKDIR /app

CMD ["/usr/local/bin/npm", "start"]

HEALTHCHECK --interval=5m --timeout=3s CMD curl -f http://localhost:3030/api/healthcheck
