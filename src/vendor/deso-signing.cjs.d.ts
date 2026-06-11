export function signTransactionHex(txHex: string, derivedSeedHex: string): Promise<string>;

export function signJwt(
	derivedSeedHex: string,
	derivedPublicKeyBase58Check: string,
): Promise<string>;
