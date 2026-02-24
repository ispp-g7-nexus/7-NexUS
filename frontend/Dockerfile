FROM node:20

WORKDIR /app

# Instalar dependencias primero (caché de Docker)
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]