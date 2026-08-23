FROM node:20-alpine

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy backend source code
COPY . .

# Expose backend API port
EXPOSE 8000

# Command to launch the backend server using ts-node
CMD ["npx", "ts-node", "--transpile-only", "src/index.ts"]
