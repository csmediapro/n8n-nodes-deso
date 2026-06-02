import type {
  INodeType,
  INodeTypeDescription,
  INodeExecutionData,
  IExecuteFunctions,
} from 'n8n-workflow';
import { getDesoProfile, postToDeso, uploadImageToDeso } from '../../src/desoOperations';

export class Deso implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'DeSo',
    name: 'deso',
    icon: 'file:deso.svg',
    group: ['output'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Post to DeSo and get DeSo profiles',
    defaults: {
      name: 'DeSo',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'desoIdentityApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Post',
            value: 'post',
            description: 'Create and publish a post on DeSo',
            action: 'Post to DeSo',
          },
          {
            name: 'Get Profile',
            value: 'getProfile',
            description: 'Get profile information for a DeSo user',
            action: 'Get DeSo profile',
          },
        ],
        default: 'post',
      },

      // -- Post --
      {
        displayName: 'Post Body',
        name: 'postBody',
        type: 'string',
        typeOptions: {
          rows: 4,
        },
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['post'],
          },
        },
        description: 'The text content of your DeSo post',
      },
      {
        displayName: 'Image Source',
        name: 'imageSource',
        type: 'options',
        options: [
          {
            name: 'None',
            value: 'none',
          },
          {
            name: 'Binary Data',
            value: 'binary',
          },
          {
            name: 'Image URL',
            value: 'url',
          },
        ],
        default: 'none',
        displayOptions: {
          show: {
            operation: ['post'],
          },
        },
        description: 'Where to get the image attached to the DeSo post',
      },
      {
        displayName: 'Binary Property',
        name: 'binaryPropertyName',
        type: 'string',
        default: 'data',
        required: true,
        displayOptions: {
          show: {
            operation: ['post'],
            imageSource: ['binary'],
          },
        },
        description: 'Name of the incoming binary property containing the image',
      },
      {
        displayName: 'Image URL',
        name: 'imageUrl',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            operation: ['post'],
            imageSource: ['url'],
          },
        },
        description: 'Existing image URL to attach to the DeSo post',
      },
      {
        displayName: 'Append Image URL to Body',
        name: 'appendImageUrlToBody',
        type: 'boolean',
        default: false,
        displayOptions: {
          show: {
            operation: ['post'],
            imageSource: ['binary', 'url'],
          },
        },
        description: 'Whether to append the final image URL to the post body text',
      },

      // -- Get Profile --
      {
        displayName: 'Public Key or Username',
        name: 'profileUser',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            operation: ['getProfile'],
          },
        },
        description: 'Public key or username to look up. Leave blank to use your own profile.',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const credentials = await this.getCredentials('desoIdentityApi');
    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        let result: any;

        switch (operation) {
          case 'post': {
            const postBody = this.getNodeParameter('postBody', i) as string;
            const imageSource = this.getNodeParameter('imageSource', i, 'none') as string;
            const appendImageUrlToBody = this.getNodeParameter('appendImageUrlToBody', i, false) as boolean;
            const imageUrls: string[] = [];

            if (imageSource === 'url') {
              const imageUrl = this.getNodeParameter('imageUrl', i, '') as string;
              if (imageUrl.trim()) {
                imageUrls.push(imageUrl.trim());
              }
            }

            if (imageSource === 'binary') {
              const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data') as string;
              const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
              const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
              const uploadedImageUrl = await uploadImageToDeso(credentials, {
                data: buffer,
                fileName: binaryData.fileName || `${binaryPropertyName}.jpg`,
                mimeType: binaryData.mimeType,
              });
              imageUrls.push(uploadedImageUrl);
            }

            const body = appendImageUrlToBody && imageUrls.length > 0
              ? `${postBody.trim()}\n\n${imageUrls[0]}`
              : postBody;

            result = await postToDeso(credentials, { body, imageUrls });
            break;
          }
          case 'getProfile': {
            const profileUser = this.getNodeParameter('profileUser', i, '') as string;
            result = await getDesoProfile(credentials, { user: profileUser });
            break;
          }
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }

        returnData.push({ json: result });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: (error as Error).message } });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
