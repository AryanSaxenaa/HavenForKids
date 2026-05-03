# Build stage
FROM node:20.19-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ENV VITE_CONVEX_URL=https://lovely-quail-205.convex.cloud
RUN npm run build

# Serve stage
FROM node:20.19-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["sh", "-c", "serve dist -s -l tcp://0.0.0.0:${PORT:-8080}"]
