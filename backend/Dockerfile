FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

# Create dist directory for Railway caching
RUN mkdir -p /app/dist

EXPOSE 3000

CMD ["node", "server.js"]
