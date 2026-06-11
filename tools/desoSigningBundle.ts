import { sha256 } from '@noble/hashes/sha256';
import { sign as secp256k1Sign, utils as secp256k1Utils } from '@noble/secp256k1';

export async function signTransactionHex(txHex: string, derivedSeedHex: string): Promise<string> {
	const transactionBytes = hexToBytes(txHex);
	const signaturePlaceholderIndex = findUnsignedSignaturePlaceholder(transactionBytes);
	const transactionHashHex = bytesToHex(sha256(sha256(transactionBytes)));
	const privateKey = hexToBytes(derivedSeedHex);
	const [signatureBytes, recoveryParam] = await signHash(transactionHashHex, privateKey);

	signatureBytes[0] += 1 + recoveryParam;

	const signatureLength = uvarint64ToBytes(signatureBytes.length);
	const signedTransactionBytes = concatBytes(
		transactionBytes.slice(0, signaturePlaceholderIndex),
		signatureLength,
		signatureBytes,
		transactionBytes.slice(signaturePlaceholderIndex + 1),
	);

	return bytesToHex(signedTransactionBytes);
}

export async function signJwt(
	derivedSeedHex: string,
	derivedPublicKeyBase58Check: string,
): Promise<string> {
	const header = JSON.stringify({ alg: 'ES256', typ: 'JWT' });
	const issuedAt = Math.floor(Date.now() / 1000);
	const payload = JSON.stringify({
		derivedPublicKeyBase58Check,
		iat: issuedAt,
		exp: issuedAt + 30 * 60,
	});
	const unsignedJwt = `${base64Url(header)}.${base64Url(payload)}`;
	const hashHex = bytesToHex(sha256(new TextEncoder().encode(unsignedJwt)));
	const [signatureBytes] = await signHash(hashHex, hexToBytes(derivedSeedHex));

	return `${unsignedJwt}.${derToJose(signatureBytes)}`;
}

async function signHash(hashHex: string, privateKey: Uint8Array): Promise<[Uint8Array, number]> {
	return secp256k1Sign(hashHex, privateKey, {
		canonical: true,
		der: true,
		extraEntropy: true,
		recovered: true,
	}) as Promise<[Uint8Array, number]>;
}

function findUnsignedSignaturePlaceholder(transactionBytes: Uint8Array): number {
	for (let i = transactionBytes.length - 1; i >= 0; i--) {
		if (transactionBytes[i] === 0) {
			return i;
		}
	}

	throw new Error('Unsigned DeSo transaction did not contain an empty signature placeholder.');
}

function uvarint64ToBytes(uint: number): Uint8Array {
	const result: number[] = [];
	let value = BigInt(uint);

	while (value >= 0x80n) {
		result.push(Number((value & 0xffn) | 0x80n));
		value >>= 7n;
	}

	result.push(Number(value));
	return Uint8Array.from(result);
}

function derToJose(signature: Uint8Array): string {
	let offset = 0;
	if (signature[offset++] !== 0x30) {
		throw new Error('Invalid DER signature.');
	}

	const sequenceLength = signature[offset++];
	if (sequenceLength + 2 !== signature.length) {
		throw new Error('Invalid DER signature length.');
	}

	const r = readDerInteger(signature, () => offset, (value) => { offset = value; });
	const s = readDerInteger(signature, () => offset, (value) => { offset = value; });

	return base64UrlBytes(concatBytes(leftPad32(r), leftPad32(s)));
}

function readDerInteger(
	signature: Uint8Array,
	getOffset: () => number,
	setOffset: (value: number) => void,
): Uint8Array {
	let offset = getOffset();
	if (signature[offset++] !== 0x02) {
		throw new Error('Invalid DER integer marker.');
	}

	const length = signature[offset++];
	const value = signature.slice(offset, offset + length);
	setOffset(offset + length);

	return trimLeadingZero(value);
}

function trimLeadingZero(value: Uint8Array): Uint8Array {
	let offset = 0;
	while (offset < value.length - 1 && value[offset] === 0) {
		offset++;
	}
	return value.slice(offset);
}

function leftPad32(value: Uint8Array): Uint8Array {
	if (value.length > 32) {
		throw new Error('Invalid ECDSA signature component length.');
	}

	const result = new Uint8Array(32);
	result.set(value, 32 - value.length);
	return result;
}

function base64Url(value: string): string {
	return base64UrlBytes(new TextEncoder().encode(value));
}

function base64UrlBytes(value: Uint8Array): string {
	return Buffer.from(value)
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
}

function hexToBytes(value: string): Uint8Array {
	return secp256k1Utils.hexToBytes(value);
}

function bytesToHex(value: Uint8Array): string {
	return secp256k1Utils.bytesToHex(value);
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
	const length = arrays.reduce((total, value) => total + value.length, 0);
	const result = new Uint8Array(length);
	let offset = 0;

	for (const array of arrays) {
		result.set(array, offset);
		offset += array.length;
	}

	return result;
}
