import { CreateTableCommand, DescribeTableCommand, UpdateTimeToLiveCommand } from "@aws-sdk/client-dynamodb";
import { TABLES } from "../constants.ts";
import { getDynamoDBClient } from "./dynamo.ts";

interface TableSpec {
  name: string;
  key: { partition: string; sort?: string };
  gsis?: { name: string; partition: string; sort?: string }[];
  ttl?: string;
}

const SPECS: TableSpec[] = [
  {
    name: TABLES.USERS,
    key: { partition: "_id" },
    gsis: [
      { name: "email-index", partition: "email" },
      { name: "username-index", partition: "username" },
    ],
  },
  {
    name: TABLES.HACKATHONS,
    key: { partition: "_id" },
    gsis: [{ name: "slug-platform-index", partition: "slug", sort: "platform" }],
  },
  {
    name: TABLES.TEAMS,
    key: { partition: "_id" },
    gsis: [
      { name: "owner-index", partition: "owner" },
      { name: "code-index", partition: "code" },
    ],
  },
  {
    name: TABLES.TEAM_MEMBERS,
    key: { partition: "userId", sort: "teamId" },
  },
  {
    name: TABLES.TEAM_INVITATIONS,
    key: { partition: "_id" },
    gsis: [
      { name: "token-index", partition: "token" },
      { name: "team-index", partition: "team" },
      { name: "email-status-index", partition: "invitedEmail", sort: "status" },
      { name: "inviteduser-status-index", partition: "invitedUser", sort: "status" },
    ],
    ttl: "expiresAt",
  },
  {
    name: TABLES.TEAM_HACKATHONS,
    key: { partition: "_id" },
    gsis: [{ name: "team-index", partition: "team", sort: "createdAt" }],
  },
  {
    name: TABLES.STAGES,
    key: { partition: "_id" },
    gsis: [{ name: "teamhackathon-index", partition: "teamHackathon", sort: "createdAt" }],
  },
  {
    name: TABLES.PENDING_REFLECTIONS,
    key: { partition: "userId", sort: "stageId" },
  },
  {
    name: TABLES.REFLECTIONS,
    key: { partition: "_id" },
    gsis: [
      { name: "stage-index", partition: "stage" },
      { name: "user-index", partition: "user" },
    ],
  },
];

async function tableExists(name: string): Promise<boolean> {
  try {
    await getDynamoDBClient().send(new DescribeTableCommand({ TableName: name }));
    return true;
  } catch (err: any) {
    if (err.name === "ResourceNotFoundException") return false;
    throw err;
  }
}

function keySchema(p: string, s?: string) {
  return [
    { AttributeName: p, KeyType: "HASH" as const },
    ...(s ? [{ AttributeName: s, KeyType: "RANGE" as const }] : []),
  ];
}

function attributeDefinitions(names: string[]) {
  return [...new Set(names)].map((n) => ({ AttributeName: n, AttributeType: "S" as const }));
}

export async function ensureTables(): Promise<void> {
  for (const spec of SPECS) {
    if (await tableExists(spec.name)) continue;

    const attributeNames = [spec.key.partition, ...(spec.key.sort ? [spec.key.sort] : [])];
    const gsis = (spec.gsis || []).map((g) => {
      attributeNames.push(g.partition, ...(g.sort ? [g.sort] : []));
      return {
        IndexName: g.name,
        KeySchema: keySchema(g.partition, g.sort),
        Projection: { ProjectionType: "ALL" as const },
      };
    });

    await getDynamoDBClient().send(
      new CreateTableCommand({
        TableName: spec.name,
        KeySchema: keySchema(spec.key.partition, spec.key.sort),
        AttributeDefinitions: attributeDefinitions(attributeNames),
        GlobalSecondaryIndexes: gsis.length ? gsis : undefined,
        BillingMode: "PAY_PER_REQUEST",
      })
    );

    console.log(`[DB] Created table: ${spec.name}`);

    if (spec.ttl) {
      await getDynamoDBClient().send(
        new UpdateTimeToLiveCommand({
          TableName: spec.name,
          TimeToLiveSpecification: {
            Enabled: true,
            AttributeName: spec.ttl,
          },
        })
      );
    }
  }
}