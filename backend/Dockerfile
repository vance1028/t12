FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY prisma ./prisma

RUN npx prisma generate

COPY . .

EXPOSE 6371

CMD ["sh", "-c", "npx prisma migrate deploy && node src/seed.js && node src/server.js"]
