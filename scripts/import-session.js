/**
 * Import a DeSo Identity session from browser localStorage into
 * the file-based storage provider for headless Node.js usage.
 *
 * Usage:
 *   1. Open a browser page that uses deso-protocol and log in via DeSo Identity
 *   2. In browser console, generate the JSON string:
 *      JSON.stringify({
 *        desoActivePublicKey: localStorage.getItem('desoActivePublicKey'),
 *        desoIdentityUsers: localStorage.getItem('desoIdentityUsers'),
 *        desoLoginKeyPair: localStorage.getItem('desoLoginKeyPair'),
 *      })
 *   3. Run this script: node scripts/import-session.js
 *   4. Provide the JSON string when prompted
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const STORAGE_DIR = path.join(__dirname, '..', '.deso-storage');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('=== Import DeSo Identity Session ===\n');
console.log('Provide the JSON from the browser console (end with an empty line):\n');

let input = '';

rl.on('line', (line) => {
  input += line;
  // When we get a closing brace, try to parse
  if (input.includes('}')) {
    try {
      const data = JSON.parse(input);
      
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }

      if (data.desoActivePublicKey) {
        fs.writeFileSync(
          path.join(STORAGE_DIR, 'desoActivePublicKey.json'),
          data.desoActivePublicKey,
          'utf-8'
        );
        console.log(`  ✅ Active Public Key: ${data.desoActivePublicKey.slice(0, 12)}...`);
      }

      if (data.desoIdentityUsers) {
        fs.writeFileSync(
          path.join(STORAGE_DIR, 'desoIdentityUsers.json'),
          data.desoIdentityUsers,
          'utf-8'
        );
        console.log('  ✅ Identity users imported');
      }

      if (data.desoLoginKeyPair) {
        fs.writeFileSync(
          path.join(STORAGE_DIR, 'desoLoginKeyPair.json'),
          data.desoLoginKeyPair,
          'utf-8'
        );
        console.log('  ✅ Login key pair imported');
      }

      console.log('\nSession imported! You can now run: node scripts/test-post.js');
    } catch (e) {
      console.error('Failed to parse JSON:', e.message);
    }
    rl.close();
    return;
  }
});
