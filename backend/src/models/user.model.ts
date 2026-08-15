import { getDynamoDBClient } from "../db/dynamo.ts";
import { TABLES } from "../constants.ts";
import { GetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export interface Application {
    _id: string; // generated uuid
    hackathon: string;
    status: 'Applied' | 'Accepted' | 'Rejected' | 'Under Review' | 'Completed';
    notes: string;
    appliedAt: string;
}

export interface UserDocument {
    _id: string;
    username: string;
    email: string;
    fullName: string;
    password?: string;
    refreshToken?: string;
    savedHackathons?: string[];
    applications?: Application[];
    createdAt?: string;
    updatedAt?: string;
}

const BCRYPT_HASH_REGEX = /^\$2[aby]\$/;

function normalizeApplications(applications: Application[] | undefined): Application[] {
    if (!Array.isArray(applications)) return [];

    return applications.map((application) => ({
        _id: application?._id || crypto.randomUUID(),
        hackathon: String(application?.hackathon || ""),
        status: application?.status || "Applied",
        notes: application?.notes || "",
        appliedAt: application?.appliedAt || new Date().toISOString(),
    }));
}

async function ensureUniqueUserIdentity(
    identity: { email?: string; username?: string },
    excludeUserId?: string
): Promise<void> {
    if (identity.email) {
        const existingByEmail = await User.findOne({ email: identity.email });
        if (existingByEmail && existingByEmail._id !== excludeUserId) {
            throw new Error("User with this email already exists.");
        }
    }

    if (identity.username) {
        const existingByUsername = await User.findOne({ username: identity.username });
        if (existingByUsername && existingByUsername._id !== excludeUserId) {
            throw new Error("User with this username already exists.");
        }
    }
}

export const User = {
    async findById(id: string): Promise<UserDocument | null> {
        const result = await getDynamoDBClient().send(
            new GetCommand({
                TableName: TABLES.USERS,
                Key: { _id: id }
            })
        );
        return (result.Item as UserDocument) || null;
    },

    async findOne(filter: { email?: string; username?: string; _id?: string }): Promise<UserDocument | null> {
        if (filter._id) {
            return this.findById(filter._id);
        }

        const client = getDynamoDBClient();

        if (filter.email) {
            const result = await client.send(
                new QueryCommand({
                    TableName: TABLES.USERS,
                    IndexName: "email-index",
                    KeyConditionExpression: "email = :email",
                    ExpressionAttributeValues: { ":email": filter.email.toLowerCase() }
                })
            );
            if (result.Items && result.Items.length > 0) return result.Items[0] as UserDocument;
        }

        if (filter.username) {
            const result = await client.send(
                new QueryCommand({
                    TableName: TABLES.USERS,
                    IndexName: "username-index",
                    KeyConditionExpression: "username = :username",
                    ExpressionAttributeValues: { ":username": filter.username.toLowerCase() }
                })
            );
            if (result.Items && result.Items.length > 0) return result.Items[0] as UserDocument;
        }

        return null;
    },

    async create(data: Partial<UserDocument>): Promise<UserDocument> {
        const client = getDynamoDBClient();
        const _id = crypto.randomUUID();
        const now = new Date().toISOString();

        const user: UserDocument = {
            _id,
            username: data.username?.toLowerCase() || "",
            email: data.email?.toLowerCase() || "",
            fullName: data.fullName || "",
            createdAt: now,
            updatedAt: now,
            savedHackathons: [],
            applications: [],
            ...data,
        };

        user.username = user.username.toLowerCase();
        user.email = user.email.toLowerCase();
        user.savedHackathons = Array.isArray(user.savedHackathons) ? user.savedHackathons : [];
        user.applications = normalizeApplications(user.applications);

        await ensureUniqueUserIdentity({ email: user.email, username: user.username });

        if (user.password) {
            user.password = await bcrypt.hash(user.password, 10);
        }

        try {
            await client.send(
                new PutCommand({
                    TableName: TABLES.USERS,
                    Item: user,
                    ConditionExpression: "attribute_not_exists(#id)",
                    ExpressionAttributeNames: { "#id": "_id" }
                })
            );
        } catch (error: any) {
            throw error;
        }
        
        return user;
    },

    async save(doc: UserDocument): Promise<UserDocument> {
        const client = getDynamoDBClient();

        doc.username = (doc.username || "").toLowerCase();
        doc.email = (doc.email || "").toLowerCase();
        doc.savedHackathons = Array.isArray(doc.savedHackathons) ? doc.savedHackathons : [];
        doc.applications = normalizeApplications(doc.applications);
        doc.updatedAt = new Date().toISOString();

        await ensureUniqueUserIdentity({ email: doc.email, username: doc.username }, doc._id);

        if (doc.password && !BCRYPT_HASH_REGEX.test(doc.password)) {
            doc.password = await bcrypt.hash(doc.password, 10);
        }

        await client.send(
            new PutCommand({
                TableName: TABLES.USERS,
                Item: doc,
                ConditionExpression: "attribute_exists(#id)",
                ExpressionAttributeNames: { "#id": "_id" }
            })
        );
        return doc;
    },

    async findOneAndUpdate(id: string, updateData: Partial<UserDocument>): Promise<UserDocument | null> {
        const doc = await this.findById(id);
        if (!doc) return null;
        
        const updatedDoc = { ...doc, ...updateData };
        return await this.save(updatedDoc);
    },

    async deleteMany(filter: { _id?: string; email?: string; username?: string } = {}): Promise<void> {
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
                    TableName: TABLES.USERS,
                    FilterExpression: conditions.join(" AND "),
                    ExpressionAttributeNames: names,
                    ExpressionAttributeValues: values,
                    ExclusiveStartKey: lastEvaluatedKey,
                })
            );

            const items = (scanResult.Items || []) as UserDocument[];
            for (const item of items) {
                await client.send(
                    new DeleteCommand({
                        TableName: TABLES.USERS,
                        Key: { _id: item._id },
                    })
                );
            }

            lastEvaluatedKey = scanResult.LastEvaluatedKey as Record<string, unknown> | undefined;
        } while (lastEvaluatedKey);
    },

    async batchGet(ids: string[]): Promise<UserDocument[]> {
        if (!ids || ids.length === 0) return [];
        const client = getDynamoDBClient();
        const uniqueIds = Array.from(new Set(ids));
        
        let results: UserDocument[] = [];
        
        for (let i = 0; i < uniqueIds.length; i += 100) {
            const batchIds = uniqueIds.slice(i, i + 100);
            const keys = batchIds.map(id => ({ _id: id }));
            
            const response = await client.send(
                new BatchGetCommand({
                    RequestItems: {
                        [TABLES.USERS]: { Keys: keys }
                    }
                })
            );

            if (response.Responses && response.Responses[TABLES.USERS]) {
                results = results.concat(response.Responses[TABLES.USERS] as UserDocument[]);
            }
        }
        
        return results;
    }
};

export const UserMethods = {
    async isPasswordCorrect(user: UserDocument, password: string): Promise<boolean> {
        if (!user.password) return false;
        return await bcrypt.compare(password, user.password);
    },

    generateAccessToken(user: UserDocument): string {
        const secret = process.env.ACCESS_TOKEN_SECRET || "";
        const expiresIn = process.env.ACCESS_TOKEN_EXPIRY || "1d";
        return jwt.sign(
            {
                _id: user._id,
                email: user.email,
                username: user.username,
                fullName: user.fullName,
            },
            secret,
            { expiresIn: expiresIn } as any
        );
    },

    generateRefreshToken(user: UserDocument): string {
        const secret = process.env.REFRESH_TOKEN_SECRET || "";
        const expiresIn = process.env.REFRESH_TOKEN_EXPIRY || "7d";
        return jwt.sign(
            { _id: user._id },
            secret,
            { expiresIn: expiresIn } as any
        );
    }
};

export default User;