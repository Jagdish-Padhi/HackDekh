import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

let client: DynamoDBDocumentClient | null = null;

export function getDynamoDBClient(): DynamoDBDocumentClient {
  if (client) return client;

  const endpoint = process.env.DYNAMODB_ENDPOINT || undefined;
  const sessionToken = process.env.AWS_SESSION_TOKEN || undefined;

  const ddb = new DynamoDBClient({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "local",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "local",
      ...(sessionToken ? { sessionToken } : {}),
    },
    ...(endpoint ? { endpoint } : {}),
  });

  client = DynamoDBDocumentClient.from(ddb, {
    marshallOptions: { removeUndefinedValues: true },
  });

  return client;
}
