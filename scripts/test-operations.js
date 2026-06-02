/**
 * Local validation for the same helpers used by the n8n node.
 *
 * Default: get the selected credential profile only.
 * Public post test: node scripts/test-operations.js --post
 * Public image post test:
 *   DESO_TEST_IMAGE_PATH=/path/to/image.jpg node scripts/test-operations.js --post --image
 */

const fs = require('fs');
const path = require('path');

const storageDir = path.join(__dirname, '..', '.deso-storage');

function readStorageValue(key) {
  return fs.readFileSync(path.join(storageDir, `${key}.json`), 'utf8');
}

function buildCredential() {
  const desoActivePublicKey = readStorageValue('desoActivePublicKey');
  const desoIdentityUsers = readStorageValue('desoIdentityUsers');
  const users = JSON.parse(desoIdentityUsers);
  const primaryDerivedKey = users[desoActivePublicKey]?.primaryDerivedKey || {};
  const profileUsername = process.env.DESO_PROFILE_USERNAME || '';

  return {
    nodeUri: 'https://node.deso.org',
    publicKey: desoActivePublicKey,
    jwt: primaryDerivedKey.jwt || '',
    derivedKey: primaryDerivedKey.derivedPublicKeyBase58Check || '',
    identityStorageJson: JSON.stringify({
      desoActivePublicKey,
      desoIdentityUsers,
      desoLoginKeyPair: fs.existsSync(path.join(storageDir, 'desoLoginKeyPair.json'))
        ? readStorageValue('desoLoginKeyPair')
        : '',
    }),
    spendingLimitNanos: 10000000,
    profileUsername,
  };
}

async function main() {
  const { getDesoProfile, postToDeso, uploadImageToDeso } = require('../dist/src/desoOperations');
  const credential = buildCredential();

  console.log('[1/1] Getting selected credential profile...');
  const profile = await getDesoProfile(credential);
  console.log(JSON.stringify(profile, null, 2));

  if (process.argv.includes('--post')) {
    const imageArgIndex = process.argv.indexOf('--image');
    const imagePath = imageArgIndex >= 0 ? process.argv[imageArgIndex + 1] || process.env.DESO_TEST_IMAGE_PATH || '' : '';
    const imageUrls = [];

    if (imageArgIndex >= 0) {
      if (!imagePath) {
        throw new Error('Provide an image path after --image or set DESO_TEST_IMAGE_PATH.');
      }
      const resolvedImagePath = path.resolve(imagePath);
      console.log('\n[image] Uploading image before post...');
      const imageUrl = await uploadImageToDeso(credential, {
        data: fs.readFileSync(resolvedImagePath),
        fileName: path.basename(resolvedImagePath),
        mimeType: guessMimeType(resolvedImagePath),
      });
      imageUrls.push(imageUrl);
      console.log(JSON.stringify({ imageUrl }, null, 2));
    }

    const body = `Testing n8n-nodes-deso helper operation path.
This is a controlled public test post from scripts/test-operations.js. ${new Date().toISOString()}`;

    console.log('\n[post] Submitting controlled public test post...');
    const result = await postToDeso(credential, { body, imageUrls });
    console.log(JSON.stringify(result, null, 2));
  }
}

function guessMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
