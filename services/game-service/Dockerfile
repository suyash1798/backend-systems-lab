FROM node:20-alpine
WORKDIR /repo
RUN apk add --no-cache openssl

COPY packages/game-gdk/package*.json packages/game-gdk/
RUN npm install --prefix packages/game-gdk
COPY packages/game-gdk packages/game-gdk
RUN npm run build --prefix packages/game-gdk

COPY services/game-service/package*.json services/game-service/
RUN npm install --prefix services/game-service
COPY services/game-service services/game-service

WORKDIR /repo/services/game-service
RUN npx prisma generate --schema prisma/schema
RUN npm run build
RUN npm prune --production
EXPOSE 3000 9229
CMD ["node", "dist/index.js"]
