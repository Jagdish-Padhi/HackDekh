import { getDynamoDBClient } from "../db/dynamo.ts";
import { TABLES } from "../constants.ts";
import { GetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

export interface StageReflection {
    user: string; // User ID
    note: string;
}

export interface StageDocument {
    _id: string;
    name: string;
    teamHackathon: string; // TeamHackathon ID
    deadline?: string;
    result: 'pending' | 'qualified' | 'rejected';
    notes: string;
    reflections: StageReflection[];
    pendingReflectionFor: string[]; // User IDs
    createdAt?: string;
    updatedAt?: string;
}

export const Stage = {
    async findById(id: string): Promise<StageDocument | null> {
        const result = await getDynamoDBClient().send(
            new GetCommand({
                TableName: TABLES.STAGES,
                Key: { _id: id }
            })
        );
        return (result.Item as StageDocument) || null;
    },

    async findOne(filter: { _id?: string }): Promise<StageDocument | null> {
        if (filter._id) {
            return this.findById(filter._id);
        }

        // Additional query paths could be implemented via GSIs if needed
        return null;
    },

    async create(data: Partial<StageDocument>): Promise<StageDocument> {
        const client = getDynamoDBClient();
        const _id = crypto.randomUUID();
        const now = new Date().toISOString();

        const stage: StageDocument = {
            _id,
            name: data.name || '',
            teamHackathon: data.teamHackathon || '',
            result: data.result || 'pending',
            notes: data.notes || '',
            reflections: data.reflections || [],
            pendingReflectionFor: data.pendingReflectionFor || [],
            createdAt: now,
            updatedAt: now,
            ...data
        };

        await client.send(
            new PutCommand({
                TableName: TABLES.STAGES,
                Item: stage,
                ConditionExpression: "attribute_not_exists(_id)"
            })
        );
        
        return stage;
    },

    async save(doc: StageDocument): Promise<StageDocument> {
        const client = getDynamoDBClient();
        doc.updatedAt = new Date().toISOString();

        await client.send(
            new PutCommand({
                TableName: TABLES.STAGES,
                Item: doc,
                ConditionExpression: "attribute_exists(_id)"
            })
        );
        return doc;
    },

    async findOneAndUpdate(id: string, updateData: Partial<StageDocument>): Promise<StageDocument | null> {
        const doc = await this.findById(id);
        if (!doc) return null;
        
        const updatedDoc = { ...doc, ...updateData };
        return await this.save(updatedDoc);
    },

    async deleteMany(filter: { _id?: string; teamHackathon?: string } = {}): Promise<void> {
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
                    TableName: TABLES.STAGES,
                    FilterExpression: conditions.join(" AND "),
                    ExpressionAttributeNames: names,
                    ExpressionAttributeValues: values,
                    ExclusiveStartKey: lastEvaluatedKey,
                })
            );

            const items = (scanResult.Items || []) as StageDocument[];
            for (const item of items) {
                await client.send(
                    new DeleteCommand({
                        TableName: TABLES.STAGES,
                        Key: { _id: item._id },
                    })
                );
            }

            lastEvaluatedKey = scanResult.LastEvaluatedKey as Record<string, unknown> | undefined;
        } while (lastEvaluatedKey);
    },

    async batchGet(ids: string[]): Promise<StageDocument[]> {
        if (!ids || ids.length === 0) return [];
        const client = getDynamoDBClient();
        const uniqueIds = Array.from(new Set(ids));
        
        let results: StageDocument[] = [];
        
        for (let i = 0; i < uniqueIds.length; i += 100) {
            const batchIds = uniqueIds.slice(i, i + 100);
            const keys = batchIds.map(id => ({ _id: id }));
            
            const response = await client.send(
                new BatchGetCommand({
                    RequestItems: {
                        [TABLES.STAGES]: { Keys: keys }
                    }
                })
            );

            if (response.Responses && response.Responses[TABLES.STAGES]) {
                results = results.concat(response.Responses[TABLES.STAGES] as StageDocument[]);
            }
        }
        
        return results;
    }
};

export default Stage;