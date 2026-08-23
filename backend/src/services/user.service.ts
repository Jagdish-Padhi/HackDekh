import User from '../models/user.model.ts';
import { ApiError } from '../utils/apiError.ts';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { randomBytes } from 'crypto';

export async function generateAccessAndRefreshTokens(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const accessToken = (user as any).generateAccessToken();
  const refreshToken = (user as any).generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
}

export async function registerUserService(payload: {
  username: string;
  fullName: string;
  email: string;
  password: string;
}) {
  const { username, fullName, email, password } = payload;

  if ([fullName, email, username, password].some((f) => !f || String(f).trim() === '')) {
    throw new ApiError(400, 'All fields are required!');
  }

  const normalizedUsername = username.toLowerCase().trim();
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({
    $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
  });

  if (existingUser) {
    throw new ApiError(409, 'User with email or username already exists');
  }

  const user = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    password,
    username: normalizedUsername,
  });

  const createdUser = await User.findById(user._id).select('-password -refreshToken');
  if (!createdUser) {
    throw new ApiError(500, 'Something went wrong while registering user!');
  }

  return createdUser;
}

export async function loginUserService(payload: {
  username?: string;
  email?: string;
  password?: string;
}) {
  const { username, email, password } = payload;
  if (!(username || email) || !password) {
    throw new ApiError(400, 'Username/Email and password are required');
  }

  const queryConditions: any[] = [];
  if (username) queryConditions.push({ username: username.toLowerCase().trim() });
  if (email) queryConditions.push({ email: email.toLowerCase().trim() });

  const user = await User.findOne({ $or: queryConditions });

  if (!user) {
    throw new ApiError(404, 'User does not exist');
  }

  const isPasswordValid = await (user as any).isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid user credentials');
  }

  const tokens = await generateAccessAndRefreshTokens(user._id.toString());
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
    });
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
