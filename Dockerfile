# Use a multi-arch base image for easy cross-compilation
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies for building native modules (sqlite3)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install dependencies for running native modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

# Create a volume for the database
VOLUME /data
ENV DB_PATH=/data/database.sqlite

CMD ["node", "dist/index.js"]
