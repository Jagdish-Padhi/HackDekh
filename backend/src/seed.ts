import dotenv from 'dotenv';
dotenv.config();

import connectDB from './db/connection.ts';
import User from './models/user.model.ts';
import Team from './models/team.model.ts';
import Hackathon from './models/hackathon.model.ts';
import TeamHackathon from './models/teamHackathon.model.ts';
import Stage from './models/stage.model.ts';

async function seedDatabase() {
  try {
    console.log('[Seed] Connecting to Database...');
    await connectDB();

    console.log('[Seed] Seeding sample data...');

    // 1. Seed Demo User
    let demoUser = await User.findOne({ email: 'demo@hackdekh.com' });
    if (!demoUser) {
      demoUser = await User.create({
        username: 'demodev',
        fullName: 'Demo Developer',
        email: 'demo@hackdekh.com',
        password: 'Password123!',
      });
      console.log('[Seed] Created Demo User:', demoUser.email);
    }

    // 2. Seed Demo Hackathon
    let demoHackathon = await Hackathon.findOne({ slug: 'hackdekh-buildathon-2026' });
    if (!demoHackathon) {
      demoHackathon = await Hackathon.create({
        title: 'HackDekh Global Buildathon 2026',
        slug: 'hackdekh-buildathon-2026',
        platform: 'HackDekh',
        mode: 'Online',
        applyLink: 'https://hackdekh.com',
        organization: 'HackDekh Open Source',
        description: 'The premier global hackathon for building scalable developer products.',
        tags: ['Web3', 'AI', 'Fullstack'],
        prize: '$10,000 USD',
        location: 'Online',
        scrapedFromURL: 'https://hackdekh.com',
      });
      console.log('[Seed] Created Demo Hackathon:', demoHackathon.title);
    }

    // 3. Seed Demo Team
    let demoTeam = await Team.findOne({ name: 'Alpha Builders', owner: demoUser._id });
    if (!demoTeam) {
      demoTeam = await Team.create({
        name: 'Alpha Builders',
        owner: demoUser._id,
        members: [demoUser._id],
        code: 'ALPHA26',
      });
      console.log('[Seed] Created Demo Team:', (demoTeam as any).name);
    }

    // 4. Link Team to Hackathon
    let demoParticipation = await TeamHackathon.findOne({
      team: demoTeam._id,
      hackathon: demoHackathon._id,
    });
    if (!demoParticipation) {
      demoParticipation = await TeamHackathon.create({
        team: demoTeam._id,
        hackathon: demoHackathon._id,
        status: 'active',
      });
      console.log('[Seed] Linked Team to Hackathon.');

      // 5. Seed Stages
      await Stage.create({
        name: 'Initial Proposal Submission',
        teamHackathon: demoParticipation._id,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        result: 'qualified',
        notes: 'Submitted architecture PDF and initial pitch deck.',
      });

      await Stage.create({
        name: 'MVP Prototype Demo',
        teamHackathon: demoParticipation._id,
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        result: 'pending',
        notes: 'Building core MVP endpoints and UI walkthrough.',
      });
      console.log('[Seed] Seeded timeline stages.');
    }

    console.log('[Seed] Database Seeding Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Database Seeding Failed:', error);
    process.exit(1);
  }
}

seedDatabase();
