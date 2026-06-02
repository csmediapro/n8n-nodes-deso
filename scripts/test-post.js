/**
 * Local test script for DeSo posting via deso-protocol in Node.js.
 *
 * Strategy:
 *   1. Use a file-based storage provider so deso-protocol identity
 *      persists state to disk instead of requiring localStorage (browser).
 *   2. identity.login() still needs a browser popup — it opens the
 *      DeSo Identity window. In a headless environment, this won't work.
 *   3. BUT: if you have a prior DeSo Identity browser session,
 *      you can export the localStorage values and import
 *      them into the file storage provider.
 *
 * Usage:
 *   node scripts/test-post.js
 *
 * First-time setup (one-time, in browser):
 *   1. Open a browser page that uses deso-protocol
 *   2. Log in via DeSo Identity
 *   3. In browser console, generate the JSON string:
 *      JSON.stringify({
 *        desoActivePublicKey: localStorage.getItem('desoActivePublicKey'),
 *        desoIdentityUsers: localStorage.getItem('desoIdentityUsers'),
 *        desoLoginKeyPair: localStorage.getItem('desoLoginKeyPair'),
 *      })
 *   4. Provide the JSON to scripts/import-session.js
 *
 * After importing, identity will find the stored keys and
 * submitPost (and other operations) will work without a browser.
 */

const { configure, identity, submitPost } = require('deso-protocol');
const { FileStorageProvider } = require('../src/fileStorage');

global.window ??= {
  btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
  atob: (value) => Buffer.from(value, 'base64').toString('binary'),
};

// -- Config --
const storageProvider = new FileStorageProvider();

configure({
  nodeURI: 'https://node.deso.org',
  spendingLimitOptions: {
    GlobalDESOLimit: 10000000,
    TransactionCountLimitMap: {
      SUBMIT_POST: 'UNLIMITED',
      FOLLOW: 'UNLIMITED',
    },
  },
});

identity.configure({
  nodeURI: 'https://node.deso.org',
  storageProvider,
  spendingLimitOptions: {
    GlobalDESOLimit: 10000000,
    TransactionCountLimitMap: {
      SUBMIT_POST: 'UNLIMITED',
      FOLLOW: 'UNLIMITED',
    },
  },
});

async function testPost() {
  console.log('=== DeSo Post Test (Node.js) ===\n');

  // Check if we have a stored session
  const activeKey = await storageProvider.getItem('desoActivePublicKey');
  const users = await storageProvider.getItem('desoIdentityUsers');

  if (!activeKey || !users) {
    console.log('No stored DeSo session found.');
    console.log('');
    console.log('First-time setup required:');
    console.log('  1. Log in with DeSo Identity in a browser');
    console.log('  2. Export localStorage values from browser console');
    console.log('  3. Run: node scripts/import-session.js');
    console.log('');
    console.log('See comments in this file for detailed instructions.');
    return;
  }

  const publicKey = activeKey;
  console.log('[1/2] Using stored session');
  console.log('  Public Key:', publicKey.slice(0, 12) + '...');

  // Verify identity can find the user
  try {
    const jwt = await identity.jwt();
    console.log('  JWT: obtained (' + jwt.slice(0, 20) + '...)\n');
  } catch (err) {
    console.error('  Failed to get JWT:', err.message);
    console.error('  Stored session may be expired or invalid.');
    return;
  }

  // Submit a test post
  const postText = `Testing n8n-nodes-deso post via deso-protocol in Node.js.
This is a test post from the scaffolded node. ${new Date().toISOString()}`;

  console.log('[2/2] Submitting post to DeSo...');
  console.log('  Body:', postText.slice(0, 80) + '...\n');

  try {
    const response = await submitPost({
      UpdaterPublicKeyBase58Check: publicKey,
      BodyObj: {
        Body: postText,
        ImageURLs: [],
        VideoURLs: [],
      },
      MinFeeRateNanosPerKB: 1000,
    });

    console.log('Response:');
    console.log(JSON.stringify(response, null, 2));

    // Extract hashes
    const txnHash =
      response?.submittedTransactionResponse?.TxnHashHex ||
      response?.constructedTransactionResponse?.TxnHashHex;
    const postHash =
      response?.submittedTransactionResponse?.PostHashHex ||
      response?.constructedTransactionResponse?.PostHashHex;

    if (postHash) {
      console.log('\n✅ Post created!');
      console.log('   Post URL: https://deso.org/posts/' + postHash);
      console.log('   Txn Hash: ' + txnHash);
    } else {
      console.log('\n❌ No post hash in response. Check response above.');
    }
  } catch (err) {
    console.error('submitPost failed:', err.message);
    if (err.response) {
      console.error('Response body:', JSON.stringify(err.response));
    }
  }
}

testPost().catch(console.error);
