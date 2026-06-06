FROM node:18-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./

RUN npm install

COPY prisma ./prisma

RUN npx prisma generate

COPY . .

EXPOSE 6371

CMD ["sh", "-c", "npx prisma db push && node src/seed.js && node src/server.js"]
