# Production Dockerfile for MPSCSC Claims Portal
FROM node:20-slim AS builder

WORKDIR /app

# Install build tools for better-sqlite3 native compilation
RUN apt-get update && apt-get install -y python3 make g++ gcc sqlite3 && rm -rf /var/lib/apt/lists/*

# Copy package files first for optimal layer caching
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install dependencies for both server and client
RUN npm install --prefix server
RUN npm install --prefix client

# Copy application source code
COPY . .

# Build React client for production
RUN npm run build:client

# Remove development devDependencies in client to slim down image
RUN npm prune --prefix server --production

# Expose server port (Render / Railway / Fly inject PORT dynamically)
ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000

# Start server (serves REST API + client/dist Single Page Application)
CMD ["node", "server/index.js"]
