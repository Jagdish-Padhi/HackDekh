import {
  type DynamoDBDocumentClient,
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
export type Item = Record<string, unknown>;

const docClient = (): DynamoDBDocumentClient => getDynamoDBClient();

export function genId(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function toISO(value: string | number | Date | undefined | null): string | undefined {
  if (value === undefined || value == null) return undefined;
  if (typeof value === "string") {
    return isNaN(new Date(value).getTime()) ? undefined : value;
  }
  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return value.toISOString();
}

export function isNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeId(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "_id" in (value as any)) return String((value as any)._id);
  return String(value);
}

export function isValidId(value: unknown): boolean {
  const id = normalizeId(value);
  if (!id) return false;
  // UUIDs (MongoDB ObjectId hex also passes this as a fallback)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || /^[0-9a-f]{24}$/i.test(id);
}

export interface PutOptions {
  condition?: string;
}

export async function dbGet(table: TableName, key: Record<string, unknown>): Promise<Item | null> {
  const res = await docClient().send(new GetCommand({ TableName: table, Key: key }));
  return (res.Item ?? null) as Item | null;
}

export async function dbPut(table: TableName, item: Item, opts: PutOptions = {}): Promise<void> {
  const cmd: any = { TableName: table, Item: item };
  if (opts.condition) cmd.ConditionExpression = opts.condition;
  await docClient().send(new PutCommand(cmd));
}

export interface UpdateParams {
  SET?: Record<string, unknown>;
  REMOVE?: string[];
  condition?: string;
}

export async function dbUpdate(
  table: TableName,
  key: Record<string, unknown>,
  params: UpdateParams
): Promise<Item | null> {
  const { SET, REMOVE, condition } = params;
  const parts: string[] = [];
  const ExpressionAttributeNames: Record<string, string> = {};
  const ExpressionAttributeValues: Record<string, any> = {};

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
    }
  }

  const UpdateExpression = parts.join(" ");
  if (!UpdateExpression) {
    return dbGet(table, key);
  }

  const command: any = {
    TableName: table,
    Key: key,
    UpdateExpression,
    ExpressionAttributeNames: Object.keys(ExpressionAttributeNames).length
      ? ExpressionAttributeNames
      : undefined,
    ExpressionAttributeValues: Object.keys(ExpressionAttributeValues).length
      ? ExpressionAttributeValues
      : undefined,
    ReturnValues: "ALL_NEW",
  };
  if (condition) command.ConditionExpression = condition;

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

export async function dbQueryAll(input: Omit<QueryInput, "limit" | "exclusiveStartKey">): Promise<Item[]> {
  const all: Item[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const result = await dbQuery({
      ...input,
      limit: 1000,
      ...(lastKey ? { exclusiveStartKey: lastKey } : {}),
    });
    all.push(...result.items);
    lastKey = result.lastKey;
  } while (lastKey);
  return all;
}

export async function dbScan(
  table: TableName,
  opts: { filter?: string; names?: Record<string, string>; values?: Record<string, unknown>; limit?: number } = {}
): Promise<Item[]> {
  const all: Item[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const command: any = {
      TableName: table,
      FilterExpression: opts?.filter,
      ExpressionAttributeNames: opts?.names,
      ExpressionAttributeValues: opts?.values,
      Limit: opts?.limit ?? 1000,
      ExclusiveStartKey: lastKey,
    };
    const res = await docClient().send(new ScanCommand(command));
    all.push(...(res.Items ?? []));
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);
  return all;
}

export async function dbBatchGet(
  table: TableName,
  keys: Record<string, unknown>[],
  projection?: string[]
): Promise<Item[]> {
  if (!keys.length) return [];
  const collected: Item[] = [];
  const valuesSet = new Set(keys.map((k) => JSON.stringify(k)));

  let requested = keys.slice();
  while (requested.length) {
    const batch = requested.slice(0, 100);
    requested = requested.slice(100);
    const res: any = await docClient().send(
      new BatchGetCommand({
        RequestItems: {
          [table]: {
            Keys: batch,
            ProjectionExpression: projection ? projection.join(", ") : undefined,
          },
        },
      })
    );
    const returned = (res.Responses?.[table] ?? []) as Item[];
    collected.push(...returned);
    const returnedKeys = new Set(returned.map((r) => JSON.stringify({ _id: r._id })));
    // unprocessed keys are not retried to keep this simple
  }

  return collected;
}

export async function dbTransactWrite(requests: any[]): Promise<void> {
  await docClient().send(new TransactWriteCommand({ TransactItems: requests }));
}

// Runs a TransactWriteItems in chunks (DynamoDB allows max 100 actions per transaction).
export async function dbTransactChunks(requests: any[], chunkSize = 100): Promise<void> {
  for (let i = 0; i < requests.length; i += chunkSize) {
    const chunk = requests.slice(i, i + chunkSize);
    if (chunk.length) {
      await dbTransactWrite(chunk);
    }
  }
}

// ─── Companion table helpers ──────────────────────────────────────────────────
// TEAM_MEMBERS: partition "userId", sort "teamId"
export async function addTeamMember(userId: string, teamId: string): Promise<void> {
  await dbPut(TABLES.TEAM_MEMBERS, { userId, teamId });
}

export async function removeTeamMember(userId: string, teamId: string): Promise<void> {
  await dbDelete(TABLES.TEAM_MEMBERS, { userId, teamId });
}

export async function listTeamMemberIds(userId: string): Promise<string[]> {
  const items = await dbQueryAll({
    table: TABLES.TEAM_MEMBERS,
    keyCondition: "userId = :userId",
    values: { ":userId": userId },
  });
  return items.map((item) => String(item.teamId));
}

// PENDING_REFLECTIONS: partition "userId", sort "stageId"
export async function setPendingReflection(userId: string, stageId: string): Promise<void> {
  await dbPut(TABLES.PENDING_REFLECTIONS, { userId, stageId });
}

export async function clearPendingReflection(userId: string, stageId: string): Promise<void> {
  await dbDelete(TABLES.PENDING_REFLECTIONS, { userId, stageId });
}

export async function listPendingReflectionStageIds(userId: string): Promise<string[]> {
  const items = await dbQueryAll({
    table: TABLES.PENDING_REFLECTIONS,
    keyCondition: "userId = :userId",
    values: { ":userId": userId },
  });
  return items.map((item) => String(item.stageId));
}

export async function listPendingReflectionUsersForStage(stageId: string): Promise<Item[]> {
  return dbScan(TABLES.PENDING_REFLECTIONS, {
    filter: "stageId = :stageId",
    values: { ":stageId": stageId },
  });
}

// ─── Sanitization helpers ─────────────────────────────────────────────────────
export function sanitizeUserDoc(user: Record<string, any> | null | undefined): Record<string, any> | null | undefined {
  if (!user) return user;
  const { password, refreshToken, ...safe } = user;
  return safe;
}

export { TABLES };
