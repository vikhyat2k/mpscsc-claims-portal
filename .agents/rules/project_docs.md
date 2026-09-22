# Rules for PROJECT_DOCS.md Synchronization

1. `PROJECT_DOCS.md` MUST remain the authoritative single source of truth for the MPSCSC Claims Portal.
2. Whenever modifying API routes, database schemas, frontend components, or configuration:
   - Run `npm run docs:sync` or `node scripts/sync_docs.js`.
   - Update any qualitative documentation sections affected by the changes.
3. Git pre-commit hooks in `.githooks/pre-commit` will automatically audit and stage `PROJECT_DOCS.md` on every commit.
