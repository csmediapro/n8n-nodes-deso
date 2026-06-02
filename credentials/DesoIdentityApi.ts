import type {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class DesoIdentityApi implements ICredentialType {
  name = 'desoIdentityApi';

  displayName = 'DeSo Identity API';

  documentationUrl = 'https://github.com/csmediapro/n8n-nodes-deso';

  properties: INodeProperties[] = [
    {
      displayName: 'Open the DeSo Auth Page in your browser, connect your wallet, then paste the credential payload here.',
      name: 'notice',
      type: 'notice',
      default: '',
    },
    {
      displayName: 'Auth Page URL',
      name: 'authPageUrl',
      type: 'string',
      default: 'https://csmediapro.github.io/n8n-nodes-deso/auth/',
      description: 'Open this URL in a browser with the DeSo Identity extension',
    },
    {
      displayName: 'Credential Payload',
      name: 'credentialPayload',
      type: 'string',
      typeOptions: {
        rows: 8,
      },
      default: '',
      description: 'Paste the full credential payload from the DeSo Auth Page',
    },
    {
      displayName: 'Public Key',
      name: 'publicKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'Your DeSo public key',
    },
    {
      displayName: 'JWT',
      name: 'jwt',
      type: 'string',
      typeOptions: {
        password: true,
        alwaysOpenEditWindow: true,
      },
      default: '',
      description: 'JWT token from DeSo Identity',
    },
    {
      displayName: 'Derived Key',
      name: 'derivedKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'Derived key for signing transactions',
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
      description: 'DeSo Identity authorization data',
    },
    {
      displayName: 'Node URL',
      name: 'nodeUri',
      type: 'string',
      default: 'https://node.deso.org',
      description: 'DeSo blockchain node to connect to',
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
      description: 'Your DeSo username',
    },
  ];
}
