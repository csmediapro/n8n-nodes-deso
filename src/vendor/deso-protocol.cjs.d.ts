interface StorageProvider {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

interface SpendingLimitOptions {
  GlobalDESOLimit: number;
  TransactionCountLimitMap: {
    SUBMIT_POST: 'UNLIMITED';
  };
}

export function buildProfilePictureUrl(publicKey: string, options: { nodeURI: string }): string;

export function configure(options: {
  nodeURI: string;
  spendingLimitOptions: SpendingLimitOptions;
}): void;

export function getSingleProfile(
  params: { PublicKeyBase58Check: string } | { Username: string },
  options: { nodeURI: string },
): Promise<{
  Profile?: {
    Username?: string;
    PublicKeyBase58Check: string;
    Description?: string;
    IsVerified?: boolean;
    IsHidden?: boolean;
    DESOBalanceNanos?: number;
    CoinPriceDeSoNanos?: number;
    ExtraData?: Record<string, string | undefined>;
  };
}>;

export const identity: {
  configure(options: {
    nodeURI: string;
    storageProvider: StorageProvider;
    spendingLimitOptions: SpendingLimitOptions;
  }): void;
  jwt(): Promise<string | undefined>;
};

export function submitPost(params: {
  UpdaterPublicKeyBase58Check: string;
  BodyObj: {
    Body: string;
    ImageURLs: string[];
    VideoURLs: string[];
  };
  MinFeeRateNanosPerKB: number;
}): Promise<{
  submittedTransactionResponse?: unknown;
  constructedTransactionResponse?: unknown;
}>;
