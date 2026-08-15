import dotenv from "dotenv";
dotenv.config();

import connectDB from "./db/connection.ts";
import User from "./models/user.model.ts";
import Team from "./models/team.model.ts";
import TeamInvitation from "./models/teamInvitation.model.ts";
import Hackathon from "./models/hackathon.model.ts";
import TeamHackathon from "./models/teamHackathon.model.ts";
import Stage from "./models/stage.model.ts";
import Reflection from "./models/reflection.model.ts";
import { TABLES } from "./constants.ts";
import {
    dbScan,
    dbTransactChunks,
    addTeamMember,
    setPendingReflection,
} from "./db/helpers.ts";
import crypto from "crypto";

const TABLE_KEYS: Record<string, string[]> = {
    [TABLES.USERS]: ["_id"],
    [TABLES.HACKATHONS]: ["_id"],
    [TABLES.TEAMS]: ["_id"],
    [TABLES.TEAM_MEMBERS]: ["userId", "teamId"],
    [TABLES.TEAM_INVITATIONS]: ["_id"],
    [TABLES.TEAM_HACKATHONS]: ["_id"],
    [TABLES.STAGES]: ["_id"],
    [TABLES.PENDING_REFLECTIONS]: ["userId", "stageId"],
    [TABLES.REFLECTIONS]: ["_id"],
};

async function clearTable(table: string): Promise<void> {
    const items = await dbScan(table as any);
    const keys = TABLE_KEYS[table] || ["_id"];
    const requests = items.map((item) => ({
        Delete: {
            TableName: table,
            Key: Object.fromEntries(keys.map((k) => [k, item[k]])),
        },
    }));
    await dbTransactChunks(requests);
    console.log(`[Seed] Cleared ${items.length} items from ${table}`);
}

const seedDatabase = async () => {
    try {
        await connectDB();
        console.log("Connected to database. Starting seed...");

        // Clean existing mock/seed data to avoid duplicates, but be careful with Hackathons
        await clearTable(TABLES.USERS);
        await clearTable(TABLES.TEAMS);
        await clearTable(TABLES.TEAM_MEMBERS);
        await clearTable(TABLES.TEAM_INVITATIONS);
        await clearTable(TABLES.TEAM_HACKATHONS);
        await clearTable(TABLES.STAGES);
        await clearTable(TABLES.PENDING_REFLECTIONS);
        await clearTable(TABLES.REFLECTIONS);

        // Remove only the demo hackathon if it exists
        await Hackathon.deleteMany({ slug: 'demo-global-hackathon-2026' });

        console.log("Cleared old demo data.");

        // 1. Create Users
        const usersData = [
            { username: "jagdish", email: "jagdish@example.com", fullName: "Jagdish", password: "password123" },
            { username: "twinkle", email: "twinkle@example.com", fullName: "Twinkle", password: "password123" },
            { username: "saman", email: "saman@example.com", fullName: "Saman", password: "password123" },
            { username: "poorvaja", email: "poorvaja@example.com", fullName: "Poorvaja", password: "password123" },
            { username: "ruturaj", email: "ruturaj@example.com", fullName: "Ruturaj", password: "password123" },
            { username: "vedang", email: "vedang@example.com", fullName: "Vedang", password: "password123" }
        ];

        const createdUsers: any[] = [];
        for (const u of usersData) {
            const newUser = await User.create(u);
            createdUsers.push(newUser);
        }
        console.log(`Created ${createdUsers.length} users.`);

        const [jagdish, twinkle, saman, poorvaja, ruturaj, vedang] = createdUsers;

        // 2. Create Teams (plus TEAM_MEMBERS companion rows)
        const team1 = await Team.create({
            name: "InnoBits",
            owner: jagdish._id,
            members: [jagdish._id, twinkle._id, saman._id],
            code: crypto.randomBytes(4).toString("hex").toUpperCase()
        });
        await addTeamMember(jagdish._id, team1._id);
        await addTeamMember(twinkle._id, team1._id);
        await addTeamMember(saman._id, team1._id);

        const team2 = await Team.create({
            name: "Esc(Realty);",
            owner: poorvaja._id,
            members: [poorvaja._id, ruturaj._id, vedang._id],
            code: crypto.randomBytes(4).toString("hex").toUpperCase()
        });
        await addTeamMember(poorvaja._id, team2._id);
        await addTeamMember(ruturaj._id, team2._id);
        await addTeamMember(vedang._id, team2._id);

        const team3 = await Team.create({
            name: "ETM",
            owner: saman._id,
            members: [saman._id, poorvaja._id],
            code: crypto.randomBytes(4).toString("hex").toUpperCase()
        });
        await addTeamMember(saman._id, team3._id);
        await addTeamMember(poorvaja._id, team3._id);

        const team4 = await Team.create({
            name: "Arjun",
            owner: ruturaj._id,
            members: [ruturaj._id, jagdish._id],
            code: crypto.randomBytes(4).toString("hex").toUpperCase()
        });
        await addTeamMember(ruturaj._id, team4._id);
        await addTeamMember(jagdish._id, team4._id);

        console.log("Created 4 teams.");

        // 3. Create Team Invitations
        const invite1 = await TeamInvitation.create({
            team: team1._id,
            invitedBy: jagdish._id,
            invitedEmail: poorvaja.email,
            invitedUser: poorvaja._id,
            token: crypto.randomBytes(16).toString("hex"),
            status: 'pending',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        });

        const invite2 = await TeamInvitation.create({
            team: team3._id,
            invitedBy: saman._id,
            invitedEmail: vedang.email,
            invitedUser: vedang._id,
            token: crypto.randomBytes(16).toString("hex"),
            status: 'pending',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

        const invite3 = await TeamInvitation.create({
            team: team1._id,
            invitedBy: twinkle._id,
            invitedEmail: "random@example.com",
            token: crypto.randomBytes(16).toString("hex"),
            status: 'pending',
            expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days from now
        });

        console.log("Created 3 team invitations.");

        // 4. Create a Demo Hackathon
        const hackathon = await Hackathon.create({
            title: "Demo Global Hackathon 2026",
            slug: "demo-global-hackathon-2026",
            mode: "Online",
            platform: "Devpost",
            startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // Started 5 days ago
            deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // Ends in 10 days
            teamSize: "1-4",
            prize: "$10,000",
            tags: ["AI", "Web3", "Open Source"],
            description: "A global hackathon for demonstrating the capabilities of our platform.",
            organization: "HackDekh",
            scrapedFromURL: "https://devpost.com",
        });

        // 5. User Applications
        await User.findOneAndUpdate(jagdish._id, {
            applications: [{
                _id: crypto.randomUUID(),
                hackathon: hackathon._id,
                status: 'Accepted',
                notes: '',
                appliedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
            }],
            savedHackathons: [hackathon._id]
        });

        console.log("Created Demo Hackathon.");

        // 6. Create TeamHackathons
        const teamHackathon1 = await TeamHackathon.create({
            team: team1._id,
            hackathon: hackathon._id,
            status: 'active'
        });

        // 7. Create Stages for the Hackathon Participation
        const stage1 = await Stage.create({
            name: "Idea Validation",
            teamHackathon: teamHackathon1._id,
            deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Past deadline
            result: 'qualified',
            notes: "Great idea, we should focus on the AI integration."
        });

        const stage2 = await Stage.create({
            name: "Prototyping",
            teamHackathon: teamHackathon1._id,
            deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Future deadline
            result: 'pending',
            pendingReflectionFor: [twinkle._id, saman._id]
        });
        await setPendingReflection(twinkle._id, stage2._id);
        await setPendingReflection(saman._id, stage2._id);

        const stage3 = await Stage.create({
            name: "Final Pitch Video",
            teamHackathon: teamHackathon1._id,
            deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // Future deadline
            result: 'pending',
        });

        // Update TeamHackathon with stages and current stage
        await TeamHackathon.findOneAndUpdate(teamHackathon1._id, {
            stages: [stage1._id, stage2._id, stage3._id],
            currentStage: stage2._id
        });

        // 8. Add Reflections to Stage 1 (standalone table + inline on the stage)
        const reflection1 = await Reflection.create({
            stage: stage1._id,
            user: jagdish._id,
            note: "I researched similar AI tools and found our idea is quite unique in this niche."
        });

        const reflection2 = await Reflection.create({
            stage: stage1._id,
            user: twinkle._id,
            note: "I created the initial Figma wireframes. The UX feels solid."
        });

        await Stage.findOneAndUpdate(stage1._id, {
            reflections: [
                { user: jagdish._id, note: reflection1.note },
                { user: twinkle._id, note: reflection2.note }
            ]
        });

        console.log("Created TeamHackathons, Stages, and Reflections.");
        console.log("Seed complete! You can now log in with email 'jagdish@example.com' and password 'password123'.");

        process.exit(0);
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
};

seedDatabase();