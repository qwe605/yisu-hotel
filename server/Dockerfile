FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY src ./src
EXPOSE 3001
CMD ["node","src/app.js"]
