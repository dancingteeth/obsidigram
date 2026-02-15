FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY telegram-bot/package.json ./telegram-bot/
COPY telegram-bot/tsconfig.json ./telegram-bot/

# Install all dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# Copy source and static files
COPY telegram-bot/src/ ./telegram-bot/src/
COPY telegram-bot/public/ ./telegram-bot/public/

# Build TypeScript
WORKDIR /app/telegram-bot
RUN pnpm run build

# Remove dev dependencies
RUN pnpm prune --prod

# Create data and logs directories
RUN mkdir -p /app/telegram-bot/data /app/telegram-bot/logs

WORKDIR /app/telegram-bot

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Start the bot
CMD ["node", "dist/index.js"]
