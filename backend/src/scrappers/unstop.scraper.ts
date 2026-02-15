import axios from "axios";
import hackathon from "../models/hackathon.model.ts";
import * as cheerio from "cheerio";
import { universalFormatter } from "../formatters/universalFormatter.ts";

export const scrapeUnstop = async (req: any, res: any) => {

  try {
    const data = await scrapeUnstopData();
    return res.json({ ok: true, count: data.length });
  } catch (err: any) {
    console.error(
      "API might be blocked. Approach 1 failed, switching to fallback...",
      err.message
    );
    return res.status(500).json({ error: err.message || "Internal server error" });

  }

  // Approach 2: HTML scraping
  // try {
  //   const { data: html } = await axios.get("https://unstop.com/hackathons", {
  //     headers: HEADERS,
  //   });
  //   const $ = cheerio.load(html);
  //   const rawJson = $("#__NEXT_DATA__").html();

  //   if (!rawJson) {
  //     throw new Error("Critical issue: No __NEXt_DATA__ found");
  //   }

  //   const json = JSON.parse(rawJson);
  //   // Deep search for data in case path changed
  //   const hacks =
  //     json?.props?.pageProps?.initialState?.opportunities?.searchResult?.data ||
  //     json?.props?.pageProps?.seo_data?.opportunities;

  //   if (!hacks || hacks.length === 0) {
  //     return res
  //       .status(400)
  //       .json({ error: "No hackathons found via HTML scraping too..." });
  //   }

  //   return res.json({ ok: true, source: "html", count: hacks.length });
  // } catch (err) {
  //   console.error("Both Approaches failed...", err);
  //   return res.status(500).json({ error: "Scraper failed completely!" });
  // }
};

export async function scrapeUnstopData() {

  const HEADERS = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    Referer: "https://unstop.com/hackathons",
    Origin: "https://unstop.com",
  };

  let hackathons: any[] = [];
  let page: number = 1;
  let hasMoreData: boolean = true;

  //Approach 1: Internal API call

  //Because there are multiple pages so one by one we will search each page
  while (hasMoreData) {
    console.log(`fetching page No. ${page}...`);

    const { data: apiData } = await axios.get(
      "https://unstop.com/api/public/opportunity/search-result",
      {
        params: {
          opportunity: "hackathons",
          page: page,
          per_page: 20,
          oppstatus: "open",
        },
        headers: HEADERS,
      }
    );

    const currentBatch = apiData?.data?.data || [];

    //1. If batch is empty then scraped all pages
    if (currentBatch.length === 0) {
      hasMoreData = false;
      break;
    }

    //Otherwise all to main list of hackathons
    hackathons = [...hackathons, ...currentBatch];

    //Go to next page for search
    page++;

    //wait 1 sec between pages so that they don't ban me
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  //Normalize the raw data
  const normalizedList = universalFormatter(hackathons, "unstop");

  // IMPORTANT CHALLENGE (Handling Duplicates): Remove duplicates from array
  const uniqueHackathons = normalizedList.filter(
    (hack: any, idx: any, self: any) =>
      idx ===
      self.findIndex(
        (t: any) => t.slug === hack.slug && t.platform === hack.platform
      )
  );

  //save in the DB
  for (const hack of uniqueHackathons as any[]) {
    try {
      await hackathon.findOneAndUpdate(
        {
          slug: hack.slug,
          platform: hack.platform,
        },
        { $set: hack },
        { upsert: true, new: true }
      );
    } catch (err: any) {
      if (err.code === 11000) {
        console.log(`skipped duplicate hackathon: ${hack.slug}`);
      } else {
        console.error(`DB Error for ${hack.slug}: `, err);
      }
    }
  }

  return normalizedList;


}
