ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine


ENV NODE_ENV=development

WORKDIR /usr/src/app

RUN --mount=type=bind,source=./frontend/package.json,target=package.json \
    --mount=type=bind,source=./frontend/package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

RUN npm install -g http-server

COPY ./frontend ./

RUN npm install

EXPOSE 8080

RUN npm run build

# CMD ["npm", "run", "dev", "--host"]

CMD ["http-server", "dist"]