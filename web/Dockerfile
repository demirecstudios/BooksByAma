FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Create dist directory for Railway caching
RUN mkdir -p /app/dist

EXPOSE 3000

CMD ["npm", "start"]
