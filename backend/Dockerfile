# ====================================================
# STAGE 1: Build & Compile TypeScript
# ====================================================
FROM node:20-alpine AS builder

# Set working directory inside the container
WORKDIR /app

# Copy package manifests first (leveraging Docker layer caching)
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy backend source code
COPY . .

# Build TypeScript code to production JavaScript in dist/
RUN npm run build

# ====================================================
# STAGE 2: Lightweight Production Runtime
# ====================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy package manifests and install ONLY production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled JavaScript output from builder stage
COPY --from=builder /app/dist ./dist

# Expose backend API port
EXPOSE 8000

# Command to launch the backend server
CMD ["node", "dist/index.js"]
