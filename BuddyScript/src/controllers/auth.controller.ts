import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import { sendTokenResponse } from '../utils/authUtils';
import { config } from '../config/env';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError(409, 'User with this email already exists');
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
  });

  sendTokenResponse(user, 201, res, 'User registered successfully');
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError(400, 'Please provide email and password');
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new AppError(
      403,
      'Your account has been deactivated. Please contact support.'
    );
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new AppError(401, 'Invalid email or password');
  }

  sendTokenResponse(user, 200, res, 'Login successful');
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  const isProduction = config.nodeEnv === 'production';
  const secure = isProduction;
  const sameSite = isProduction ? config.cookieSameSite : 'lax';

  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure,
    sameSite,
  });

  const response: ApiResponse = {
    success: true,
    message: 'Logged out successfully',
    data: null,
  };

  res.status(200).json(response);
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?.id);

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const response: ApiResponse = {
    success: true,
    message: 'Profile retrieved successfully',
    data: user,
  };

  res.status(200).json(response);
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName } = req.body;

  const user = await User.findById(req.user?.id);

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;

  await user.save();

  const response: ApiResponse = {
    success: true,
    message: 'Profile updated successfully',
    data: user,
  };

  res.status(200).json(response);
});
