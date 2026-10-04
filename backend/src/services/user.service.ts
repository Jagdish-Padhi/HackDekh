import { randomBytes } from 'crypto';
import axios from 'axios';
import User from '../models/user.model.ts';
import { ApiError } from '../utils/apiError.ts';
import { verifyFirebaseIdToken } from '../config/firebase.ts';

export async function generateAccessAndRefreshTokens(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const accessToken = (user as any).generateAccessToken();
  const refreshToken = (user as any).generateRefreshToken();

  (user as any).refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
}

export async function registerUserService(payload: {
  username: string;
  email: string;
  fullName: string;
  password: string;
}) {
  const { username, email, fullName, password } = payload;

  const existedUser = await User.findOne({
    $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
  });

  if (existedUser) {
    throw new ApiError(409, 'User with email or username already exists');
  }

  const user = await User.create({
    fullName,
    email: email.toLowerCase(),
    password,
    username: username.toLowerCase(),
    authProvider: 'local',
  });

  const createdUser = await User.findById(user._id).select('-password -refreshToken');
  if (!createdUser) {
    throw new ApiError(500, 'Something went wrong while registering the user');
  }

  return createdUser;
}

export async function loginUserService(payload: {
  email?: string;
  username?: string;
  password?: string;
}) {
  const { email, username, password } = payload;

  if (!password) {
    throw new ApiError(400, 'Password is required');
  }

  const queryConditions: any[] = [];
  if (email) queryConditions.push({ email: email.toLowerCase() });
  if (username) queryConditions.push({ username: username.toLowerCase() });

  if (queryConditions.length === 0) {
    throw new ApiError(400, 'Username or email is required');
  }

  const user = await User.findOne({ $or: queryConditions });

  if (!user) {
    throw new ApiError(404, 'User does not exist');
  }

  const isPasswordValid = await (user as any).isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid user credentials');
  }

  const tokens = await generateAccessAndRefreshTokens(user!._id.toString());
  const loggedInUser = await User.findById(user._id).select('-password -refreshToken');

  return { user: loggedInUser, ...tokens };
}

export async function githubAuthService(code: string) {
  if (!code) {
    throw new ApiError(400, 'Authorization code is required');
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new ApiError(500, 'GitHub OAuth is not configured on server.');
  }

  const tokenResponse = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: clientId,
      client_secret: clientSecret,
      code,
    },
    { headers: { Accept: 'application/json' } }
  );

  const { access_token: githubToken, error_description } = tokenResponse.data;
  if (!githubToken) {
    throw new ApiError(400, error_description || 'Failed to retrieve GitHub access token');
  }

  const userResponse = await axios.get('https://api.github.com/user', {
    headers: { Authorization: `token ${githubToken}` },
  });
  const githubUser = userResponse.data;

  const emailsResponse = await axios.get('https://api.github.com/user/emails', {
    headers: { Authorization: `token ${githubToken}` },
  });

  const primaryEmailObj =
    emailsResponse.data.find((e: any) => e.primary && e.verified) || emailsResponse.data[0];
  const email = primaryEmailObj ? primaryEmailObj.email : `${githubUser.login}@github.com`;

  let user = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: githubUser.login.toLowerCase() }],
  });

  if (!user) {
    const randomPassword = randomBytes(32).toString('hex');
    user = await User.create({
      username: githubUser.login.toLowerCase(),
      fullName: githubUser.name || githubUser.login,
      email: email.toLowerCase(),
      password: randomPassword,
      avatar: githubUser.avatar_url || '',
      githubId: String(githubUser.id),
      authProvider: 'github',
      isEmailVerified: true,
      role: 'hacker',
    });
  } else {
    let needsSave = false;
    if (!(user as any).githubId) {
      (user as any).githubId = String(githubUser.id);
      needsSave = true;
    }
    if (!(user as any).isEmailVerified) {
      (user as any).isEmailVerified = true;
      needsSave = true;
    }
    if (githubUser.avatar_url && !(user as any).avatar) {
      (user as any).avatar = githubUser.avatar_url;
      needsSave = true;
    }
    if (needsSave) {
      await user.save();
    }
  }

  const tokens = await generateAccessAndRefreshTokens(user._id.toString());
  const loggedInUser = await User.findById(user._id).select('-password -refreshToken');

  return { user: loggedInUser, ...tokens };
}

export async function googleAuthService(idToken: string) {
  if (!idToken) {
    throw new ApiError(400, 'Firebase ID token is required');
  }

  const verifiedPayload = await verifyFirebaseIdToken(idToken);
  const email = verifiedPayload.email.toLowerCase();

  if (!email) {
    throw new ApiError(400, 'Unable to retrieve email from Google authentication');
  }

  let user = await User.findOne({ email });

  if (!user) {
    const emailPrefix = email.split('@')[0] || 'hacker';
    const rawName = verifiedPayload.name || emailPrefix;
    const baseUsername = rawName
      .toLowerCase()
      .replace(/[^az0-9_]/g, '')
      .slice(0, 15) || 'hacker';

    let username = baseUsername;
    let counter = 1;
    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    const randomPassword = randomBytes(32).toString('hex');

    user = await User.create({
      username,
      fullName: verifiedPayload.name || username,
      email,
      password: randomPassword,
      avatar: verifiedPayload.picture || '',
      googleId: verifiedPayload.uid,
      authProvider: 'google',
      isEmailVerified: true,
      role: 'hacker',
    });
  } else {
    let needsSave = false;
    if (!(user as any).googleId) {
      (user as any).googleId = verifiedPayload.uid;
      needsSave = true;
    }
    if (!(user as any).isEmailVerified) {
      (user as any).isEmailVerified = true;
      needsSave = true;
    }
    if (verifiedPayload.picture && !(user as any).avatar) {
      (user as any).avatar = verifiedPayload.picture;
      needsSave = true;
    }
    if (needsSave) {
      await user.save();
    }
  }

  const tokens = await generateAccessAndRefreshTokens(user._id.toString());
  const loggedInUser = await User.findById(user._id).select('-password -refreshToken');

  return { user: loggedInUser, ...tokens };
}

export async function searchUsersService(currentUserId: string, query: string) {
  const sanitizedQuery = query.trim();
  if (!sanitizedQuery) return [];

  return User.find({
    _id: { $ne: currentUserId },
    $or: [
      { username: { $regex: sanitizedQuery, $options: 'i' } },
      { fullName: { $regex: sanitizedQuery, $options: 'i' } },
      { email: { $regex: sanitizedQuery, $options: 'i' } },
    ],
  })
    .select('username fullName email')
    .limit(10);
}
