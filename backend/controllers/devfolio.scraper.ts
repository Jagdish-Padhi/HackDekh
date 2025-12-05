import axios from "axios";
import hackathon from "../models/hackathon.model.ts";
import { universalFormatter } from "../utils/formatters/universalFormatter.ts";

//ATTEMPT 1: Tried to fetch from .json file in network tab but..
// its id was changing with time so not stable for long term

/* export const scrapeDevfolio = async (req: any, res: any) => {
   try {
1. fetch hackathons array raw data

    const URL = "https://devfolio.co/_next/data/JtO3J0dzXt3nDh-j8-16z/hackathons.json";
    const { data } = await axios.get(URL);
    const hackathons =
       data?.pageProps?.dehydratedState?.queries[0]?.state?.data
         ?.open_hackathons;

    if (!hackathons) {
       return res.status(400).json({ error: "No hackathons found..." });
     }

2. Pass Raw Data to universal formatter

     const normalizedList = universalFormatter(hackathons, "devfolio");

3. Save each hackathon in DB to avoid duplicate insert checking if hackathon
   already existing then update else insert using upsert true.

     for (const hack of normalizedList as any[]) {
       await hackathon.findOneAndUpdate(
         { slug: hack.slug, platform: hack.platform },
         { $set: hack },
         { upsert: true, new: true }
       );
    }
4. Return the data and result
     return res.json({ ok: true, count: normalizedList.length });
   } catch (error) {
     console.log("Devfolio Scraper Error: ", error);
     return res.status(500).json({ error: "Internal server error" });
   } */

//--------------------Hence It was not suitable for long term stability -----------------------------------

// ATTEMPT 2: Using cheerio extract html of main page and
// inside that fetch that hackathons json file in script tag


