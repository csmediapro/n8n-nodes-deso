/**
 * Non-mutating verification for an imported DeSo Identity session.
 *
 * This checks that deso-protocol can read the file-backed Identity storage,
 * mint a JWT, and fetch public profile data. It does not submit transactions.
 */

global.window ??= {
  btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
  atob: (value) => Buffer.from(value, 'base64').toString('binary'),
};

const { configure, identity } = require('deso-protocol');
const { FileStorageProvider } = require('../src/fileStorage');

const storageProvider = new FileStorageProvider();

configure({ nodeURI: 'https://node.deso.org' });
identity.configure({ nodeURI: 'https://node.deso.org', storageProvider });

async function verifySession() {
  const publicKey = await storageProvider.getItem('desoActivePublicKey');
  const usersRaw = await storageProvider.getItem('desoIdentityUsers');

  if (!publicKey || !usersRaw) {
    throw new Error('No imported DeSo Identity session found. Run scripts/import-session.js first.');
  }

  const users = JSON.parse(usersRaw);
  const primaryDerivedKey = users[publicKey]?.primaryDerivedKey;
  const jwt = await identity.jwt();

  const profileRes = await fetch('https://node.deso.org/api/v0/get-users-stateless', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ PublicKeysBase58Check: [publicKey] }),
  });
  const profile = await profileRes.json();
  const entry = profile.UserList?.[0];

  console.log(JSON.stringify({
    publicKeyPrefix: `${publicKey.slice(0, 12)}...`,
    jwtObtained: Boolean(jwt),
    jwtPrefix: jwt ? `${jwt.slice(0, 16)}...` : null,
    derivedPublicKeyPrefix: primaryDerivedKey?.derivedPublicKeyBase58Check
      ? `${primaryDerivedKey.derivedPublicKeyBase58Check.slice(0, 12)}...`
      : null,
    hasDerivedSeedHex: Boolean(primaryDerivedKey?.derivedSeedHex),
    hasMessagingPrivateKey: Boolean(primaryDerivedKey?.messagingPrivateKey),
    spendingLimits: primaryDerivedKey?.transactionSpendingLimits?.TransactionCountLimitMap || null,
    username: entry?.ProfileEntryResponse?.Username || null,
    profileFound: Boolean(entry),
  }, null, 2));
}

verifySession().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
