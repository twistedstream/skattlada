ARG NPM_VERSION="9.6.7"

FROM node:22-alpine AS build_stage

WORKDIR /app

COPY ./package.json /app/
COPY ./package-lock.json /app/
RUN npm i -g npm@${NPM_VERSION}
# INFO: https://docs.npmjs.com/cli/v6/commands/npm-ci
RUN npm ci

COPY ./ /app/
RUN npm run build

FROM node:22-alpine AS final_stage

WORKDIR /app
COPY --from=build_stage /app/package.json /app/
COPY --from=build_stage /app/package-lock.json /app/
COPY --from=build_stage /app/dist/ /app/
COPY --from=build_stage /app/public/ /app/public/
COPY --from=build_stage /app/views/ /app/views/
# copy local file provider test files
COPY --from=build_stage /app/src/data/file-providers/files/ /app/data/file-providers/files/
RUN npm ci --omit dev

EXPOSE 8000
ENV NODE_ENV="production"
ENV PORT="8000"
USER node

CMD ["node", "server.js"]
