import express from "express";
const app = express();
import scrapperRoutes from './routes/scrapeRoutes.ts'

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use("/scrape", scrapperRoutes);
export { app };
