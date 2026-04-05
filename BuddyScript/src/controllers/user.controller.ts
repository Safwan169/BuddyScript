import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';

// @desc    Get all users
// @route   GET /api/users
// @access  Public
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  // Build filter
  const filter: any = {};
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }

  // Get users with pagination
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const response: ApiResponse = {
    success: true,
    message: 'Users retrieved successfully',
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  };

  res.status(200).json(response);
});

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Public
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const response: ApiResponse = {
    success: true,
    message: 'User retrieved successfully',
    data: user,
  };

  res.status(200).json(response);
});

// @desc    Create new user
// @route   POST /api/users
// @access  Private
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, email, age, isActive } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError(409, 'User with this email already exists');
  }

  // Create user (admin function - would need password in real scenario)
  const user = await User.create({
    firstName,
    lastName,
    email,
    password: 'temp123456', // In real app, you'd handle this differently
    age,
    isActive,
  });

  const response: ApiResponse = {
    success: true,
    message: 'User created successfully',
    data: user,
  };

  res.status(201).json(response);
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, email, age, isActive } = req.body;

  // Check if user exists
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // Check if email is being changed and if it's already taken
  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError(409, 'User with this email already exists');
    }
  }

  // Update user
  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    { firstName, lastName, email, age, isActive },
    { new: true, runValidators: true }
  );

  const response: ApiResponse = {
    success: true,
    message: 'User updated successfully',
    data: updatedUser,
  };

  res.status(200).json(response);
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Public
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  await User.findByIdAndDelete(req.params.id);

  const response: ApiResponse = {
    success: true,
    message: 'User deleted successfully',
    data: null,
  };

  res.status(200).json(response);
});

