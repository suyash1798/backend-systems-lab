FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
RUN npm prune --production
EXPOSE 7000
CMD ["node", "dist/index.js"]
