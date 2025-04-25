vault:
	@echo "Vault commands:"
	@echo "  make new NAME=foo.sh    - Create script + metadata + sync index"
	@echo "  make sync               - Rebuild index from metadata"

new:
	bash bash-vault/new-script.sh $(NAME)

sync:
	node bash-vault/sync-index.js

checklist:
	@echo "Running checklist..."
	# Add linting, type-checking here if configured
	@echo "- Verifying secrets..."
	pnpm run secrets:verify
	# Add Lighthouse check here if configured
	@echo "✅ Checklist passed."

smoke:
	@echo "Running smoke tests..."
	./scripts/run-green-flag.sh
	# Add Playwright tests here if configured
	@echo "✅ Smoke tests passed."

