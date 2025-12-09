import axios from "axios";
import hackathon from "../models/hackathon.model.ts";
import * as cheerio from "cheerio";
import { universalFormatter } from "../utils/formatters/universalFormatter.ts";

export const scrapeUnstop = async (req: any, res: any) => {
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
  try {
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

    //save in the DB
    for (const hack of normalizedList as any[]) {
      await hackathon.findOneAndUpdate(
        {
          slug: hack.slug,
          platform: hack.platfomr,
        },
        { $set: hack },
        { upsert: true, new: true }
      );
    }

    return res.json({ ok: true, count: normalizedList });
  } catch (err) {
    console.error(err);
  }
};
