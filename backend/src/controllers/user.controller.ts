import { asyncHandler } from "../utils/asyncHandler.ts";
import { ApiError } from "../utils/apiError.ts";
import User from "../models/user.model.ts";
import { ApiResponse } from "../utils/apiResponse.ts";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId: string) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");
    const accessToken = (user as any).generateAccessToken();
    const refreshToken = (user as any).generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
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
  const exitedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (exitedUser) {
    throw new ApiError(409, "User with email or username already exist");
  }



  //create user object - create entry in db
  const user = await User.create({
    fullName,
    email,
    password,
    username: username.toLowerCase(),
  });

  //remove password and refresh token field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

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

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User not exists");
  }

  const isPasswordValid = await (user as any).isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id.toString()
  );

  //VERY IMPORTANT:ab yaha pe ye ratna nahi hai logically sochna
  //pahle jo user object findone kiya tha above humare pass uska ref
  //hai aur generateAccessAndRefreshTokens method to niche call kiya
  //so us user object me refreshToken EMPTY hoga So.....
  //AAPKE PASS 2 OPTIONS HAIN ya to 1 aur db query karke firse user
  //object findone kar...OR....usi user object ko update karo....
  //agar db query expensive hai then choose to update otherwise
  //apply 1 more db query to get user object.... SIMPLE LOGIC!

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

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
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: undefined } },
    { returnDocument: 'after' }
  );
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
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id.toString());
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
  const isPasswordCorrect = await (user as any).isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid password!");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
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
  //BEST PRACTICE: agar kahi pe file update karana ho to
  //make seperate controller for that!

  const { fullName, email } = req.body;

  if (!(fullName || email)) {
    throw new ApiError(400, "All fields are required!");
  }

  const user = await User.findOneAndUpdate(
    { _id: req.user?._id },
    {
      $set: {
        fullName,
        email,
      },
    },
    { returnDocument: 'after' }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully!"));
});



// Toggle Bookmark (Save / Unsave) a Hackathon
const toggleSaveHackathon = asyncHandler(async (req: any, res: any) => {
  const { hackathonId } = req.params;
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

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

// Fetch Populated Saved Hackathons
const getSavedHackathons = asyncHandler(async (req: any, res: any) => {
  const user = await User.findById(req.user?._id).populate("savedHackathons");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

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

  const existingApp = user.applications.find(
    (app) => app.hackathon.toString() === hackathonId
  );
  if (existingApp) {
    throw new ApiError(400, "Application for this hackathon already exists!");
  }

  user.applications.push({
    hackathon: hackathonId,
    status: status || "Applied",
    notes: notes || "",
    appliedAt: new Date()
  } as any);

  await user.save({ validateBeforeSave: false });

  const updatedUser = await User.findById(req.user?._id).populate("applications.hackathon");
  const newApp = updatedUser?.applications.find(
    (app) => app.hackathon._id.toString() === hackathonId
  );

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        newApp,
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

  const app = user.applications.id(applicationId);
  if (!app) {
    throw new ApiError(404, "Application entry not found");
  }

  if (status) app.status = status;
  if (notes !== undefined) app.notes = notes;

  await user.save({ validateBeforeSave: false });

  const updatedUser = await User.findById(req.user?._id).populate("applications.hackathon");
  const updatedApp = updatedUser?.applications.id(applicationId);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedApp,
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

  const appIndex = user.applications.findIndex(
    (app) => app._id.toString() === applicationId
  );
  if (appIndex === -1) {
    throw new ApiError(404, "Application entry not found");
  }

  user.applications.splice(appIndex, 1);
  await user.save({ validateBeforeSave: false });

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

// Fetch Populated Applications
const getUserApplications = asyncHandler(async (req: any, res: any) => {
  const user = await User.findById(req.user?._id).populate("applications.hackathon");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user.applications,
        "User applications fetched successfully!"
      )
    );
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
};