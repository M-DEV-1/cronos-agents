FROM node:20-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy package configurations for agents/source and its dependency agents/x402
COPY agents/source/package.json agents/source/package.json
COPY agents/source/pnpm-lock.yaml agents/source/pnpm-lock.yaml
COPY agents/x402/package.json agents/x402/package.json
# Note: pnpm-lock.yaml might not exist for x402, we'll install cleanly if not copied, 
# but best practice suggests copying if it exists. We'll skip copying x402 lockfile to avoid build error if missing,
# or we could try copy and ignore error? No, Docker COPY fails.
# We will just run install.

# Install dependencies for x402
WORKDIR /app/agents/x402
RUN pnpm install

# Install dependencies for source agent
WORKDIR /app/agents/source
RUN pnpm install

# Copy source code for x402 and source agent ONLY
WORKDIR /app
COPY agents/x402 agents/x402
COPY agents/source agents/source

# Build x402
WORKDIR /app/agents/x402
RUN pnpm run build

# Build source agent
WORKDIR /app/agents/source
RUN pnpm run build

# Start the server
CMD ["pnpm", "run", "server"]
