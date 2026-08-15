import { getDynamoDBClient } from "../db/dynamo.ts";
import { TABLES } from "../constants.ts";
import { normalizeDates } from "../db/helpers.ts";
import { GetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

export interface StageInfo {
    _id: string;
    name: string;
    deadline?: string;
}

export interface HackathonDocument {
    _id: string;
    title: string;
    slug: string;
    startDate?: string;
    deadline?: string;
    applyLink?: string;
    mode: string;
    teamSize?: string;
    platform?: string;
    organization?: string;
    scrapedFromURL?: string;
    tags?: string[];
    prize?: string;
    location?: string;
    coverImage?: string;
    description?: string;
    stages?: StageInfo[];
    createdAt?: string;
    updatedAt?: string;
}

async function ensureUniqueSlugPlatform(
    slug: string | undefined,
    platform: string | undefined,
    excludeHackathonId?: string
): Promise<void> {
    if (!slug || !platform) return;

    const existing = await Hackathon.findOne({ slug, platform });
    if (existing && existing._id !== excludeHackathonId) {
        throw new Error("Hackathon with this slug and platform already exists.");
    }
}

export const Hackathon = {
    async findById(id: string): Promise<HackathonDocument | null> {
        const result = await getDynamoDBClient().send(
            new GetCommand({
                TableName: TABLES.HACKATHONS,
                Key: { _id: id }
            })
        );
        return (result.Item as HackathonDocument) || null;
    },

    async findOne(filter: { slug?: string; platform?: string; _id?: string }): Promise<HackathonDocument | null> {
        if (filter._id) {
            return this.findById(filter._id);
        }

        const client = getDynamoDBClient();

        if (filter.slug && filter.platform) {
            const result = await client.send(
                new QueryCommand({
                    TableName: TABLES.HACKATHONS,
                    IndexName: "slug-platform-index",
                    KeyConditionExpression: "slug = :slug AND platform = :platform",
                    ExpressionAttributeValues: { 
                        ":slug": filter.slug,
                        ":platform": filter.platform
                    }
                })
            );
            if (result.Items && result.Items.length > 0) return result.Items[0] as HackathonDocument;
        }

        return null;
    },

    async create(data: Partial<HackathonDocument>): Promise<HackathonDocument> {
        const client = getDynamoDBClient();
        const _id = crypto.randomUUID();
        const now = new Date().toISOString();

        const stages = (data.stages || []).map(s => ({
            ...s,
            _id: s._id || crypto.randomUUID()
        }));

        const hackathon: HackathonDocument = {
            _id,
            title: data.title || '',
            slug: data.slug || '',
            mode: data.mode || '',
            createdAt: now,
            updatedAt: now,
            ...data,
            stages
        };

        await ensureUniqueSlugPlatform(hackathon.slug, hackathon.platform);

        await client.send(
            new PutCommand({
                TableName: TABLES.HACKATHONS,
                Item: normalizeDates(hackathon) as Record<string, unknown>,
                ConditionExpression: "attribute_not_exists(#id)",
                ExpressionAttributeNames: { "#id": "_id" }
            })
        );
        
        return hackathon;
    },

    async save(doc: HackathonDocument): Promise<HackathonDocument> {
        const client = getDynamoDBClient();
        await ensureUniqueSlugPlatform(doc.slug, doc.platform, doc._id);
        doc.updatedAt = new Date().toISOString();

        await client.send(
            new PutCommand({
                TableName: TABLES.HACKATHONS,
                Item: normalizeDates(doc) as Record<string, unknown>,
                ConditionExpression: "attribute_exists(#id)",
                ExpressionAttributeNames: { "#id": "_id" }
            })
        );
        return doc;
    },

    async findOneAndUpdate(id: string, updateData: Partial<HackathonDocument>): Promise<HackathonDocument | null> {
        const doc = await this.findById(id);
        if (!doc) return null;
        
        const updatedDoc = { ...doc, ...updateData };
        return await this.save(updatedDoc);
    },

    async deleteMany(filter: { _id?: string; slug?: string; platform?: string } = {}): Promise<void> {
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
                    TableName: TABLES.HACKATHONS,
                    FilterExpression: conditions.join(" AND "),
                    ExpressionAttributeNames: names,
                    ExpressionAttributeValues: values,
                    ExclusiveStartKey: lastEvaluatedKey,
                })
            );

            const items = (scanResult.Items || []) as HackathonDocument[];
            for (const item of items) {
                await client.send(
                    new DeleteCommand({
                        TableName: TABLES.HACKATHONS,
                        Key: { _id: item._id },
                    })
                );
            }

            lastEvaluatedKey = scanResult.LastEvaluatedKey as Record<string, unknown> | undefined;
        } while (lastEvaluatedKey);
    },

    async batchGet(ids: string[]): Promise<HackathonDocument[]> {
        if (!ids || ids.length === 0) return [];
        const client = getDynamoDBClient();
        const uniqueIds = Array.from(new Set(ids));
        
        let results: HackathonDocument[] = [];
        
        for (let i = 0; i < uniqueIds.length; i += 100) {
            const batchIds = uniqueIds.slice(i, i + 100);
            const keys = batchIds.map(id => ({ _id: id }));
            
            const response = await client.send(
                new BatchGetCommand({
                    RequestItems: {
                        [TABLES.HACKATHONS]: { Keys: keys }
                    }
                })
            );

            if (response.Responses && response.Responses[TABLES.HACKATHONS]) {
                results = results.concat(response.Responses[TABLES.HACKATHONS] as HackathonDocument[]);
            }
        }
        
        return results;
    },

    async upsertHackathon(filter: { slug: string; platform: string }, data: Partial<HackathonDocument>): Promise<HackathonDocument> {
        const existing = await this.findOne(filter);
        if (existing) {
            return await this.findOneAndUpdate(existing._id, data) as HackathonDocument;
        } else {
            return await this.create({ ...filter, ...data });
        }
    }
};

export default Hackathon;