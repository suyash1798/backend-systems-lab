import {
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException
} from '@aws-sdk/client-dynamodb';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import DynamoDbClient from '../aws/DynamoDbClient';

interface GamePlayerData {
  userId: string;
  gameId: string;
  data: Record<string, unknown>;
}

class DynamoPlayerDataStore {
  constructor(
    private readonly dynamoDb: DynamoDbClient,
    private readonly tableName: string
  ) {}

  async ensureTable(): Promise<void> {
    try {
      await this.dynamoDb.document.send(new DescribeTableCommand({ TableName: this.tableName }));
    } catch (err) {
      if (!(err instanceof ResourceNotFoundException)) {
        throw err;
      }

      await this.dynamoDb.document.send(new CreateTableCommand({
        TableName: this.tableName,
        AttributeDefinitions: [
          { AttributeName: 'userId', AttributeType: 'S' },
          { AttributeName: 'gameId', AttributeType: 'S' }
        ],
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' },
          { AttributeName: 'gameId', KeyType: 'RANGE' }
        ],
        BillingMode: 'PAY_PER_REQUEST'
      }));
    }
  }

  async save(payload: GamePlayerData): Promise<void> {
    await this.dynamoDb.document.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        ...payload,
        updatedAt: new Date().toISOString()
      }
    }));
  }
}

export default DynamoPlayerDataStore;
