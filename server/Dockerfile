FROM node:18

WORKDIR /app

COPY package.json ./
RUN npm install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "index.js"]
