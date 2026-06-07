import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

interface DynamoDbClientOptions {
  region: string;
  endpoint?: string;
}

class DynamoDbClient {
  readonly document: DynamoDBDocumentClient | any;

  constructor(options: DynamoDbClientOptions) {
    const { region, endpoint } = options;

    const client = new DynamoDBClient({
      region,
      endpoint,
      credentials: endpoint
        ? {
            accessKeyId: 'local',
            secretAccessKey: 'local'
          }
        : undefined
    });

    this.document = DynamoDBDocumentClient.from(client);
  }

  close(): void {
    this.document.destroy();
  }
}

export default DynamoDbClient;
