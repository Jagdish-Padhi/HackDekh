import { getDynamoDBClient } from "../db/dynamo.ts";
import { TABLES } from "../constants.ts";
import { GetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

export interface ReflectionDocument {
    _id: string;
    stage: string; // Stage ID
    user: string; // User ID
    note: string;
    createdAt?: string;
    updatedAt?: string;
}

export const Reflection = {
    async findById(id: string): Promise<ReflectionDocument | null> {
        const result = await getDynamoDBClient().send(
            new GetCommand({
                TableName: TABLES.REFLECTIONS,
                Key: { _id: id }
            })
        );
        return (result.Item as ReflectionDocument) || null;
    },

    async findOne(filter: { _id?: string }): Promise<ReflectionDocument | null> {
        if (filter._id) {
            return this.findById(filter._id);
        }

        // Additional query paths could be implemented via GSIs if needed
        return null;
    },

    async create(data: Partial<ReflectionDocument>): Promise<ReflectionDocument> {
        const client = getDynamoDBClient();
        const _id = crypto.randomUUID();
        const now = new Date().toISOString();

        const reflection: ReflectionDocument = {
            _id,
            stage: data.stage || '',
            user: data.user || '',
            note: data.note || '',
            createdAt: now,
            updatedAt: now,
            ...data
        };

        await client.send(
            new PutCommand({
                TableName: TABLES.REFLECTIONS,
                Item: reflection,
                ConditionExpression: "attribute_not_exists(_id)"
            })
        );
        
        return reflection;
    },

    async save(doc: ReflectionDocument): Promise<ReflectionDocument> {
        const client = getDynamoDBClient();
        doc.updatedAt = new Date().toISOString();

        await client.send(
            new PutCommand({
                TableName: TABLES.REFLECTIONS,
                Item: doc,
                ConditionExpression: "attribute_exists(_id)"
            })
        );
        return doc;
    },

    async findOneAndUpdate(id: string, updateData: Partial<ReflectionDocument>): Promise<ReflectionDocument | null> {
        const doc = await this.findById(id);
        if (!doc) return null;
        
        const updatedDoc = { ...doc, ...updateData };
        return await this.save(updatedDoc);
    },

    async deleteMany(filter: { _id?: string; stage?: string; user?: string } = {}): Promise<void> {
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
                    TableName: TABLES.REFLECTIONS,
                    FilterExpression: conditions.join(" AND "),
                    ExpressionAttributeNames: names,
                    ExpressionAttributeValues: values,
                    ExclusiveStartKey: lastEvaluatedKey,
                })
            );

            const items = (scanResult.Items || []) as ReflectionDocument[];
            for (const item of items) {
                await client.send(
                    new DeleteCommand({
                        TableName: TABLES.REFLECTIONS,
                        Key: { _id: item._id },
                    })
                );
            }

            lastEvaluatedKey = scanResult.LastEvaluatedKey as Record<string, unknown> | undefined;
        } while (lastEvaluatedKey);
    },

    async batchGet(ids: string[]): Promise<ReflectionDocument[]> {
        if (!ids || ids.length === 0) return [];
        const client = getDynamoDBClient();
        const uniqueIds = Array.from(new Set(ids));
        
        let results: ReflectionDocument[] = [];
        
        for (let i = 0; i < uniqueIds.length; i += 100) {
            const batchIds = uniqueIds.slice(i, i + 100);
            const keys = batchIds.map(id => ({ _id: id }));
            
            const response = await client.send(
                new BatchGetCommand({
                    RequestItems: {
                        [TABLES.REFLECTIONS]: { Keys: keys }
                    }
                })
            );

            if (response.Responses && response.Responses[TABLES.REFLECTIONS]) {
                results = results.concat(response.Responses[TABLES.REFLECTIONS] as ReflectionDocument[]);
            }
        }
        
        return results;
    }
};

export default Reflection;
