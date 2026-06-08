import {
  buildProfilePictureUrl,
  configure,
  getSingleProfile,
  identity,
  submitPost,
} from './vendor/deso-protocol.cjs';

export const DEFAULT_NODE_URI = 'https://node.deso.org';

const DEFAULT_MIN_FEE_RATE_NANOS_PER_KB = 1000;

export interface DesoCredentials {
  /** Full JSON payload from the DeSo Auth Page — paste into this one field and it populates the rest */
  credentialPayload?: string;
  nodeUri?: string;
  publicKey?: string;
  jwt?: string;
  derivedKey?: string;
  identityStorageJson?: string;
  spendingLimitNanos?: number;
  profileUsername?: string;
}

/**
 * Resolve credential data from either the `credentialPayload` field (full JSON blob
 * pasted from the DeSo Auth Page) or from individual fields. If `credentialPayload`
 * is present and valid, it takes precedence.
 */
export function resolveCredentials(raw: DesoCredentials): DesoCredentials {
  if (raw.credentialPayload) {
    try {
      const parsed = JSON.parse(raw.credentialPayload) as DesoCredentials & DesoAuthPayload;
      // Merge parsed values over raw ones, preserving nodeUri and spendingLimit
      return {
        ...raw,
        publicKey: parsed.publicKey || raw.publicKey,
        jwt: parsed.jwt || raw.jwt,
        derivedKey: parsed.derivedKey || raw.derivedKey,
        identityStorageJson: parsed.identityStorageJson || raw.identityStorageJson,
        profileUsername: parsed.profileUsername || raw.profileUsername,
      };
    } catch {
      // If the payload is invalid JSON, fall through to individual fields
    }
  }
  return raw;
}

export interface DesoIdentityStorageBundle {
  desoActivePublicKey: string;
  desoIdentityUsers: string;
  desoLoginKeyPair?: string;
}

interface DesoAuthPayload {
  publicKey?: string;
  jwt?: string;
  derivedKey?: string;
  identityStorageJson?: string;
  profileUsername?: string;
}

interface StorageProvider {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface PostToDesoInput {
  body: string;
  videoUrl?: string;
  imageUrls?: string[];
}

export interface GetDesoProfileInput {
  user?: string;
}

export function desoToNanos(desoAmount: number): number {
  return Math.ceil(desoAmount * 1e9);
}

export function nanosToDeso(nanos: number): number {
  return nanos / 1e9;
}

export function parseIdentityStorageBundle(value?: string): DesoIdentityStorageBundle {
  if (!value) {
    throw new Error('DeSo Identity storage is missing. Reconnect the DeSo credential.');
  }

  const parsed = JSON.parse(value) as Partial<DesoIdentityStorageBundle & DesoAuthPayload>;
  if (parsed.identityStorageJson) {
    return parseIdentityStorageBundle(parsed.identityStorageJson);
  }

  if (!parsed.desoActivePublicKey || !parsed.desoIdentityUsers) {
    throw new Error('DeSo Identity storage is missing the active public key or identity users.');
  }

  return {
    desoActivePublicKey: parsed.desoActivePublicKey,
    desoIdentityUsers: parsed.desoIdentityUsers,
    desoLoginKeyPair: parsed.desoLoginKeyPair || undefined,
  };
}

export function getCredentialPublicKey(raw: DesoCredentials): string {
  const credentials = resolveCredentials(raw);
  const storage = parseIdentityStorageBundle(credentials.identityStorageJson);
  const publicKey = credentials.publicKey || storage.desoActivePublicKey;

  if (!publicKey) {
    throw new Error('DeSo public key is missing. Reconnect the DeSo credential.');
  }

  return publicKey;
}

export async function uploadImageToDeso(
  raw: DesoCredentials,
  image: { data: Buffer; fileName: string; mimeType?: string },
): Promise<string> {
  const credentials = resolveCredentials(raw);
  const publicKey = getCredentialPublicKey(credentials);
  const nodeURI = credentials.nodeUri || DEFAULT_NODE_URI;

  configureForCredential(credentials);

  const jwt = await identity.jwt();
  if (!jwt) {
    throw new Error('Failed to get DeSo JWT for image upload. Reconnect the DeSo credential.');
  }

  const formData = new FormData();
  const blob = new Blob([image.data], { type: image.mimeType || 'application/octet-stream' });
  formData.append('file', blob, image.fileName);
  formData.append('UserPublicKeyBase58Check', publicKey);
  formData.append('JWT', jwt);

  const response = await fetch(`${trimTrailingSlash(nodeURI)}/api/v0/upload-image`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    body: formData,
  });

  const responseBody = await response.json() as { ImageURL?: string; error?: string };
  if (!response.ok || !responseBody.ImageURL) {
    throw new Error(`Failed to upload image to DeSo: ${responseBody.error || response.statusText}`);
  }

  return responseBody.ImageURL;
}

export async function postToDeso(raw: DesoCredentials, input: PostToDesoInput): Promise<Record<string, unknown>> {
  const body = input.body.trim();
  if (!body) {
    throw new Error('Post body cannot be empty.');
  }

  const credentials = resolveCredentials(raw);
  const nodeURI = credentials.nodeUri || DEFAULT_NODE_URI;
  const publicKey = getCredentialPublicKey(credentials);

  configureForCredential(credentials);

  const response = await submitPost({
    UpdaterPublicKeyBase58Check: publicKey,
    BodyObj: {
      Body: body,
      ImageURLs: input.imageUrls?.filter(Boolean) || [],
      VideoURLs: input.videoUrl ? [input.videoUrl] : [],
    },
    MinFeeRateNanosPerKB: DEFAULT_MIN_FEE_RATE_NANOS_PER_KB,
  });

  const submitted = asRecord(response.submittedTransactionResponse);
  const constructed = asRecord(response.constructedTransactionResponse);
  const postEntry = asRecord(submitted?.PostEntryResponse);
  const profileEntry = asRecord(postEntry?.ProfileEntryResponse);
  const postHash = postEntry?.PostHashHex || submitted?.PostHashHex || constructed?.PostHashHex;
  const txnHash = submitted?.TxnHashHex || submitted?.TransactionHashHex || constructed?.TxnHashHex;

  return {
    postedAs: credentials.profileUsername || profileEntry?.Username || null,
    publicKey,
    postHash,
    txnHash,
    transactionIdBase58Check: submitted?.TransactionIDBase58Check || null,
    postUrl: postHash ? `https://deso.org/posts/${postHash}` : null,
    inMempool: postEntry?.InMempool ?? null,
    confirmationBlockHeight: postEntry?.ConfirmationBlockHeight ?? null,
    imageUrls: input.imageUrls?.filter(Boolean) || [],
    nodeUri: nodeURI,
  };
}

export async function getDesoProfile(
  raw: DesoCredentials,
  input: GetDesoProfileInput = {},
): Promise<Record<string, unknown>> {
  const credentials = resolveCredentials(raw);
  const nodeURI = credentials.nodeUri || DEFAULT_NODE_URI;
  const target = (input.user || '').trim();
  const credentialPublicKey = getCredentialPublicKey(credentials);
  const params = target
    ? profileLookupParams(target)
    : { PublicKeyBase58Check: credentialPublicKey };

  configureForCredential(credentials);

  const response = await getSingleProfile(params, { nodeURI });
  const profile = response.Profile;

  if (!profile) {
    throw new Error(`No DeSo profile found for ${target || credentialPublicKey}.`);
  }

  return {
    username: profile.Username || null,
    publicKey: profile.PublicKeyBase58Check,
    description: profile.Description || '',
    isVerified: profile.IsVerified,
    isHidden: profile.IsHidden,
    desoBalanceNanos: profile.DESOBalanceNanos,
    desoBalance: typeof profile.DESOBalanceNanos === 'number' ? nanosToDeso(profile.DESOBalanceNanos) : null,
    coinPriceDesoNanos: profile.CoinPriceDeSoNanos,
    profilePictureUrl: buildProfilePictureUrl(profile.PublicKeyBase58Check, { nodeURI }),
    websiteUrl: profile.ExtraData?.WebsiteURL || null,
    twitterUrl: profile.ExtraData?.TwitterURL || null,
    displayName: profile.ExtraData?.DisplayName || profile.Username || null,
    selectedCredentialPublicKey: credentialPublicKey,
    selectedCredentialUsername: credentials.profileUsername || null,
  };
}

export function configureForCredential(raw: DesoCredentials): void {
  const credentials = resolveCredentials(raw);
  installBrowserBase64Shim();

  const nodeURI = credentials.nodeUri || DEFAULT_NODE_URI;
  const storage = parseIdentityStorageBundle(credentials.identityStorageJson);
  const storageProvider = new IdentityStorageProvider(storage);

  const spendingLimitOptions = {
    GlobalDESOLimit: credentials.spendingLimitNanos ?? 10000000,
    TransactionCountLimitMap: {
      SUBMIT_POST: 'UNLIMITED' as const,
    },
  };

  configure({ nodeURI, spendingLimitOptions });
  identity.configure({ nodeURI, storageProvider, spendingLimitOptions });
}

function profileLookupParams(user: string): { PublicKeyBase58Check: string } | { Username: string } {
  return user.startsWith('BC1') ? { PublicKeyBase58Check: user } : { Username: user };
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? value as Record<string, unknown> : undefined;
}

interface BrowserShimGlobal {
  window?: {
    btoa?: (value: string) => string;
    atob?: (value: string) => string;
  };
}

function installBrowserBase64Shim(): void {
  const globalWithWindow = Function('return this')() as BrowserShimGlobal;

  globalWithWindow.window ??= {};
  globalWithWindow.window.btoa ??= (value: string) => Buffer.from(value, 'binary').toString('base64');
  globalWithWindow.window.atob ??= (value: string) => Buffer.from(value, 'base64').toString('binary');
}

class IdentityStorageProvider implements StorageProvider {
  private values = new Map<string, string>();

  constructor(bundle: DesoIdentityStorageBundle) {
    this.values.set('desoActivePublicKey', bundle.desoActivePublicKey);
    this.values.set('desoIdentityUsers', bundle.desoIdentityUsers);

    if (bundle.desoLoginKeyPair) {
      this.values.set('desoLoginKeyPair', bundle.desoLoginKeyPair);
    }
  }

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.values.delete(key);
  }

  async clear(): Promise<void> {
    this.values.clear();
  }
}
