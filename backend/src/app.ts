import express from "express";
const app = express();
import scrapperRoutes from './routes/scrapeRoutes.ts'
import hackathonRoutes from './routes/hackathonRoutes.ts'
import cors from 'cors';

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cors());

app.use("/scrape", scrapperRoutes);
app.use("/api", hackathonRoutes);
export { app };
