FROM node:18

LABEL maintainer="docker@elementia.me"

ENV DEBIAN_FRONTEND noninteractive

WORKDIR /app
ADD . /app

RUN mkdir /data \
  && \
  chown -R node:node /app \
  && \
  chown -R node:node /data
#  TODO do i need this for webp anymore?
#  && \
#  apt-get update \
#  && \
#  apt-get install -y webp

USER node
RUN /usr/local/bin/npm install
RUN /usr/local/bin/npm run build

EXPOSE 3000/tcp

ENV DB_CLIENT="postgresql" \
    DB_HOST="postgresql" \
    DB_DATABASE="postgresql" \
    DB_USER="postgresql" \
    DB_PASSWORD="please let me in" \
    DB_FILENAME="docker_database.sqlite3" \
    OPENWEATHER_APPID=''\
    OPENWEATHER_LOCATION='London,UK'

VOLUME /data
WORKDIR /app/dist

CMD ["/usr/local/bin/node", "/app/dist/index.js"]

HEALTHCHECK CMD curl -f http://localhost:3030/api/healthcheck >/dev/null