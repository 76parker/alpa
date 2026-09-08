FROM node:22.22.2-alpine3.23 AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM node:22.22.2-alpine3.23 AS build

ENV VINEXT_OUTPUT_MODE=standalone

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:22.22.2-alpine3.23 AS runtime

ENV HOST=0.0.0.0 \
    NODE_ENV=production \
    PORT=3000

WORKDIR /app

COPY --from=build --chown=node:node /app/dist/standalone ./
COPY --from=dependencies --chown=node:node /app/node_modules/react ./node_modules/react
COPY --from=dependencies --chown=node:node /app/node_modules/react-dom ./node_modules/react-dom
COPY --from=dependencies --chown=node:node /app/node_modules/scheduler ./node_modules/scheduler

EXPOSE 3000

USER node

CMD ["node", "server.js"]
