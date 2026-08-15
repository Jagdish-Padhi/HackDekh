import { getDynamoDBClient } from "../db/dynamo.ts";
import { TABLES } from "../constants.ts";
import { GetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

export interface TeamHackathonDocument {
    _id: string;
    currentStage?: string; // Stage ID
    status: 'tracking' | 'active' | 'eliminated' | 'finalist' | 'won';
    stages: string[]; // Stage IDs
    team: string; // Team ID
    hackathon: string; // Hackathon ID
    createdAt?: string;
    updatedAt?: string;
}

export const TeamHackathon = {
    async findById(id: string): Promise<TeamHackathonDocument | null> {
        const result = await getDynamoDBClient().send(
            new GetCommand({
                TableName: TABLES.TEAM_HACKATHONS,
                Key: { _id: id }
            })
        );
        return (result.Item as TeamHackathonDocument) || null;
    },

    async findOne(filter: { _id?: string }): Promise<TeamHackathonDocument | null> {
        if (filter._id) {
            return this.findById(filter._id);
        }

        // Additional query paths could be implemented via GSIs if needed
        return null;
    },

    async create(data: Partial<TeamHackathonDocument>): Promise<TeamHackathonDocument> {
        const client = getDynamoDBClient();
        const _id = crypto.randomUUID();
        const now = new Date().toISOString();

        const teamHackathon: TeamHackathonDocument = {
            _id,
            status: data.status || 'tracking',
            stages: data.stages || [],
            team: data.team || '',
            hackathon: data.hackathon || '',
            createdAt: now,
            updatedAt: now,
            ...data
        };

        await client.send(
            new PutCommand({
                TableName: TABLES.TEAM_HACKATHONS,
                Item: teamHackathon,
                ConditionExpression: "attribute_not_exists(#id)",
                ExpressionAttributeNames: { "#id": "_id" }
            })
        );
        
        return teamHackathon;
    },

    async save(doc: TeamHackathonDocument): Promise<TeamHackathonDocument> {
        const client = getDynamoDBClient();
        doc.updatedAt = new Date().toISOString();

        await client.send(
            new PutCommand({
                TableName: TABLES.TEAM_HACKATHONS,
                Item: doc,
                ConditionExpression: "attribute_exists(#id)",
                ExpressionAttributeNames: { "#id": "_id" }
            })
        );
        return doc;
    },

    async findOneAndUpdate(id: string, updateData: Partial<TeamHackathonDocument>): Promise<TeamHackathonDocument | null> {
        const doc = await this.findById(id);
        if (!doc) return null;
        
        const updatedDoc = { ...doc, ...updateData };
        return await this.save(updatedDoc);
    },

    async deleteMany(filter: { _id?: string; team?: string; hackathon?: string } = {}): Promise<void> {
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
                    TableName: TABLES.TEAM_HACKATHONS,
                    FilterExpression: conditions.join(" AND "),
                    ExpressionAttributeNames: names,
                    ExpressionAttributeValues: values,
                    ExclusiveStartKey: lastEvaluatedKey,
                })
            );

            const items = (scanResult.Items || []) as TeamHackathonDocument[];
            for (const item of items) {
                await client.send(
                    new DeleteCommand({
                        TableName: TABLES.TEAM_HACKATHONS,
                        Key: { _id: item._id },
                    })
                );
            }

            lastEvaluatedKey = scanResult.LastEvaluatedKey as Record<string, unknown> | undefined;
        } while (lastEvaluatedKey);
    },

    async batchGet(ids: string[]): Promise<TeamHackathonDocument[]> {
        if (!ids || ids.length === 0) return [];
        const client = getDynamoDBClient();
        const uniqueIds = Array.from(new Set(ids));
        
        let results: TeamHackathonDocument[] = [];
        
        for (let i = 0; i < uniqueIds.length; i += 100) {
            const batchIds = uniqueIds.slice(i, i + 100);
            const keys = batchIds.map(id => ({ _id: id }));
            
            const response = await client.send(
                new BatchGetCommand({
                    RequestItems: {
                        [TABLES.TEAM_HACKATHONS]: { Keys: keys }
                    }
                })
            );

            if (response.Responses && response.Responses[TABLES.TEAM_HACKATHONS]) {
                results = results.concat(response.Responses[TABLES.TEAM_HACKATHONS] as TeamHackathonDocument[]);
            }
        }
        
        return results;
    }
};

export default TeamHackathon;