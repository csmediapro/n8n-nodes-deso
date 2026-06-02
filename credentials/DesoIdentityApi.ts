import type {
  ICredentialType,
  INodeProperties,
  ICredentialDataDecryptedObject,
  IDataObject,
} from 'n8n-workflow';

export class DesoIdentityApi implements ICredentialType {
  name = 'desoIdentityApi';

  displayName = 'DeSo Identity API';

  documentationUrl = 'https://github.com/csmediapro/n8n-nodes-deso';

  properties: INodeProperties[] = [
    {
      displayName: 'Node URL',
      name: 'nodeUri',
      type: 'string',
      default: 'https://node.deso.org',
      description: 'DeSo blockchain node to connect to',
    },
    {
      displayName: 'Public Key',
      name: 'publicKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'Your DeSo public key (set automatically via Connect DeSo Wallet)',
    },
    {
      displayName: 'JWT',
      name: 'jwt',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'JWT token from DeSo Identity (set automatically via Connect DeSo Wallet)',
    },
    {
      displayName: 'Derived Key',
      name: 'derivedKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'Derived key for signing transactions (set automatically via Connect DeSo Wallet)',
    },
    {
      displayName: 'DeSo Identity Storage',
      name: 'identityStorageJson',
      type: 'string',
      typeOptions: {
        password: true,
        rows: 4,
      },
      default: '',
      description: 'Encrypted DeSo Identity authorization data populated by Connect DeSo Wallet.',
    },
    {
      displayName: 'Spending Limit (Nanos)',
      name: 'spendingLimitNanos',
      type: 'number',
      default: 10000000,
      description: 'Maximum nanos authorized per transaction (10000000 = 0.01 DESO)',
    },
    {
      displayName: 'Profile Username',
      name: 'profileUsername',
      type: 'string',
      default: '',
      description: 'Your DeSo username (set automatically after connecting wallet)',
    },
  ];

  /**
   * Called when user clicks "Connect DeSo Wallet" in the credential UI.
   * Returns auth metadata for the self-hosted auth page that handles the
   * DeSo Identity popup flow and posts the result back.
   *
   * The auth page is served from the node's static auth/ directory
   * via a route registered on the n8n Express app.
   */
  async preAuthentication(this: any, _credentials: ICredentialDataDecryptedObject): Promise<IDataObject> {
    // Return the auth page URL relative to this n8n instance.
    // The route /rest/deso-auth/index.html is registered by the node
    // when it initializes.
    // TODO: Register the route and verify this URL resolves correctly.
    return {
      authUrl: '/rest/deso-auth/index.html',
    };
  }
}
