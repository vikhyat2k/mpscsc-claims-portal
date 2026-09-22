#!/usr/bin/env node
/**
 * scripts/watch_docs.js
 * ==============================================================================
 * Live documentation daemon for MPSCSC Claims Portal.
 * Watches server and client files and automatically triggers sync_docs.js on changes.
 *
 * Usage:
 *   npm run docs:watch
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const syncScriptPath = path.join(__dirname, 'sync_docs.js');

console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║        MPSCSC Claims Portal — Live Docs Watcher Daemon           ║');
console.log('╚══════════════════════════════════════════════════════════════════╝');
console.log('Watching for code and schema changes...\n');

let debounceTimer = null;
let isRunning = false;

function triggerSync(filename) {
    if (filename && filename.includes('PROJECT_DOCS.md')) {
        return; // Avoid infinite loops on doc modifications
    }

    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
        if (isRunning) return;
        isRunning = true;

        console.log(`\n[${new Date().toLocaleTimeString()}] Change detected in: ${filename || 'codebase'}. Running sync...`);
        const proc = spawn(process.execPath, [syncScriptPath], { stdio: 'inherit', cwd: rootDir });
        proc.on('close', (code) => {
            isRunning = false;
            console.log(`[${new Date().toLocaleTimeString()}] Sync complete (exit code: ${code}). Waiting for changes...\n`);
        });
    }, 2000);
}

// Initial sync on startup
triggerSync('daemon-startup');

// Watch server directory
const serverDir = path.join(rootDir, 'server');
if (fs.existsSync(serverDir)) {
    fs.watch(serverDir, { recursive: true }, (eventType, filename) => {
        if (filename && (filename.endsWith('.js') || filename.endsWith('.json'))) {
            triggerSync(`server/${filename}`);
        }
    });
}

// Watch client src directory
const clientSrcDir = path.join(rootDir, 'client', 'src');
if (fs.existsSync(clientSrcDir)) {
    fs.watch(clientSrcDir, { recursive: true }, (eventType, filename) => {
        if (filename && (filename.endsWith('.jsx') || filename.endsWith('.js') || filename.endsWith('.css'))) {
            triggerSync(`client/src/${filename}`);
        }
    });
}

process.on('SIGINT', () => {
    console.log('\nStopping Docs Watcher Daemon.');
    process.exit(0);
});
