# Retirement Financial Planner — top-level Makefile
# ----------------------------------------------------------------------------
# Why a Makefile for a vanilla-JS app: turns the 3-command "cd + build + serve"
# muscle-memory into one word. Idempotent: `make dev` will always rebuild and
# start a fresh server on PORT (default 8765); `make stop` cleanly shuts it
# down. Add new targets here as the project grows.

PORT       ?= 8765
APP_DIR    := retirement-planner
INDEX      := $(APP_DIR)/index.html
PID_FILE   := /tmp/finance-calculator-server.pid
LOG_FILE   := /tmp/finance-calculator-server.log
URL        := http://localhost:$(PORT)/index.html

# Default target: show what's available
.PHONY: help
help:
	@echo "Retirement Financial Planner — make targets:"
	@echo ""
	@echo "  make dev       Build + start server + open in browser (PORT=$(PORT))"
	@echo "  make build     Concatenate pages + scripts into $(INDEX)"
	@echo "  make serve     Start local HTTP server on PORT=$(PORT) (no rebuild)"
	@echo "  make stop      Kill the running local server"
	@echo "  make restart   stop + dev"
	@echo "  make open      Open http://localhost:$(PORT)/index.html in browser"
	@echo "  make status    Show whether the server is running"
	@echo "  make clean     Remove the built index.html (forces full rebuild)"
	@echo ""
	@echo "Phase work:"
	@echo "  make phase     Show current branch + last 5 commits"
	@echo ""

# ---- Build the concatenated index.html ----
.PHONY: build
build:
	@cd $(APP_DIR) && bash build.sh

# ---- Start a local HTTP server in the background ----
# Why we need a server (vs file://): the Monte Carlo Worker uses Blob URL
# which works in both modes, but localStorage scoping + share-link URL params
# are clearer when served from http://localhost. Also Playwright tests assume http.
.PHONY: serve
serve: stop
	@cd $(APP_DIR) && nohup python3 -m http.server $(PORT) > $(LOG_FILE) 2>&1 & echo $$! > $(PID_FILE)
	@sleep 0.5
	@echo "Server started on $(URL) (pid=$$(cat $(PID_FILE)))"

# ---- Stop any running server cleanly ----
.PHONY: stop
stop:
	@if [ -f $(PID_FILE) ]; then \
		PID=$$(cat $(PID_FILE)); \
		if kill -0 $$PID 2>/dev/null; then \
			kill $$PID && echo "Stopped server (pid=$$PID)"; \
		else \
			echo "No live process for pid=$$PID — cleaning up stale pidfile"; \
		fi; \
		rm -f $(PID_FILE); \
	else \
		PID=$$(lsof -nP -i :$(PORT) -t 2>/dev/null | head -1); \
		if [ -n "$$PID" ]; then \
			kill $$PID && echo "Stopped server on port $(PORT) (pid=$$PID)"; \
		else \
			echo "No server running on port $(PORT)"; \
		fi; \
	fi

# ---- Build + serve + open browser (the main "I want to use the app" target) ----
.PHONY: dev
dev: build serve open

# ---- Open the app in the default browser (macOS) ----
.PHONY: open
open:
	@open $(URL) 2>/dev/null || echo "Please open $(URL) manually"

# ---- Restart shortcut ----
.PHONY: restart
restart: stop dev

# ---- Status ----
.PHONY: status
status:
	@if [ -f $(PID_FILE) ] && kill -0 $$(cat $(PID_FILE)) 2>/dev/null; then \
		echo "✓ Server running on $(URL) (pid=$$(cat $(PID_FILE)))"; \
	elif lsof -nP -i :$(PORT) -t > /dev/null 2>&1; then \
		echo "⚠ Something else is on port $(PORT) (pid=$$(lsof -nP -i :$(PORT) -t | head -1))"; \
	else \
		echo "✗ Server not running"; \
	fi
	@if [ -f $(INDEX) ]; then \
		echo "✓ Built index.html exists ($$(wc -l < $(INDEX) | tr -d ' ') lines)"; \
	else \
		echo "✗ index.html not built — run 'make build'"; \
	fi

# ---- Clean ----
.PHONY: clean
clean:
	@rm -f $(INDEX)
	@echo "Removed $(INDEX). Run 'make build' to recreate."

# ---- Phase / branch info ----
.PHONY: phase
phase:
	@echo "Branch: $$(git branch --show-current)"
	@echo "Last 5 commits:"
	@git log --oneline -5
