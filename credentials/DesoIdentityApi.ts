import type {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class DesoIdentityApi implements ICredentialType {
  name = 'desoIdentityApi';

  displayName = 'DeSo Identity API';

  documentationUrl = 'https://csmediapro.github.io/n8n-nodes-deso/';

  properties: INodeProperties[] = [
    {
      displayName: 'Credential Payload',
      name: 'credentialPayload',
      required: true,
      type: 'string',
      typeOptions: {
        rows: 6,
      },
      default: '',
      description:
        'Paste the full JSON credential payload from the DeSo Auth Page' +
        ' (<a href="https://csmediapro.github.io/n8n-nodes-deso/auth/" target="_blank">open auth page</a>)',
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
  ];
}
