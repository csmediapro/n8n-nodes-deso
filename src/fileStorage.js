/**
 * File-based storage provider for deso-protocol identity in Node.js.
 *
 * deso-protocol's identity module stores auth state in a storageProvider
 * (defaults to localStorage). This provider uses JSON files on disk,
 * which lets us:
 *
 *   1. Run identity.login() once in a browser
 *   2. Export the localStorage values
 *   3. Import them here for headless Node.js usage
 */

const fs = require('fs');
const path = require('path');

const STORAGE_DIR = path.join(__dirname, '..', '.deso-storage');

class FileStorageProvider {
  constructor() {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
  }

  _filePath(key) {
    return path.join(STORAGE_DIR, `${key}.json`);
  }

  async getItem(key) {
    try {
      const data = fs.readFileSync(this._filePath(key), 'utf-8');
      return data;
    } catch {
      return null;
    }
  }

  async setItem(key, value) {
    fs.writeFileSync(this._filePath(key), value, 'utf-8');
  }

  async removeItem(key) {
    try {
      fs.unlinkSync(this._filePath(key));
    } catch {
      // ignore
    }
  }
}

module.exports = { FileStorageProvider, STORAGE_DIR };
