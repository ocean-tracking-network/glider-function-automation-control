ARG NODE_VERSION=22
ARG VUE_API_BASE_URL=localhost:3000

FROM node:${NODE_VERSION}-alpine


ENV NODE_ENV=development

WORKDIR /usr/src/app

COPY docker/sfmc.tgz ../docker/

RUN apk add --no-cache python3 make g++

RUN --mount=type=bind,source=./backend/package.json,target=package.json \
    --mount=type=bind,source=./backend/package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

RUN mkdir uploads && \
    chown node:node uploads

USER node

COPY --chown=node:node ./backend ./

EXPOSE 3000

CMD ["node", "app.mjs"]
