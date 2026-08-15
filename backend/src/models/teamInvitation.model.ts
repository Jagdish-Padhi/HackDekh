import { getDynamoDBClient } from "../db/dynamo.ts";
import { TABLES } from "../constants.ts";
import { GetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

export interface TeamInvitationDocument {
    _id: string;
    team: string; // Team ID
    invitedBy: string; // User ID
    invitedEmail?: string;
    invitedUser?: string; // User ID
    token: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    expiresAt: string;
    acceptedBy?: string; // User ID
    acceptedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

async function ensureUniqueInvitationToken(token: string | undefined, excludeInvitationId?: string): Promise<void> {
    if (!token) return;

    const existing = await TeamInvitation.findOne({ token });
    if (existing && existing._id !== excludeInvitationId) {
        throw new Error("Invitation with this token already exists.");
    }
}

export const TeamInvitation = {
    async findById(id: string): Promise<TeamInvitationDocument | null> {
        const result = await getDynamoDBClient().send(
            new GetCommand({
                TableName: TABLES.TEAM_INVITATIONS,
                Key: { _id: id }
            })
        );
        return (result.Item as TeamInvitationDocument) || null;
    },

    async findOne(filter: { token?: string; _id?: string }): Promise<TeamInvitationDocument | null> {
        if (filter._id) {
            return this.findById(filter._id);
        }

        const client = getDynamoDBClient();

        if (filter.token) {
            const result = await client.send(
                new QueryCommand({
                    TableName: TABLES.TEAM_INVITATIONS,
                    IndexName: "token-index",
                    KeyConditionExpression: "#token = :token",
                    ExpressionAttributeNames: { "#token": "token" },
                    ExpressionAttributeValues: { 
                        ":token": filter.token
                    }
                })
            );
            if (result.Items && result.Items.length > 0) return result.Items[0] as TeamInvitationDocument;
        }

        return null;
    },

    async create(data: Partial<TeamInvitationDocument>): Promise<TeamInvitationDocument> {
        const client = getDynamoDBClient();
        const _id = crypto.randomUUID();
        const now = new Date().toISOString();

        const teamInvitation: TeamInvitationDocument = {
            _id,
            team: data.team || '',
            invitedBy: data.invitedBy || '',
            token: data.token || crypto.randomUUID(),
            status: data.status || 'pending',
            expiresAt: data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: now,
            updatedAt: now,
            ...data
        };

        if (data.invitedEmail) {
            teamInvitation.invitedEmail = data.invitedEmail.toLowerCase();
        } else {
            delete teamInvitation.invitedEmail;
        }
        if (!data.invitedUser) {
            delete teamInvitation.invitedUser;
        }

        await ensureUniqueInvitationToken(teamInvitation.token);

        await client.send(
            new PutCommand({
                TableName: TABLES.TEAM_INVITATIONS,
                Item: teamInvitation,
                ConditionExpression: "attribute_not_exists(#id)",
                ExpressionAttributeNames: { "#id": "_id" }
            })
        );
        
        return teamInvitation;
    },

    async save(doc: TeamInvitationDocument): Promise<TeamInvitationDocument> {
        const client = getDynamoDBClient();
        await ensureUniqueInvitationToken(doc.token, doc._id);
        doc.updatedAt = new Date().toISOString();
        if (!doc.invitedEmail) delete doc.invitedEmail;
        if (!doc.invitedUser) delete doc.invitedUser;

        await client.send(
            new PutCommand({
                TableName: TABLES.TEAM_INVITATIONS,
                Item: doc,
                ConditionExpression: "attribute_exists(#id)",
                ExpressionAttributeNames: { "#id": "_id" }
            })
        );
        return doc;
    },

    async findOneAndUpdate(id: string, updateData: Partial<TeamInvitationDocument>): Promise<TeamInvitationDocument | null> {
        const doc = await this.findById(id);
        if (!doc) return null;
        
        const updatedDoc = { ...doc, ...updateData };
        return await this.save(updatedDoc);
    },

    async deleteMany(filter: { _id?: string; team?: string; invitedUser?: string; token?: string; status?: string } = {}): Promise<void> {
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
                    TableName: TABLES.TEAM_INVITATIONS,
                    FilterExpression: conditions.join(" AND "),
                    ExpressionAttributeNames: names,
                    ExpressionAttributeValues: values,
                    ExclusiveStartKey: lastEvaluatedKey,
                })
            );

            const items = (scanResult.Items || []) as TeamInvitationDocument[];
            for (const item of items) {
                await client.send(
                    new DeleteCommand({
                        TableName: TABLES.TEAM_INVITATIONS,
                        Key: { _id: item._id },
                    })
                );
            }

            lastEvaluatedKey = scanResult.LastEvaluatedKey as Record<string, unknown> | undefined;
        } while (lastEvaluatedKey);
    },

    async batchGet(ids: string[]): Promise<TeamInvitationDocument[]> {
        if (!ids || ids.length === 0) return [];
        const client = getDynamoDBClient();
        const uniqueIds = Array.from(new Set(ids));
        
        let results: TeamInvitationDocument[] = [];
        
        for (let i = 0; i < uniqueIds.length; i += 100) {
            const batchIds = uniqueIds.slice(i, i + 100);
            const keys = batchIds.map(id => ({ _id: id }));
            
            const response = await client.send(
                new BatchGetCommand({
                    RequestItems: {
                        [TABLES.TEAM_INVITATIONS]: { Keys: keys }
                    }
                })
            );

            if (response.Responses && response.Responses[TABLES.TEAM_INVITATIONS]) {
                results = results.concat(response.Responses[TABLES.TEAM_INVITATIONS] as TeamInvitationDocument[]);
            }
        }
        
        return results;
    }
};

export default TeamInvitation;
