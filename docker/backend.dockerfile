ARG NODE_VERSION=22
ARG VUE_API_BASE_URL=localhost:3000

FROM node:${NODE_VERSION}-alpine


ENV NODE_ENV=development

WORKDIR /usr/src/app

COPY docker/sfmc.tgz ../docker/

RUN --mount=type=bind,source=./backend/package.json,target=package.json \
    --mount=type=bind,source=./backend/package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

RUN apk add --no-cache su-exec

# create uploads dir at build time (may be overridden by volumes at runtime)
RUN mkdir -p uploads && \
    chown node:node uploads

COPY ./backend ./

# copy entrypoint that fixes runtime ownership when volumes are mounted
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "app.mjs"]

# Note: runtime user remains root so the entrypoint can fix ownership,
# the entrypoint uses `su-exec` to run the app as `node`.