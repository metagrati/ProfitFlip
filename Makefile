vault:
	@echo "Vault commands:"
	@echo "  make new NAME=foo.sh    - Create script + metadata + sync index"
	@echo "  make sync               - Rebuild index from metadata"

new:
	bash bash-vault/new-script.sh $(NAME)

sync:
	node bash-vault/sync-index.js

