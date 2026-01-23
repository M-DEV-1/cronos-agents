FROM node:20-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy source code first for reliability
COPY agents/x402 agents/x402
COPY agents/source agents/source

# Install and build x402
WORKDIR /app/agents/x402
RUN pnpm install && pnpm run build

# Install and build source agent
WORKDIR /app/agents/source
RUN pnpm install && pnpm run build

# Expose port (Railway will override PORT env var, but this documents intent)
EXPOSE 4000

# Start server from the correct directory
CMD ["pnpm", "run", "server"]
