import { asyncHandler } from "../utils/asyncHandler.ts";
import { ApiError } from "../utils/apiError.ts";
import { ApiResponse } from "../utils/apiResponse.ts";
import User from "../models/user.model.ts";
import {
  registerUserService,
  loginUserService,
  githubAuthService,
  searchUsersService,
  generateAccessAndRefreshTokens,
} from "../services/user.service.ts";
import { getPendingReflections as fetchPendingReflections } from "../services/stage.service.ts";
import jwt from "jsonwebtoken";

const cookieOptions = {
  httpOnly: true,
  secure: true,
};

export const registerUser = asyncHandler(async (req: any, res: any) => {
  const createdUser = await registerUserService(req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully!"));
});

export const loginUser = asyncHandler(async (req: any, res: any) => {
  const { user, accessToken, refreshToken } = await loginUserService(req.body);
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user, accessToken, refreshToken },
        "User logged in successfully!"
      )
    );
});

export const logoutUser = asyncHandler(async (req: any, res: any) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: undefined } },
    { returnDocument: 'after' }
  );
  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out successfully!"));
});

export const refreshAccessToken = asyncHandler(async (req: any, res: any) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request!");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET || "fallback_refresh_secret_32_chars_minimum"
       ) as any;

    const user = await User.findById(decodedToken?._id);
    if (!user || incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token is invalid or expired!");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id.toString());
    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
        { accessToken, refreshToken },
        "Access token refreshed successfully!"
        )
      );
  } catch (error: any) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

export const changeCurrentPassword = asyncHandler(async (req: any, res: any) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Both old and new passwords are required.");
  }

  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(404, "User not found");

  const isPasswordCorrect = await (user as any).isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password!");
  }


  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully!"));
});

export const getCurrentUser = asyncHandler(async (req: any, res: any) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully!"));
});

export const updateAccountDetails = asyncHandler(async (req: any, res: any) => {
  const { fullName, email } = req.body;
  if (!fullName && !email) {
    throw new ApiError(400, "At least one field (fullName or email) is required.");
  }

  const updateFields: any = {};
  if (fullName) updateFields.fullName = fullName;
  if (email) updateFields.email = email;

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: updateFields },
    { returnDocument: 'after' }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully!"));
});

export const toggleSaveHackathon = asyncHandler(async (req: any, res: any) => {
  const { hackathonId } = req.params;
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(404, "User not found");

  const index = user.savedHackathons.indexOf(hackathonId as any);
  if (index === -1) {
    user.savedHackathons.push(hackathonId as any);
  } else {
    user.savedHackathons.splice(index, 1);
  }

  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { savedHackathons: user.savedHackathons },
        "Hackathon bookmark toggled successfully!"
      )
    );
});

export const getSavedHackathons = asyncHandler(async (req: any, res: any) => {
  const user = await User.findById(req.user?._id).populate("savedHackathons");
  if (!user) throw new ApiError(404, "User not found");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user.savedHackathons,
        "Saved hackathons fetched successfully!"
      )
    );
});

export const getPendingReflections = asyncHandler(async (req: any, res: any) => {
  const stages = await fetchPendingReflections(req.user._id);
  return res
    .status(200)
    .json(new ApiResponse(200, stages, "Pending reflections fetched successfully"));
});

export const githubAuth = asyncHandler(async (req: any, res: any) => {
  const { code } = req.body;
  const { user, accessToken, refreshToken } = await githubAuthService(code);
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user, accessToken, refreshToken },
        "User logged in via GitHub successfully!"
      )
    );
});

export const searchUsers = asyncHandler(async (req: any, res: any) => {
  const users = await searchUsersService(req.user._id, String(req.query.query || ''));
  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully!"));
});
