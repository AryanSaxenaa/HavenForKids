# Build stage — use full Debian image for native module compilation (hnswlib-node)
FROM node:20.19-bullseye AS build
WORKDIR /app

# Install Python and build tools needed for hnswlib-node (native C++ addon)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
ENV VITE_CONVEX_URL=https://lovely-quail-205.convex.cloud
RUN npm run build

# Serve stage — lightweight image just to serve static files
FROM node:20.19-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["sh", "-c", "serve dist -s -l tcp://0.0.0.0:${PORT:-8080}"]
