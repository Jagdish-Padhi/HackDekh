import express from "express";
const app = express();
import scrapperRoutes from './routes/scrape.route.ts'
import hackathonRoutes from './routes/hackathon.route.ts'
import userRoutes from './routes/user.route.ts';
import teamRoutes from './routes/team.route.ts';
import cors from 'cors';
import './cron/scrapeScheduler.ts';

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cors());

app.use("/api/v1/scrape", scrapperRoutes);
app.use("/api/v1/hackathons", hackathonRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/teams", teamRoutes);
export { app };
