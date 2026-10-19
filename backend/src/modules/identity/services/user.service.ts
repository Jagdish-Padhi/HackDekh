import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcrypt';
import axios from 'axios';
import User from '../models/user.model.ts';
import PendingUser from '../models/pendingUser.model.ts';
import { ApiError } from '../../../shared/errors/apiError.ts';
import { verifyFirebaseIdToken } from '../../../infrastructure/external/firebase.ts';
import { sendEmailVerificationEmail, sendPasswordResetEmail } from '../../../infrastructure/email/email.service.ts';

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

  if (!username || !email || !fullName || !password) {
    throw new ApiError(400, 'All fields (username, email, fullName, password) are required');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedUsername = username.toLowerCase().trim();

  // 1. Check if an active, verified user already exists
  const existedUser = await User.findOne({
    $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
  });

  if (existedUser) {
    throw new ApiError(409, 'An account with this email or username already exists. Please sign in.');
  }

  // 2. Check if username is reserved by another pending user with a different email
  const pendingWithUsername = await PendingUser.findOne({
    username: normalizedUsername,
    email: { $ne: normalizedEmail },
    verificationExpiry: { $gt: new Date() },
  });

  if (pendingWithUsername) {
    throw new ApiError(409, 'Username is currently reserved by another pending registration.');
  }

  // 3. Generate secure verification token and hash password
  const rawVerificationToken = randomBytes(32).toString('hex');
  const hashedVerificationToken = createHash('sha256').update(rawVerificationToken).digest('hex');
  const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const hashedPassword = await bcrypt.hash(password, 10);

  // 4. Upsert pending registration (allows re-registering or updating details prior to verification)
  await PendingUser.findOneAndUpdate(
    { email: normalizedEmail },
    {
      fullName: fullName.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      verificationToken: hashedVerificationToken,
      verificationExpiry: tokenExpiry,
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  // 5. Send verification email asynchronously so SMTP handshake latency never blocks the HTTP response
  const frontendUrl = process.env.FRONTEND_URL || 'https://hackdekh.jdecodes.tech';
  const verificationLink = `${frontendUrl}/verify-email?token=${rawVerificationToken}`;
  sendEmailVerificationEmail({
    to: normalizedEmail,
    fullName: fullName.trim(),
    verificationLink,
  }).catch((err: any) => {
    console.error(`[Email] Failed to dispatch verification email to ${normalizedEmail}:`, err.message);
  });

  return {
    username: normalizedUsername,
    email: normalizedEmail,
    fullName: fullName.trim(),
  };
}

export async function verifyEmailService(rawToken: string) {
  if (!rawToken) {
    throw new ApiError(400, 'Verification token is required');
  }

  const hashedToken = createHash('sha256').update(rawToken).digest('hex');

  // 1. Check PendingUser collection
  const pending = await PendingUser.findOne({
    verificationToken: hashedToken,
    verificationExpiry: { $gt: new Date() },
  });

  if (pending) {
    // Ensure no conflict occurred while pending
    const existingUser = await User.findOne({
      $or: [{ email: pending.email }, { username: pending.username }],
    });

    if (existingUser) {
      await PendingUser.deleteOne({ _id: pending._id });
      throw new ApiError(409, 'An account with this email or username already exists. Please sign in.');
    }

    // Create user only now upon confirmed verification
    const newUser = new User({
      fullName: pending.fullName,
      email: pending.email,
      username: pending.username,
      password: pending.password,
      authProvider: 'local',
      isEmailVerified: true,
    });

    await newUser.save({ validateBeforeSave: false });
    await PendingUser.deleteOne({ _id: pending._id });

    const tokens = await generateAccessAndRefreshTokens(newUser._id.toString());
    const loggedInUser = await User.findById(newUser._id).select('-password -refreshToken');

    return { user: loggedInUser, ...tokens };
  }

  // 2. Check legacy unverified user in User collection (for backward compatibility)
  const legacyUser = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: new Date() },
  });

  if (legacyUser) {
    (legacyUser as any).isEmailVerified = true;
    (legacyUser as any).emailVerificationToken = undefined;
    (legacyUser as any).emailVerificationExpiry = undefined;
    await legacyUser.save();

    const tokens = await generateAccessAndRefreshTokens(legacyUser._id.toString());
    const loggedInUser = await User.findById(legacyUser._id).select('-password -refreshToken');

    return { user: loggedInUser, ...tokens };
  }

  throw new ApiError(400, 'Invalid or expired verification token. If your account is already active, please log in.');
}

export async function resendVerificationService(email: string) {
  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check PendingUser collection
  const pending = await PendingUser.findOne({ email: normalizedEmail });
  if (pending) {
    const rawVerificationToken = randomBytes(32).toString('hex');
    const hashedVerificationToken = createHash('sha256').update(rawVerificationToken).digest('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    pending.verificationToken = hashedVerificationToken;
    pending.verificationExpiry = tokenExpiry;
    await pending.save();

    const frontendUrl = process.env.FRONTEND_URL || 'https://hackdekh.jdecodes.tech';
    const verificationLink = `${frontendUrl}/verify-email?token=${rawVerificationToken}`;

    sendEmailVerificationEmail({
      to: pending.email,
      fullName: pending.fullName,
      verificationLink,
    }).catch((err: any) => {
      console.error(`[Email] Failed to resend verification email to ${pending.email}:`, err.message);
    });

    return { message: 'A fresh verification link has been sent to your email.' };
  }

  // 2. Check legacy unverified user in User collection
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    if ((existingUser as any).isEmailVerified) {
      throw new ApiError(400, 'This email address is already verified. Please sign in.');
    }

    const rawVerificationToken = randomBytes(32).toString('hex');
    const hashedVerificationToken = createHash('sha256').update(rawVerificationToken).digest('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    (existingUser as any).emailVerificationToken = hashedVerificationToken;
    (existingUser as any).emailVerificationExpiry = tokenExpiry;
    await existingUser.save();

    const frontendUrl = process.env.FRONTEND_URL || 'https://hackdekh.jdecodes.tech';
    const verificationLink = `${frontendUrl}/verify-email?token=${rawVerificationToken}`;

    sendEmailVerificationEmail({
      to: existingUser.email,
      fullName: existingUser.fullName,
      verificationLink,
    }).catch((err: any) => {
      console.error(`[Email] Failed to resend verification email to ${existingUser.email}:`, err.message);
    });

    return { message: 'A fresh verification link has been sent to your email.' };
  }

  throw new ApiError(404, 'No pending registration found for this email. Please sign up first.');
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
  if (email) queryConditions.push({ email: email.toLowerCase().trim() });
  if (username) queryConditions.push({ username: username.toLowerCase().trim() });

  if (queryConditions.length === 0) {
    throw new ApiError(400, 'Username or email is required');
  }

  const user = await User.findOne({ $or: queryConditions });

  if (!user) {
    const pending = await PendingUser.findOne({ $or: queryConditions });
    if (pending) {
      throw new ApiError(403, 'Your account is pending email verification. Please check your inbox to activate your account.');
    }
    throw new ApiError(404, 'User does not exist');
  }

  if (!(user as any).isEmailVerified) {
    throw new ApiError(403, 'Please verify your email address before logging in.');
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


export async function forgotPasswordService(email: string) {
  if (!email || !email.trim()) {
    throw new ApiError(400, 'Email address is required');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Find user by email
  const user = await User.findOne({ email: normalizedEmail });

  // For security best practices (preventing account enumeration), return success message
  // even if user doesn't exist, but only send email if user exists
  if (!user) {
    return {
      message: 'If an account with that email exists, password reset instructions have been sent.',
    };
  }

  // Generate secure reset token
  const rawResetToken = randomBytes(32).toString('hex');
  const hashedResetToken = createHash('sha256').update(rawResetToken).digest('hex');
  const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

  (user as any).passwordResetToken = hashedResetToken;
  (user as any).passwordResetExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  const frontendUrl = process.env.FRONTEND_URL || 'https://hackdekh.jdecodes.tech';
  const resetLink = `${frontendUrl}/reset-password?token=${rawResetToken}`;

  sendPasswordResetEmail({
    to: normalizedEmail,
    fullName: user.fullName || 'there',
    resetLink,
  }).catch((err: any) => {
    console.error('[Email] Failed to dispatch password reset email to %s: %s', normalizedEmail, err.message);
  });

  return {
    message: 'If an account with that email exists, password reset instructions have been sent.',
  };
}

export async function resetPasswordService(rawToken: string, newPassword: string) {
  if (!rawToken || !rawToken.trim()) {
    throw new ApiError(400, 'Password reset token is required');
  }

  if (!newPassword || newPassword.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters long');
  }

  const hashedToken = createHash('sha256').update(rawToken.trim()).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiry: { $gt: new Date() },
  });

  if (!user) {
    throw new ApiError(400, 'Password reset link is invalid or has expired. Please request a new one.');
  }

  // Hash new password and clear reset token & active refresh sessions
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  (user as any).passwordResetToken = undefined;
  (user as any).passwordResetExpiry = undefined;
  (user as any).refreshToken = undefined;

  await user.save({ validateBeforeSave: false });

  return {
    message: 'Your password has been reset successfully. Please log in with your new credentials.',
  };
}
