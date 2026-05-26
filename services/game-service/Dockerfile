FROM node:20-alpine
WORKDIR /app
COPY . .
RUN apk add --no-cache openssl
RUN npm install
RUN npx prisma generate
RUN npm run build
RUN npm prune --production
EXPOSE 3000
CMD ["node", "dist/index.js"]
