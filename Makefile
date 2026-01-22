# Cronos Agents - Makefile
# ==========================

.PHONY: help install dev server client build clean check run-all agent-h adk-web

# Default target
help:
	@echo "Cronos Agents - Available Commands"
	@echo "==================================="
	@echo ""
	@echo "  make install    - Install all dependencies"
	@echo "  make run-all    - Run ALL services simultaneously"
	@echo "  make dev        - Run agent server + client"
	@echo "  make server     - Run source agent server (port 4000)"
	@echo "  make client     - Run Next.js client (port 3000)"
	@echo "  make agent-h    - Run agent-h ADK dev UI"
	@echo "  make adk-web    - Run source agent ADK dev UI (port 8000)"
	@echo "  make build      - Build all projects"
	@echo "  make check      - TypeScript check"
	@echo "  make clean      - Remove node_modules and build artifacts"
	@echo ""

# Install all dependencies
install:
	cd agents/source && pnpm install
	cd agents/agent-h && pnpm install
	cd agents/x402 && pnpm install
	cd client && pnpm install

# ===========================================
# RUN ALL - Starts everything simultaneously
# ===========================================
run-all:
	@echo "Starting services..."
	@echo "  - Agent Server (source) on port 4000"
	@echo "  - Next.js Client on port 3000"
	@echo ""
	npx concurrently \
		--names "AGENT,CLIENT" \
		--prefix-colors "cyan,green" \
		"cd agents/source && pnpm run server" \
		"cd client && pnpm run dev"

# Run agent server + client (main dev mode)
dev:
	npx concurrently \
		--names "AGENT,CLIENT" \
		--prefix-colors "cyan,green" \
		"cd agents/source && pnpm run server" \
		"cd client && pnpm run dev"

# Individual services
server:
	cd agents/source && pnpm run server

client:
	cd client && pnpm run dev

agent-h:
	cd agents/agent-h && npx @google/adk-devtools web

# Run ADK dev UI for source agent
adk-web:
	cd agents/source && pnpm run dev

# Build all projects
build:
	cd agents/source && pnpm run build
	cd agents/x402 && pnpm run build
	cd client && pnpm run build

# TypeScript check (no emit)
check:
	cd agents/source && npx tsc --noEmit
	cd client && pnpm run build

# Clean everything
clean:
	rm -rf agents/source/node_modules agents/source/dist
	rm -rf agents/agent-h/node_modules
	rm -rf agents/x402/node_modules agents/x402/dist
	rm -rf client/node_modules client/.next
