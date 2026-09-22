# Antigravity Rules & Guidelines for MPSCSC Claims Portal

## MANDATORY: Automatic Documentation Maintenance

The file `PROJECT_DOCS.md` is the **Single Source of Truth** for this application architecture, database schema, endpoints, and workflows.

Whenever you (the AI assistant) make any changes to this codebase:
1. **Always Synchronize `PROJECT_DOCS.md`**:
   - Before ending your turn or committing your changes, execute `npm run docs:sync` (or `node scripts/sync_docs.js --note "<Description of what was updated>"`).
2. **Verify Documentation Completeness**:
   - If new API routes were added in `server/index.js`, ensure they are documented in Section 7 of `PROJECT_DOCS.md`.
   - If database tables, columns, or indexes were modified in `server/db.js`, ensure they are documented in Section 6 of `PROJECT_DOCS.md`.
   - If UI pages or routes were added in `client/src/`, ensure they are documented in Sections 2 and 5 of `PROJECT_DOCS.md`.
3. **Commit Together**:
   - Always stage and commit `PROJECT_DOCS.md` alongside your code changes so the documentation is never out of sync.
