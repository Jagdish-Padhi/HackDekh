import { asyncHandler } from "../../../shared/utils/asyncHandler.ts";
import { ApiResponse } from "../../../shared/responses/apiResponse.ts";
import { getHackathonsService } from "../services/hackathon.service.ts";

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
