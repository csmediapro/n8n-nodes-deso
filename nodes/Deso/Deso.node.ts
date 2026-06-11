import type {
  INodeType,
  INodeTypeDescription,
  INodeExecutionData,
  IExecuteFunctions,
  IDataObject,
  IHttpRequestOptions,
  JsonObject,
} from 'n8n-workflow';
import {
  NodeConnectionTypes,
  NodeApiError,
  NodeOperationError,
} from 'n8n-workflow';
import { getDesoProfile, postToDeso, uploadImageToDeso } from '../../src/desoOperations';

export class Deso implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'DeSo',
    name: 'deso',
    icon: 'file:logo.svg',
    group: ['output'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Publish DeSo posts and look up DeSo profiles',
    usableAsTool: true,
    defaults: {
      name: 'DeSo',
    },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
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
            name: 'Get Profile',
            value: 'getProfile',
            description: 'Get profile information for a DeSo user',
            action: 'Get deso profile',
          },
          {
            name: 'Post',
            value: 'post',
            description: 'Publish a text post, with an optional image, to DeSo',
            action: 'Post to deso',
          },
        ],
        default: 'post',
      },

      // -- Post --
      {
        displayName: 'Post Text',
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
        description: 'Text to publish in the DeSo post',
      },
      {
        displayName: 'Image',
        name: 'imageSource',
        type: 'options',
        options: [
          {
            name: 'From Previous Node',
            value: 'binary',
          },
          {
            name: 'From URL',
            value: 'url',
          },
          {
            name: 'None',
            value: 'none',
          },
        ],
        default: 'none',
        displayOptions: {
          show: {
            operation: ['post'],
          },
        },
        description: 'Optionally attach an image from the previous node or from a public URL',
      },
      {
        displayName: 'Image Field',
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
        description: 'Binary field that contains the image from the previous node. Most n8n image nodes use data.',
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
        description: 'Public image URL to attach to the DeSo post',
      },
      {
        displayName: 'Include Image URL in Post Text',
        name: 'appendImageUrlToBody',
        type: 'boolean',
        default: false,
        displayOptions: {
          show: {
            operation: ['post'],
            imageSource: ['binary', 'url'],
          },
        },
        description: 'Whether to also add the image URL as plain text at the end of the post',
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
        description: 'Public key or username to look up. Leave empty to use the selected credential account.',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const credentials = await this.getCredentials('desoIdentityApi');
    const operation = this.getNodeParameter('operation', 0) as string;
    const httpRequest = async <T = IDataObject>(options: IHttpRequestOptions): Promise<T> => {
      try {
        return await this.helpers.httpRequest(options) as T;
      } catch (error) {
        throw new NodeApiError(this.getNode(), error as JsonObject);
      }
    };

    for (let i = 0; i < items.length; i++) {
      try {
        let result: IDataObject;

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
              const uploadedImageUrl = await uploadImageToDeso(httpRequest, credentials, {
                data: buffer,
                fileName: binaryData.fileName || `${binaryPropertyName}.jpg`,
                mimeType: binaryData.mimeType,
              });
              imageUrls.push(uploadedImageUrl);
            }

            const body = appendImageUrlToBody && imageUrls.length > 0
              ? `${postBody.trim()}\n\n${imageUrls[0]}`
              : postBody;

            result = await postToDeso(httpRequest, credentials, { body, imageUrls }) as IDataObject;
            break;
          }
          case 'getProfile': {
            const profileUser = this.getNodeParameter('profileUser', i, '') as string;
            result = await getDesoProfile(httpRequest, credentials, { user: profileUser }) as IDataObject;
            break;
          }
          default:
            throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: i });
        }

        returnData.push({ json: result, pairedItem: { item: i } });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: error instanceof Error ? error.message : String(error) },
            pairedItem: { item: i },
          });
          continue;
        }
        if (error instanceof NodeApiError) {
          throw new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex: i });
        }
        const message = error instanceof Error ? error.message : String(error);
        throw new NodeOperationError(this.getNode(), message, { itemIndex: i });
      }
    }

    return [returnData];
  }
}
