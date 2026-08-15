import { getDynamoDBClient } from "../db/dynamo.ts";
import { TABLES } from "../constants.ts";
import { GetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

export interface TeamDocument {
    _id: string;
    name: string;
    members: string[]; // User IDs
    owner: string; // User ID
    code?: string;
    createdAt?: string;
    updatedAt?: string;
}

async function ensureUniqueTeamCode(code: string | undefined, excludeTeamId?: string): Promise<void> {
    if (!code) return;

    const existing = await Team.findOne({ code });
    if (existing && existing._id !== excludeTeamId) {
        throw new Error("Team with this code already exists.");
    }
}

export const Team = {
    async findById(id: string): Promise<TeamDocument | null> {
        const result = await getDynamoDBClient().send(
            new GetCommand({
                TableName: TABLES.TEAMS,
                Key: { _id: id }
            })
        );
        return (result.Item as TeamDocument) || null;
    },

    async findOne(filter: { code?: string; _id?: string }): Promise<TeamDocument | null> {
        if (filter._id) {
            return this.findById(filter._id);
        }

        const client = getDynamoDBClient();

        if (filter.code) {
            const result = await client.send(
                new QueryCommand({
                    TableName: TABLES.TEAMS,
                    IndexName: "code-index",
                    KeyConditionExpression: "code = :code",
                    ExpressionAttributeValues: { 
                        ":code": filter.code
                    }
                })
            );
            if (result.Items && result.Items.length > 0) return result.Items[0] as TeamDocument;
        }

        return null;
    },

    async create(data: Partial<TeamDocument>): Promise<TeamDocument> {
        const client = getDynamoDBClient();
        const _id = crypto.randomUUID();
        const now = new Date().toISOString();

        const team: TeamDocument = {
            _id,
            name: data.name || '',
            owner: data.owner || '',
            members: data.members || [],
            createdAt: now,
            updatedAt: now,
            ...data
        };

        await ensureUniqueTeamCode(team.code);

        await client.send(
            new PutCommand({
                TableName: TABLES.TEAMS,
                Item: team,
                ConditionExpression: "attribute_not_exists(#id)",
                ExpressionAttributeNames: { "#id": "_id" }
            })
        );
        
        return team;
    },

    async save(doc: TeamDocument): Promise<TeamDocument> {
        const client = getDynamoDBClient();
        await ensureUniqueTeamCode(doc.code, doc._id);
        doc.updatedAt = new Date().toISOString();

        await client.send(
            new PutCommand({
                TableName: TABLES.TEAMS,
                Item: doc,
                ConditionExpression: "attribute_exists(#id)",
                ExpressionAttributeNames: { "#id": "_id" }
            })
        );
        return doc;
    },

    async findOneAndUpdate(id: string, updateData: Partial<TeamDocument>): Promise<TeamDocument | null> {
        const doc = await this.findById(id);
        if (!doc) return null;
        
        const updatedDoc = { ...doc, ...updateData };
        return await this.save(updatedDoc);
    },

    async deleteMany(filter: { _id?: string; owner?: string; code?: string } = {}): Promise<void> {
        const client = getDynamoDBClient();
        const entries = Object.entries(filter).filter(([, value]) => value !== undefined && value !== null);

        if (entries.length === 0) {
            throw new Error("deleteMany requires at least one filter field for safety.");
        }

        const names: Record<string, string> = {};
        const values: Record<string, string> = {};
        const conditions = entries.map(([key, value], index) => {
            const nameToken = `#k${index}`;
            const valueToken = `:v${index}`;
            names[nameToken] = key;
            values[valueToken] = String(value);
            return `${nameToken} = ${valueToken}`;
        });

        let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;

        do {
            const scanResult = await client.send(
                new ScanCommand({
                    TableName: TABLES.TEAMS,
                    FilterExpression: conditions.join(" AND "),
                    ExpressionAttributeNames: names,
                    ExpressionAttributeValues: values,
                    ExclusiveStartKey: lastEvaluatedKey,
                })
            );

            const items = (scanResult.Items || []) as TeamDocument[];
            for (const item of items) {
                await client.send(
                    new DeleteCommand({
                        TableName: TABLES.TEAMS,
                        Key: { _id: item._id },
                    })
                );
            }

            lastEvaluatedKey = scanResult.LastEvaluatedKey as Record<string, unknown> | undefined;
        } while (lastEvaluatedKey);
    },

    async batchGet(ids: string[]): Promise<TeamDocument[]> {
        if (!ids || ids.length === 0) return [];
        const client = getDynamoDBClient();
        const uniqueIds = Array.from(new Set(ids));
        
        let results: TeamDocument[] = [];
        
        for (let i = 0; i < uniqueIds.length; i += 100) {
            const batchIds = uniqueIds.slice(i, i + 100);
            const keys = batchIds.map(id => ({ _id: id }));
            
            const response = await client.send(
                new BatchGetCommand({
                    RequestItems: {
                        [TABLES.TEAMS]: { Keys: keys }
                    }
                })
            );

            if (response.Responses && response.Responses[TABLES.TEAMS]) {
                results = results.concat(response.Responses[TABLES.TEAMS] as TeamDocument[]);
            }
        }
        
        return results;
    }
};

export default Team;