import type {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class DesoIdentityApi implements ICredentialType {
  name = 'desoIdentityApi';

  displayName = 'DeSo Identity API';

  icon = 'file:logo.svg' as const;

  documentationUrl = 'https://csmediapro.github.io/n8n-nodes-deso/';

  test = {
    request: {
      baseURL: '={{$credentials.nodeUri}}',
      url: '/api/v0/get-exchange-rate',
    },
  };

  properties: INodeProperties[] = [
    {
      displayName: 'Credential Payload',
      name: 'credentialPayload',
      required: true,
      type: 'string',
      typeOptions: {
        password: true,
        rows: 6,
      },
      default: '',
      description:
        'Paste the full JSON credential payload from the DeSo Auth Page.' +
        ' (<a href="https://csmediapro.github.io/n8n-nodes-deso/auth/" target="_blank">open auth page</a>)',
    },
    {
      displayName: 'Node URL',
      name: 'nodeUri',
      type: 'string',
      default: 'https://node.deso.org',
      description: 'DeSo node used for profile lookup, image upload, and post publishing',
    },
    {
      displayName: 'Spending Limit (Nanos)',
      name: 'spendingLimitNanos',
      type: 'number',
      default: 10000000,
      description: 'Maximum DESO spend authorized for this credential, in nanos. 10000000 = 0.01 DESO.',
    },
  ];
}
