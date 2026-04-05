import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface JWTPayload {
  id: string;
  email: string;
}

/**
 * Generate JWT token
 */
export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '7d', // Token expires in 7 days
  });
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Generate auth response with token
 */
export const generateAuthResponse = (user: any) => {
  const token = generateToken({
    id: user._id || user.id,
    email: user.email,
  });

  return {
    token,
    user: {
      id: user._id || user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      age: user.age,
      isActive: user.isActive,
    },
  };
};
