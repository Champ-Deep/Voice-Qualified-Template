# Lead Management System Makefile

.PHONY: help build up down restart logs clean test

help: ## Show this help message
	@echo "Lead Management System Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build all Docker images
	docker-compose build

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

restart: ## Restart all services
	docker-compose restart

logs: ## View logs from all services
	docker-compose logs -f

logs-backend: ## View backend logs
	docker-compose logs -f backend

logs-frontend: ## View frontend logs
	docker-compose logs -f frontend

logs-db: ## View database logs
	docker-compose logs -f postgres

clean: ## Stop services and remove volumes
	docker-compose down -v
	docker system prune -f

test: ## Run tests (when implemented)
	docker-compose exec backend python -m pytest

shell-backend: ## Open shell in backend container
	docker-compose exec backend bash

shell-db: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U leads_user -d leads_db

setup: ## Initial setup - build and start
	cp .env.example .env
	docker-compose build
	docker-compose up -d

status: ## Show status of all services
	docker-compose ps