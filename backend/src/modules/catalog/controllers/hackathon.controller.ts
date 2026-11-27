import { asyncHandler } from "../../../shared/utils/asyncHandler.ts";
import { ApiResponse } from "../../../shared/responses/apiResponse.ts";
import { getHackathonsService, getHackathonBySlugService } from "../services/hackathon.service.ts";

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
