import type { IDataObject, IHttpRequestOptions } from 'n8n-workflow';
import { signJwt, signTransactionHex } from './desoSigning';

export const DEFAULT_NODE_URI = 'https://node.deso.org';

const DEFAULT_MIN_FEE_RATE_NANOS_PER_KB = 1000;

export interface DesoCredentials {
	/** Full JSON payload from the DeSo Auth Page. */
	credentialPayload?: string;
	nodeUri?: string;
	publicKey?: string;
	jwt?: string;
	derivedKey?: string;
	identityStorageJson?: string;
	spendingLimitNanos?: number;
	profileUsername?: string;
}

export interface DesoIdentityStorageBundle {
	desoActivePublicKey: string;
	desoIdentityUsers: string;
	desoLoginKeyPair?: string;
}

export interface PostToDesoInput {
	body: string;
	videoUrl?: string;
	imageUrls?: string[];
}

export interface GetDesoProfileInput {
	user?: string;
}

interface PrimaryDerivedKey {
	derivedPublicKeyBase58Check?: string;
	derivedSeedHex?: string;
	jwt?: string;
}

export type HttpRequestHelper = <T = IDataObject>(
	options: IHttpRequestOptions,
) => Promise<T>;

export function desoToNanos(desoAmount: number): number {
	return Math.ceil(desoAmount * 1e9);
}

export function nanosToDeso(nanos: number): number {
	return nanos / 1e9;
}

export function resolveCredentials(raw: DesoCredentials): DesoCredentials {
	if (raw.credentialPayload) {
		try {
			const parsed = JSON.parse(raw.credentialPayload) as DesoCredentials;
			return {
				...raw,
				publicKey: parsed.publicKey || raw.publicKey,
				jwt: parsed.jwt || raw.jwt,
				derivedKey: parsed.derivedKey || raw.derivedKey,
				identityStorageJson: parsed.identityStorageJson || raw.identityStorageJson,
				profileUsername: parsed.profileUsername || raw.profileUsername,
			};
		} catch {
			// If the payload is invalid JSON, fall through to individual fields.
		}
	}
	return raw;
}

export function parseIdentityStorageBundle(value?: string): DesoIdentityStorageBundle {
	if (!value) {
		throw new Error('DeSo Identity storage is missing. Reconnect the DeSo credential.');
	}

	const parsed = JSON.parse(value) as Partial<DesoIdentityStorageBundle & DesoCredentials>;
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

export function getPrimaryDerivedKey(raw: DesoCredentials): Required<PrimaryDerivedKey> {
	const credentials = resolveCredentials(raw);
	const storage = parseIdentityStorageBundle(credentials.identityStorageJson);
	const users = JSON.parse(storage.desoIdentityUsers) as Record<string, { primaryDerivedKey?: PrimaryDerivedKey }>;
	const primaryDerivedKey = users[storage.desoActivePublicKey]?.primaryDerivedKey;
	const derivedPublicKeyBase58Check = primaryDerivedKey?.derivedPublicKeyBase58Check || credentials.derivedKey;

	if (!primaryDerivedKey?.derivedSeedHex || !derivedPublicKeyBase58Check) {
		throw new Error('DeSo derived key signing material is missing. Reconnect the DeSo credential.');
	}

	return {
		derivedSeedHex: primaryDerivedKey.derivedSeedHex,
		derivedPublicKeyBase58Check,
		jwt: primaryDerivedKey.jwt || credentials.jwt || '',
	};
}

export async function uploadImageToDeso(
	httpRequest: HttpRequestHelper,
	raw: DesoCredentials,
	image: { data: Buffer; fileName: string; mimeType?: string },
): Promise<string> {
	const credentials = resolveCredentials(raw);
	const publicKey = getCredentialPublicKey(credentials);
	const nodeURI = credentials.nodeUri || DEFAULT_NODE_URI;
	const derivedKey = getPrimaryDerivedKey(credentials);
	const jwt = await signJwt(derivedKey.derivedSeedHex, derivedKey.derivedPublicKeyBase58Check);

	const formData = new FormData();
	const blob = new Blob([image.data], { type: image.mimeType || 'application/octet-stream' });
	formData.append('file', blob, image.fileName);
	formData.append('UserPublicKeyBase58Check', publicKey);
	formData.append('JWT', jwt);

	const response = await httpRequest<{ ImageURL?: string }>({
		method: 'POST',
		url: `${trimTrailingSlash(nodeURI)}/api/v0/upload-image`,
		headers: {
			Accept: 'application/json',
		},
		body: formData,
		json: true,
	});

	if (!response.ImageURL) {
		throw new Error(`Failed to upload image to DeSo: ${JSON.stringify(response)}`);
	}

	return response.ImageURL;
}

export async function postToDeso(
	httpRequest: HttpRequestHelper,
	raw: DesoCredentials,
	input: PostToDesoInput,
): Promise<Record<string, unknown>> {
	const body = input.body.trim();
	if (!body) {
		throw new Error('Post body cannot be empty.');
	}

	const credentials = resolveCredentials(raw);
	const nodeURI = credentials.nodeUri || DEFAULT_NODE_URI;
	const publicKey = getCredentialPublicKey(credentials);
	const derivedKey = getPrimaryDerivedKey(credentials);
	const imageUrls = input.imageUrls?.filter(Boolean) || [];

	const constructed = await httpRequest<IDataObject>({
		method: 'POST',
		url: `${trimTrailingSlash(nodeURI)}/api/v0/submit-post`,
		body: {
			UpdaterPublicKeyBase58Check: publicKey,
			BodyObj: {
				Body: body,
				ImageURLs: imageUrls,
				VideoURLs: input.videoUrl ? [input.videoUrl] : [],
			},
			PostExtraData: {},
			MinFeeRateNanosPerKB: DEFAULT_MIN_FEE_RATE_NANOS_PER_KB,
		},
		json: true,
	});

	const txHex = constructed.TransactionHex as string | undefined;
	if (!txHex) {
		throw new Error('DeSo post transaction construction failed: no TransactionHex returned.');
	}

	const signedTxHex = await signTransactionHex(txHex, derivedKey.derivedSeedHex);
	const submitted = await httpRequest<IDataObject>({
		method: 'POST',
		url: `${trimTrailingSlash(nodeURI)}/api/v0/submit-transaction`,
		body: {
			TransactionHex: signedTxHex,
		},
		json: true,
	});

	const postEntry = asRecord(submitted.PostEntryResponse) || asRecord(constructed.PostEntryResponse) || constructed;
	const profileEntry = asRecord(postEntry?.ProfileEntryResponse);
	const postHash = postEntry?.PostHashHex || submitted.PostHashHex || constructed.PostHashHex;
	const txnHash = submitted.TxnHashHex || submitted.TransactionHashHex || constructed.TxnHashHex;

	return {
		postedAs: credentials.profileUsername || profileEntry?.Username || null,
		publicKey,
		postHash,
		txnHash,
		transactionIdBase58Check: submitted.TransactionIDBase58Check || null,
		postUrl: postHash ? `https://deso.org/posts/${postHash}` : null,
		inMempool: postEntry?.InMempool ?? null,
		confirmationBlockHeight: postEntry?.ConfirmationBlockHeight ?? null,
		imageUrls,
		nodeUri: nodeURI,
	};
}

export async function getDesoProfile(
	httpRequest: HttpRequestHelper,
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

	const response = await httpRequest<IDataObject>({
		method: 'POST',
		url: `${trimTrailingSlash(nodeURI)}/api/v0/get-single-profile`,
		body: params,
		json: true,
	});
	const profile = response.Profile as IDataObject | undefined;

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
		profilePictureUrl: `${trimTrailingSlash(nodeURI)}/api/v0/get-single-profile-picture/${profile.PublicKeyBase58Check}`,
		websiteUrl: (profile.ExtraData as IDataObject | undefined)?.WebsiteURL || null,
		twitterUrl: (profile.ExtraData as IDataObject | undefined)?.TwitterURL || null,
		displayName: (profile.ExtraData as IDataObject | undefined)?.DisplayName || profile.Username || null,
		selectedCredentialPublicKey: credentialPublicKey,
		selectedCredentialUsername: credentials.profileUsername || null,
	};
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
