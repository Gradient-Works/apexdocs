.PHONY: help 
.DEFAULT_GOAL := help
SHA := $(shell git rev-parse --short HEAD)

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

build-docker: ## Build docker container
	docker build -t ghcr.io/gradient-works/apexdocs:latest -t ghcr.io/gradient-works/apexdocs:$(SHA) .

publish-docker: ## Publish docker container
	docker push ghcr.io/gradient-works/apexdocs:latest
	docker push ghcr.io/gradient-works/apexdocs:$(SHA)
