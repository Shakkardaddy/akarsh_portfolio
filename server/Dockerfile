FROM node:18-alpine

WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

RUN npm install --omit=dev

# Copy server code
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
