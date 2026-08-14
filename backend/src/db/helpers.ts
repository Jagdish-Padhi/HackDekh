import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchGetCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { getDynamoDBClient } from "./dynamo.ts";
import { TABLES } from "../constants.ts";
import crypto from "crypto";

export type TableName = (typeof TABLES)[keyof typeof TABLES];
export type Item = Record<string, any>;

const docClient = (): DynamoDBDocumentClient => getDynamoDBClient();

export function genId(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function toISO(value: string | number | Date | undefined | null): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number") return new Date(value).toISOString();
  return value.toISOString();
}

export function isNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export async function dbGet(table: TableName, key: Record<string, unknown>): Promise<Item | null> {
  const res = await docClient().send(new GetCommand({ TableName: table, Key: key }));
  return (res.Item ?? null) as Item | null;
}

export interface PutOptions {
  condition?: string;
}
export async function dbPut(table: TableName, item: Item, opts: PutOptions = {}): Promise<void> {
  const cmd: any = { TableName: table, Item: item };
  if (opts.condition) cmd.ConditionExpression = opts.condition;
  await docClient().send(new PutCommand(cmd));
}

export async function dbUpdate(
  table: TableName,
  key: Record<string, unknown>,
  params: { SET?: Record<string, unknown>; REMOVE?: string[]; condition?: string }
): Promise<Item | null> {
  const { SET, REMOVE, condition } = params;
  let UpdateExpression = "";
  const ExpressionAttributeNames: Record<string, string> = {};
  const ExpressionAttributeValues: Record<string, unknown> = {};

  const n = (name: string) => {
    const token = `#${name.replace(/[.]/g, "_")}`;
    ExpressionAttributeNames[token] = name;
    return token;
  };
  const v = (name: string, value: unknown, i = 0) => {
    const token = `:${name.replace(/[.]/g, "_")}${i}`;
    ExpressionAttributeValues[token] = value === undefined ? null : value;
    return token;
  };

  const parts: string[] = [];
  if (SET) {
    let i = 0;
    for (const [name, value] of Object.entries(SET)) {
      parts.push(`${n(name)} = ${v(name, value, i)}`);
      i++;
    }
  }
  if (REMOVE) {
    for (const name of REMOVE) {
      parts.push(`REMOVE ${n(name)}`);
      void v;
    }
  }
  UpdateExpression = parts.join(" ");
  if (!UpdateExpression) {
    return dbGet(table, key);
  }

  const command: any = {
    TableName: table,
    Key: key,
    UpdateExpression,
    ExpressionAttributeNames: Object.keys(ExpressionAttributeNames).length ? ExpressionAttributeNames : undefined,
    ExpressionAttributeValues: Object.keys(ExpressionAttributeValues).length ? ExpressionAttributeValues : undefined,
    ReturnValues: "ALL_NEW",
    ConditionExpression: condition,
  };

  const res = await docClient().send(new UpdateCommand(command));
  return (res.Attributes ?? null) as Item | null;
}

export async function dbDelete(table: TableName, key: Record<string, unknown>, condition?: string): Promise<void> {
  const cmd: any = { TableName: table, Key: key };
  if (condition) cmd.ConditionExpression = condition;
  await docClient().send(new DeleteCommand(cmd));
}

export interface QueryInput {
  table: TableName;
  index?: string;
  keyCondition: string;
  names?: Record<string, string>;
  values?: Record<string, unknown>;
  filter?: string;
  scanIndexForward?: boolean;
  limit?: number;
  exclusiveStartKey?: Record<string, unknown>;
}

export interface QueryResult {
  items: Item[];
  lastKey?: Record<string, unknown>;
}

export async function dbQuery(input: QueryInput): Promise<QueryResult> {
  const command: any = {
    TableName: input.table,
    IndexName: input.index,
    KeyConditionExpression: input.keyCondition,
    ExpressionAttributeNames: input.names,
    ExpressionAttributeValues: input.values,
    FilterExpression: input.filter,
    Limit: input.limit,
    ExclusiveStartKey: input.exclusiveStartKey,
    ScanIndexForward: input.scanIndexForward,
  };
  const res = await docClient().send(new QueryCommand(command));
  const items = (res.Items ?? []) as Item[];
  if (res.LastEvaluatedKey) {
    return { items, lastKey: res.LastEvaluatedKey as Record<string, unknown> };
  }
  return { items };
}

export async function dbScan(
  table: TableName,
  opts: { filter?: string; names?: Record<string, string>; values?: Record<string, unknown>; limit?: number }
): Promise<Item[]> {
  const command: any = {
    TableName: table,
    FilterExpression: opts?.filter,
    ExpressionAttributeNames: opts?.names,
    ExpressionAttributeValues: opts?.values,
    Limit: opts?.limit,
  };
  const res = await docClient().send(new ScanCommand(command));
  return (res.Items ?? []) as Item[];
}

export async function dbBatchGet(
  table: TableName,
  keys: Record<string, unknown>[],
  projection?: string[]
): Promise<Item[]> {
  if (!keys.length) return [];
  const res: any = await docClient().send(
    new BatchGetCommand({
      RequestItems: {
        [table]: {
          Keys: keys,
          ProjectionExpression: projection ? projection.join(", ") : undefined,
        },
      },
    })
  );
  return (res.Responses?.[table] ?? []) as Item[];
}

export async function dbTransactWrite(requests: any[]): Promise<void> {
  await docClient().send(new TransactWriteCommand({ TransactItems: requests }));
}

export { TABLES };
