# Use Node.js 18+ as base image (Debian-based for Playwright compatibility)
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

# Install Playwright browsers
RUN npx playwright install --with-deps chromium

# Make run.sh executable
RUN chmod +x run.sh

# Set entrypoint to run.sh
ENTRYPOINT ["./run.sh"]

