import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "./db/connection.ts";
import User from "./models/user.model.ts";
import Team from "./models/team.model.ts";
import TeamInvitation from "./models/teamInvitation.model.ts";
import Hackathon from "./models/hackathon.model.ts";
import TeamHackathon from "./models/teamHackathon.model.ts";
import Stage from "./models/stage.model.ts";
import Reflection from "./models/reflection.model.ts";
import crypto from "crypto";

const seedDatabase = async () => {
    try {
        await connectDB();
        console.log("Connected to database. Starting seed...");

        // Clean existing mock/seed data to avoid duplicates, but be careful with Hackathons
        await User.deleteMany({});
        await Team.deleteMany({});
        await TeamInvitation.deleteMany({});
        await TeamHackathon.deleteMany({});
        await Stage.deleteMany({});
        await Reflection.deleteMany({});
        
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

        const createdUsers = [];
        for (const u of usersData) {
            const newUser = new User(u);
            await newUser.save();
            createdUsers.push(newUser);
        }
        console.log(`Created ${createdUsers.length} users.`);

        const [jagdish, twinkle, saman, poorvaja, ruturaj, vedang] = createdUsers;

        // 2. Create Teams
        const team1 = new Team({
            name: "InnoBits",
            owner: jagdish._id,
            members: [jagdish._id, twinkle._id, saman._id],
            code: crypto.randomBytes(4).toString("hex").toUpperCase()
        });
        await team1.save();

        const team2 = new Team({
            name: "Esc(Realty);",
            owner: poorvaja._id,
            members: [poorvaja._id, ruturaj._id, vedang._id],
            code: crypto.randomBytes(4).toString("hex").toUpperCase()
        });
        await team2.save();

        const team3 = new Team({
            name: "ETM",
            owner: saman._id,
            members: [saman._id, poorvaja._id],
            code: crypto.randomBytes(4).toString("hex").toUpperCase()
        });
        await team3.save();

        const team4 = new Team({
            name: "Arjun",
            owner: ruturaj._id,
            members: [ruturaj._id, jagdish._id],
            code: crypto.randomBytes(4).toString("hex").toUpperCase()
        });
        await team4.save();

        console.log("Created 4 teams.");

        // 3. Create Team Invitations
        const invite1 = new TeamInvitation({
            team: team1._id,
            invitedBy: jagdish._id,
            invitedEmail: poorvaja.email,
            invitedUser: poorvaja._id,
            token: crypto.randomBytes(16).toString("hex"),
            status: 'pending',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        });
        await invite1.save();

        const invite2 = new TeamInvitation({
            team: team3._id,
            invitedBy: saman._id,
            invitedEmail: vedang.email,
            invitedUser: vedang._id,
            token: crypto.randomBytes(16).toString("hex"),
            status: 'pending',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
        await invite2.save();

        const invite3 = new TeamInvitation({
            team: team1._id,
            invitedBy: twinkle._id,
            invitedEmail: "random@example.com",
            token: crypto.randomBytes(16).toString("hex"),
            status: 'pending',
            expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
        });
        await invite3.save();

        console.log("Created 3 team invitations.");

        // 4. Create a Demo Hackathon
        const hackathon = new Hackathon({
            title: "Demo Global Hackathon 2026",
            slug: "demo-global-hackathon-2026",
            mode: "Online",
            platform: "Devpost",
            startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Started 5 days ago
            deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // Ends in 10 days
            teamSize: "1-4",
            prize: "$10,000",
            tags: ["AI", "Web3", "Open Source"],
            description: "A global hackathon for demonstrating the capabilities of our platform.",
            organization: "HackDekh",
            scrapedFromURL: "https://devpost.com",
        });
        await hackathon.save();

        // 5. User Applications
        jagdish.applications.push({
            hackathon: hackathon._id,
            status: 'Accepted',
            appliedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
        });
        jagdish.savedHackathons.push(hackathon._id);
        await jagdish.save();

        console.log("Created Demo Hackathon.");

        // 6. Create TeamHackathons
        const teamHackathon1 = new TeamHackathon({
            team: team1._id,
            hackathon: hackathon._id,
            status: 'active'
        });
        await teamHackathon1.save();

        // 7. Create Stages for the Hackathon Participation
        const stage1 = new Stage({
            name: "Idea Validation",
            teamHackathon: teamHackathon1._id,
            deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Past deadline
            result: 'qualified',
            notes: "Great idea, we should focus on the AI integration."
        });
        await stage1.save();

        const stage2 = new Stage({
            name: "Prototyping",
            teamHackathon: teamHackathon1._id,
            deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Future deadline
            result: 'pending',
            pendingReflectionFor: [twinkle._id, saman._id]
        });
        await stage2.save();

        const stage3 = new Stage({
            name: "Final Pitch Video",
            teamHackathon: teamHackathon1._id,
            deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Future deadline
            result: 'pending',
        });
        await stage3.save();

        // Update TeamHackathon with stages and current stage
        teamHackathon1.stages = [stage1._id, stage2._id, stage3._id];
        teamHackathon1.currentStage = stage2._id;
        await teamHackathon1.save();

        // 8. Add Reflections to Stage 1
        const reflection1 = new Reflection({
            stage: stage1._id,
            user: jagdish._id,
            note: "I researched similar AI tools and found our idea is quite unique in this niche."
        });
        await reflection1.save();
        stage1.reflections.push({ user: jagdish._id, note: reflection1.note });
        
        const reflection2 = new Reflection({
            stage: stage1._id,
            user: twinkle._id,
            note: "I created the initial Figma wireframes. The UX feels solid."
        });
        await reflection2.save();
        stage1.reflections.push({ user: twinkle._id, note: reflection2.note });
        
        await stage1.save();

        console.log("Created TeamHackathons, Stages, and Reflections.");
        console.log("Seed complete! You can now log in with email 'jagdish@example.com' and password 'password123'.");
        
        process.exit(0);
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
};

seedDatabase();
