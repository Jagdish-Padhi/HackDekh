import { asyncHandler } from "../../../shared/utils/asyncHandler.ts";
import { ApiResponse } from "../../../shared/responses/apiResponse.ts";
import { getHackathonsService, getHackathonBySlugService } from "../services/hackathon.service.ts";
import Hackathon from "../models/hackathon.model.ts";

const SITE_URL = process.env.FRONTEND_URL || "https://hackdekh.jdecodes.tech";

export const getHackathons = asyncHandler(async (req: any, res: any) => {
  const { search, platform, mode, location, sortBy, showExpired } = req.query;

  const result = await getHackathonsService({
    search: search ? String(search) : undefined,
    platform: platform ? String(platform) : undefined,
    mode: mode ? String(mode) : undefined,
    location: location ? String(location) : undefined,
    sortBy: sortBy ? String(sortBy) : undefined,
    showExpired: showExpired ? String(showExpired) : undefined,
  });

  return res.status(200).json(new ApiResponse(200, result.data, result.message));
});

export const getHackathonBySlug = asyncHandler(async (req: any, res: any) => {
  const item = await getHackathonBySlugService(String(req.params.slug || ""));
  if (!item) {
    return res.status(404).json(new ApiResponse(404, null, "Hackathon not found"));
  }
  return res.status(200).json(new ApiResponse(200, item, "Hackathon fetched successfully"));
});

export const getHackathonsSitemap = asyncHandler(async (_req: any, res: any) => {
  const now = new Date();
  const rows = await Hackathon.find({
    slug: { $exists: true, $ne: "" },
    $or: [{ deadline: { $gte: now } }, { deadline: null }, { deadline: { $exists: false } }],
  })
    .select("slug updatedAt")
    .sort({ updatedAt: -1 })
    .limit(2000)
    .lean();

  const staticUrls = [
    { loc: `${SITE_URL}/`, changefreq: "daily", priority: "1.0" },
    { loc: `${SITE_URL}/hackathons`, changefreq: "daily", priority: "0.9" },
  ];

  const escapeXml = (str: string) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const urlNodes = [
    ...staticUrls.map(
      (u) =>
        `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    ),
    ...rows.map((r: any) => {
      const lastmod = r.updatedAt ? new Date(r.updatedAt).toISOString().slice(0, 10) : "";
      const loc = `${SITE_URL}/hackathons/${encodeURIComponent(String(r.slug))}`;
      return `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`;
    }),
  ].join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlNodes}\n</urlset>\n`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.status(200).send(xml);
});
