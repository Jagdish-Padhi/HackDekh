import { asyncHandler } from "../utils/asyncHandler.ts";
import { ApiError } from "../utils/apiError.ts";
import User, { UserMethods } from "../models/user.model.ts";
import Hackathon from "../models/hackathon.model.ts";
import { ApiResponse } from "../utils/apiResponse.ts";
import jwt from "jsonwebtoken";
import { getPendingReflections as fetchPendingReflections } from "../services/stage.service.ts";
import axios from "axios";
import crypto from "crypto";
import { dbScan, dbUpdate, genId, sanitizeUserDoc } from "../db/helpers.ts";
import { TABLES } from "../constants.ts";

const generateAccessAndRefreshTokens = async (userId: string) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");
    const accessToken = UserMethods.generateAccessToken(user);
    const refreshToken = UserMethods.generateRefreshToken(user);
    await User.findOneAndUpdate(userId, { refreshToken });
    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token!"
    );
  }
};


const registerUser = asyncHandler(async (req: any, res: any) => {
  //Get user details from frontend
  const { username, fullName, email, password } = req.body;

  //validations
  if (
    [fullName, email, username, password].some(
      (field) => String(field)?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required!");
  }

  //check if user already exists: username, email
  const existingByUsername = await User.findOne({ username: String(username).toLowerCase() });
  const existingByEmail = await User.findOne({ email: String(email).toLowerCase() });

  if (existingByUsername || existingByEmail) {
    throw new ApiError(409, "User with email or username already exist");
  }

  //create user object - create entry in db
  const user = await User.create({
    fullName,
    email,
    password,
    username: String(username).toLowerCase(),
  });

  //remove password and refresh token field from response
  const createdUser = sanitizeUserDoc(await User.findById(user._id));

  //check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user!");
  }

  //return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully!"));
});


const loginUser = asyncHandler(async (req: any, res: any) => {
  const { username, email, password } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }

  let user = username
    ? await User.findOne({ username: String(username).toLowerCase() })
    : null;
  if (!user && email) {
    user = await User.findOne({ email: String(email).toLowerCase() });
  }

  if (!user) {
    throw new ApiError(404, "User not exists");
  }

  const isPasswordValid = await UserMethods.isPasswordCorrect(user, password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = sanitizeUserDoc(await User.findById(user._id));

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User loggedIn successfully!"
      )
    );
});


const logoutUser = asyncHandler(async (req: any, res: any) => {
  await dbUpdate(TABLES.USERS, { _id: req.user._id }, { REMOVE: ["refreshToken"] });
  const options = { httpOnly: true, secure: true };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully!"));
});


const refreshAccessToken = asyncHandler(async (req: any, res: any) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request!");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET || ""
    ) as any;
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refreshtoken");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used!");
    }
    const options = { httpOnly: true, secure: true };
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken,
          },
          "Access Token refreshed successfully!"
        )
      );
  } catch (error: any) {
    throw new ApiError(401, error?.message || "invalid refresh token");
  }
});


const changeCurrentPassword = asyncHandler(async (req: any, res: any) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const isPasswordCorrect = await UserMethods.isPasswordCorrect(user, oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid password!");
  }
  await User.findOneAndUpdate(user._id, { password: newPassword });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully!"));
});


const getCurrentUser = asyncHandler(async (req: any, res: any) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully!"));
});


const updateAccountDetails = asyncHandler(async (req: any, res: any) => {
  const { fullName, email } = req.body;

  if (!(fullName || email)) {
    throw new ApiError(400, "All fields are required!");
  }

  const user = await User.findOneAndUpdate(
    req.user?._id,
    { fullName, email }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, sanitizeUserDoc(user), "Account details updated successfully!"));
});



// Toggle Bookmark (Save / Unsave) a Hackathon
const toggleSaveHackathon = asyncHandler(async (req: any, res: any) => {
  const { hackathonId } = req.params;
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const saved = user.savedHackathons || [];
  let next: string[];
  if (saved.indexOf(hackathonId) === -1) {
    next = [...saved, hackathonId];
  } else {
    next = saved.filter((id) => id !== hackathonId);
  }

  await User.findOneAndUpdate(user._id, { savedHackathons: next });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { savedHackathons: next },
        "Hackathon bookmark toggled successfully!"
      )
    );
});

// Fetch Populated Saved Hackathons
const getSavedHackathons = asyncHandler(async (req: any, res: any) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const hackathons = await Hackathon.batchGet((user.savedHackathons || []) as string[]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        hackathons,
        "Saved hackathons fetched successfully!"
      )
    );
});

// Add a Hackathon Application
const addApplication = asyncHandler(async (req: any, res: any) => {
  const { hackathonId, status, notes } = req.body;

  if (!hackathonId) {
    throw new ApiError(400, "Hackathon ID is required!");
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const applications = user.applications || [];
  if (applications.some((app) => String(app.hackathon) === hackathonId)) {
    throw new ApiError(400, "Application for this hackathon already exists!");
  }

  const newApp = {
    _id: genId(),
    hackathon: hackathonId,
    status: status || "Applied",
    notes: notes || "",
    appliedAt: new Date().toISOString(),
  };

  await User.findOneAndUpdate(user._id, { applications: [...applications, newApp] });

  const hack = await Hackathon.findById(hackathonId);

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { ...newApp, hackathon: hack || hackathonId },
        "Application added successfully!"
      )
    );
});

// Update an Application (Status / Notes)
const updateApplication = asyncHandler(async (req: any, res: any) => {
  const { applicationId } = req.params;
  const { status, notes } = req.body;

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const applications = (user.applications || []).map((app) => {
    if (String(app._id) === applicationId) {
      return {
        ...app,
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
      };
    }
    return app;
  });

  if (!applications.some((app) => String(app._id) === applicationId)) {
    throw new ApiError(404, "Application entry not found");
  }

  await User.findOneAndUpdate(user._id, { applications });

  const hackById = await fetchHackathonsById(applications.map((app) => app.hackathon));
  const updatedApp = applications.find((app) => String(app._id) === applicationId);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { ...updatedApp, hackathon: hackById.get(String(updatedApp?.hackathon)) || updatedApp?.hackathon },
        "Application updated successfully!"
      )
    );
});

// Remove an Application Entry
const removeApplication = asyncHandler(async (req: any, res: any) => {
  const { applicationId } = req.params;

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const applications = (user.applications || []).filter(
    (app) => String(app._id) !== applicationId
  );
  if (applications.length === (user.applications || []).length) {
    throw new ApiError(404, "Application entry not found");
  }

  await User.findOneAndUpdate(user._id, { applications });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { applicationId },
        "Application removed successfully!"
      )
    );
});

async function fetchHackathonsById(ids: string[]): Promise<Map<string, any>> {
  const hacks = await Hackathon.batchGet(ids);
  return new Map(hacks.map((h) => [String(h._id), h]));
}

// Fetch Populated Applications
const getUserApplications = asyncHandler(async (req: any, res: any) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const applications = (user.applications || []).slice();
  const hackById = await fetchHackathonsById(applications.map((app) => app.hackathon));

  const populated = applications.map((app) => ({
    ...app,
    hackathon: hackById.get(String(app.hackathon)) || app.hackathon,
  }));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        populated,
        "User applications fetched successfully!"
      )
    );
});


const getPendingReflections = asyncHandler(async (req: any, res: any) => {
  const stages = await fetchPendingReflections(req.user._id);
  return res
    .status(200)
    .json(new ApiResponse(200, stages, 'Pending reflections fetched successfully'));
});


const githubAuth = asyncHandler(async (req: any, res: any) => {
  const { code } = req.body;
  if (!code) {
    throw new ApiError(400, "Authorization code is required");
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new ApiError(500, "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in your .env file.");
  }

  let githubUser: any;
  let email: string;

  try {
    // 1. Exchange code for access token
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    const { access_token: githubToken, error: tokenError, error_description } = tokenResponse.data;
    console.log("[GitHub OAuth] Token exchange response:", JSON.stringify(tokenResponse.data));
    if (tokenError || !githubToken) {
      throw new ApiError(400, error_description || "Failed to retrieve GitHub access token");
    }

    // 2. Fetch user profile
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `token ${githubToken}`,
      },
    });
    githubUser = userResponse.data;

    // 3. Fetch user emails to get verified primary email
    const emailsResponse = await axios.get("https://api.github.com/user/emails", {
      headers: {
        Authorization: `token ${githubToken}`,
      },
    });
    
    const primaryEmailObj = emailsResponse.data.find(
      (e: any) => e.primary && e.verified
    ) || emailsResponse.data[0];
    
    email = primaryEmailObj ? primaryEmailObj.email : `${githubUser.login}@github.com`;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    console.error("GitHub Auth Error:", err.response?.data || err.message);
    throw new ApiError(500, `GitHub authentication failed: ${err.message}`);
  }

  // Find or create user
  let user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    user = await User.findOne({ username: githubUser.login.toLowerCase() });
  }

  if (!user) {
    // Create new user
    const randomPassword = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    user = await User.create({
      username: githubUser.login.toLowerCase(),
      fullName: githubUser.name || githubUser.login,
      email: email.toLowerCase(),
      password: randomPassword,
    });
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
  const loggedInUser = sanitizeUserDoc(await User.findById(user._id));

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in via GitHub successfully!"
      )
    );
});

const searchUsers = asyncHandler(async (req: any, res: any) => {
  const query = String(req.query.query || '').trim();
  if (!query) {
    return res.status(200).json(new ApiResponse(200, [], "Empty query"));
  }

  // DynamoDB has no regex queries: scan the users table and filter in memory.
  const allUsers = await dbScan(TABLES.USERS);
  const re = new RegExp(query, "i");

  const users = allUsers
    .filter((u) => String(u._id) !== String(req.user._id))
    .filter(
      (u) =>
        re.test(String(u.username || "")) ||
        re.test(String(u.fullName || "")) ||
        re.test(String(u.email || ""))
    )
    .slice(0, 10)
    .map((u) => sanitizeUserDoc(u));

  return res.status(200).json(new ApiResponse(200, users, "Users fetched successfully!"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  toggleSaveHackathon,
  getSavedHackathons,
  addApplication,
  updateApplication,
  removeApplication,
  getUserApplications,
  getPendingReflections,
  githubAuth,
  searchUsers,
};