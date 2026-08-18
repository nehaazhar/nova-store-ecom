FROM node:20-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend ./frontend
RUN npm ci --prefix frontend
RUN npm run build --prefix frontend

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY backend ./backend
COPY --from=frontend /app/frontend/dist ./frontend/dist
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "backend/server.js"]
