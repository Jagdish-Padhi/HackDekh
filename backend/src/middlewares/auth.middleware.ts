import { ApiError } from "../utils/apiError.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import jwt from "jsonwebtoken";
import User from "../models/user.model.ts";

export const verifyJWT = asyncHandler(async (req: any, res: any, next: any) => {
    try {
const token =
  (req.cookies && req.cookies.accessToken) ||
  (req.header("authorization") && req.header("authorization").replace("Bearer ", ""));
        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || "") as any;

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if (!user) {
            throw new ApiError(401, "Invalid access token");
        }
        req.user = user;
        next();
    } catch (error: any) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});