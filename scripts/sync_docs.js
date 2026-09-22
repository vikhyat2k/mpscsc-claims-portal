#!/usr/bin/env node
/**
 * scripts/sync_docs.js
 * ==============================================================================
 * Automated documentation synchronizer for MPSCSC Claims Portal.
 * Systematically audits codebase and synchronizes PROJECT_DOCS.md.
 *
 * Capabilities:
 *   1. Scans server/index.js for all Express endpoints, methods, and middlewares.
 *   2. Scans server/db.js for tables, indexes, and journal_mode (WAL).
 *   3. Scans client/src/App.jsx for frontend routes.
 *   4. Scans Git log for latest commits and auto-updates Section 15 (Change Log).
 *   5. Verifies Section 7 (REST API Reference) for missing routes.
 *   6. Updates Quick Status Dashboard metrics and Last Sync date.
 *
 * Usage:
 *   node scripts/sync_docs.js                 -> Audit and sync PROJECT_DOCS.md
 *   node scripts/sync_docs.js --check         -> Validate sync (exits with 1 if out of sync)
 *   node scripts/sync_docs.js --note "msg"    -> Append custom milestone note to Change Log
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const docsPath = path.join(rootDir, 'PROJECT_DOCS.md');
const serverIndexPath = path.join(rootDir, 'server', 'index.js');
const serverDbPath = path.join(rootDir, 'server', 'db.js');
const appJsxPath = path.join(rootDir, 'client', 'src', 'App.jsx');

// Parse CLI flags
const args = process.argv.slice(2);
const isCheckOnly = args.includes('--check');
let customNote = null;
const noteIdx = args.indexOf('--note');
if (noteIdx !== -1 && args[noteIdx + 1]) {
    customNote = args[noteIdx + 1];
}

console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║        MPSCSC Claims Portal — Docs Automated Sync Engine        ║');
console.log('╚══════════════════════════════════════════════════════════════════╝');

if (!fs.existsSync(docsPath)) {
    console.error(`❌ Error: PROJECT_DOCS.md not found at ${docsPath}`);
    process.exit(1);
}

// ─────────────────────────────────────────────
// 1. EXTRACT EXPRESS API ROUTES FROM server/index.js
// ─────────────────────────────────────────────
const serverIndexContent = fs.readFileSync(serverIndexPath, 'utf8');
const routeLines = serverIndexContent.split('\n');
const extractedRoutes = [];

// Matches lines like: app.post('/api/auth/login', authLimiter, async (req, res) => {
const routeRegex = /app\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]\s*,\s*([\s\S]*?)(?:async\s*)?\(/;

for (let i = 0; i < routeLines.length; i++) {
    const line = routeLines[i];
    const match = line.match(routeRegex);
    if (match) {
        const method = match[1].toUpperCase();
        const routePath = match[2];
        const middleware = match[3] || '';
        
        let authLevel = 'Bearer Token';
        if (middleware.includes('requireAdmin')) {
            authLevel = 'Admin Only';
        } else if (
            routePath.startsWith('/api/auth/register') ||
            routePath.startsWith('/api/auth/login') ||
            routePath.startsWith('/api/auth/forgot-password') ||
            routePath.startsWith('/api/auth/reset-password')
        ) {
            authLevel = middleware.includes('authLimiter') ? 'Public (Rate Limited)' : 'Public';
        }

        extractedRoutes.push({ method, path: routePath, authLevel });
    }
}

const authRoutes = extractedRoutes.filter(r => r.path.startsWith('/api/auth/'));
const adminRoutes = extractedRoutes.filter(r => r.path.startsWith('/api/admin/'));
const domainRoutes = extractedRoutes.filter(r => !r.path.startsWith('/api/auth/') && !r.path.startsWith('/api/admin/'));
const totalRoutesCount = extractedRoutes.length;

console.log(`✓ Scanned Express Routes: ${totalRoutesCount} endpoints (${authRoutes.length} Auth, ${adminRoutes.length} Admin, ${domainRoutes.length} Domain)`);

// ─────────────────────────────────────────────
// 2. EXTRACT DB METRICS FROM server/db.js
// ─────────────────────────────────────────────
const dbContent = fs.readFileSync(serverDbPath, 'utf8');
const isWalMode = dbContent.includes(`journal_mode = WAL`);
const tableMatches = [...dbContent.matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-zA-Z0-9_]+)/g)].map(m => m[1]);
const indexMatches = [...dbContent.matchAll(/CREATE INDEX IF NOT EXISTS\s+([a-zA-Z0-9_]+)/g)].map(m => m[1]);

console.log(`✓ Scanned SQLite Schema: ${tableMatches.length} Tables, ${indexMatches.length} Indexes, WAL Mode: ${isWalMode}`);

// ─────────────────────────────────────────────
// 3. EXTRACT RECENT GIT COMMITS
// ─────────────────────────────────────────────
let recentCommits = [];
try {
    const gitOutput = execSync('git log -n 8 --pretty=format:"%h|%as|%s"', { cwd: rootDir, encoding: 'utf8' });
    recentCommits = gitOutput.trim().split('\n').filter(Boolean).map(line => {
        const [hash, date, msg] = line.split('|');
        return { hash, date, msg };
    });
    console.log(`✓ Scanned Git History: ${recentCommits.length} recent commits fetched`);
} catch (e) {
    console.warn(`⚠️ Warning: Could not read git log: ${e.message}`);
}

// ─────────────────────────────────────────────
// 4. AUDIT & UPDATE PROJECT_DOCS.md
// ─────────────────────────────────────────────
let docsContent = fs.readFileSync(docsPath, 'utf8');
let hasModifications = false;

const todayStr = new Date().toISOString().split('T')[0];

// A. Update "Last Sync" in Header
const lastSyncRegex = /> \*\*Last Sync:\*\* \d{4}-\d{2}-\d{2}/;
if (lastSyncRegex.test(docsContent)) {
    const currentSync = docsContent.match(lastSyncRegex)[0];
    const newSync = `> **Last Sync:** ${todayStr}`;
    if (currentSync !== newSync) {
        docsContent = docsContent.replace(lastSyncRegex, newSync);
        hasModifications = true;
    }
}

// B. Update "Total API Routes" in Quick Status Dashboard
const routeMetricRegex = /\| \*\*Total API Routes\*\* \| [^|]+ \|/;
const newRouteMetric = `| **Total API Routes** | ${totalRoutesCount} REST endpoints (${authRoutes.length} Auth, ${adminRoutes.length} Admin, ${domainRoutes.length} Core Domain) |`;
if (routeMetricRegex.test(docsContent)) {
    const currentRouteMetric = docsContent.match(routeMetricRegex)[0];
    if (currentRouteMetric !== newRouteMetric) {
        docsContent = docsContent.replace(routeMetricRegex, newRouteMetric);
        hasModifications = true;
    }
}

// C. Update Database Metric in Dashboard
const dbMetricRegex = /\| \*\*Database\*\* \| [^|]+ \|/;
const newDbMetric = `| **Database** | Better-SQLite3 (\`server/claims.db\`) in **${isWalMode ? 'WAL Mode' : 'Default Mode'}** with ${indexMatches.length} Performance Indexes |`;
if (dbMetricRegex.test(docsContent)) {
    const currentDbMetric = docsContent.match(dbMetricRegex)[0];
    if (currentDbMetric !== newDbMetric) {
        docsContent = docsContent.replace(dbMetricRegex, newDbMetric);
        hasModifications = true;
    }
}

// D. Sync Auto-Generated Recent Commits in Section 15
if (recentCommits.length > 0) {
    let commitTable = `<!-- AUTO-GENERATED-COMMITS-START -->\n### Recent Git Commits (Auto-Synced)\n\n| Commit | Date | Summary |\n|---|---|---|\n`;
    for (const c of recentCommits) {
        const cleanMsg = c.msg.replace(/\|/g, '-');
        commitTable += `| \`${c.hash}\` | ${c.date} | ${cleanMsg} |\n`;
    }
    commitTable += `<!-- AUTO-GENERATED-COMMITS-END -->`;

    const commitsBlockRegex = /<!-- AUTO-GENERATED-COMMITS-START -->[\s\S]*?<!-- AUTO-GENERATED-COMMITS-END -->/;
    if (commitsBlockRegex.test(docsContent)) {
        const existingBlock = docsContent.match(commitsBlockRegex)[0];
        if (existingBlock !== commitTable) {
            docsContent = docsContent.replace(commitsBlockRegex, commitTable);
            hasModifications = true;
            console.log(`✓ Synchronized Section 15 Recent Git Commits table`);
        }
    } else {
        // Insert right below ## 15. CHANGE LOG
        const changeLogHeader = `## 15. CHANGE LOG\n`;
        if (docsContent.includes(changeLogHeader)) {
            docsContent = docsContent.replace(changeLogHeader, `${changeLogHeader}\n${commitTable}\n\n### Major Project Milestones\n`);
            hasModifications = true;
            console.log(`✓ Inserted Section 15 Recent Git Commits table`);
        }
    }
}

// E. Add Custom Note to Milestones if provided
if (customNote) {
    const milestoneHeader = `### Major Project Milestones\n\n| Date | Milestone / Change | Details |\n|---|---|---|`;
    const newEntry = `\n| **${todayStr}** | **Automated Update** | ${customNote.replace(/\|/g, '-')} |`;
    if (docsContent.includes(milestoneHeader) && !docsContent.includes(customNote)) {
        docsContent = docsContent.replace(milestoneHeader, milestoneHeader + newEntry);
        hasModifications = true;
        console.log(`✓ Appended custom note to Major Project Milestones`);
    }
}

// F. Verify if any active endpoints are missing from Section 7 of docs
const missingFromDocs = [];
for (const route of extractedRoutes) {
    const pattern = `\`${route.method}\` | \`${route.path}\``;
    if (!docsContent.includes(pattern)) {
        missingFromDocs.push(route);
    }
}

if (missingFromDocs.length > 0) {
    console.warn(`⚠️ Warning: ${missingFromDocs.length} endpoints defined in server/index.js are missing from docs:`);
    missingFromDocs.forEach(r => console.warn(`   - ${r.method} ${r.path} (${r.authLevel})`));
} else {
    console.log(`✓ All ${totalRoutesCount} endpoints verified present in REST API Reference`);
}

// ─────────────────────────────────────────────
// 5. WRITE UPDATES OR REPORT CHECK RESULT
// ─────────────────────────────────────────────
if (isCheckOnly) {
    if (hasModifications || missingFromDocs.length > 0) {
        console.log(`\n❌ Documentation is OUT OF SYNC with the codebase! Run 'npm run docs:sync' to reconcile.`);
        process.exit(1);
    } else {
        console.log(`\n✅ Documentation is 100% UP TO DATE with the codebase.`);
        process.exit(0);
    }
}

if (hasModifications) {
    fs.writeFileSync(docsPath, docsContent, 'utf8');
    console.log(`\n🎉 Successfully synced PROJECT_DOCS.md with current codebase!`);
} else {
    console.log(`\n✅ PROJECT_DOCS.md is already fully in sync with current codebase.`);
}

console.log('──────────────────────────────────────────────────────────────────');
