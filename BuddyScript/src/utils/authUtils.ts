import { ApiResponse } from "../types";
import { generateAuthResponse } from "./jwt";
import {  Response } from 'express';
import { config } from '../config/env';

interface AuthData {
    token: string;
    user: object;
}

export const sendTokenResponse = (
    user: any,
    statusCode: number, 
    res: Response,
    message: string
) => {
    const authData: AuthData = generateAuthResponse(user);

    const isProduction = config.nodeEnv === 'production';
    const secure = isProduction;
    const sameSite = isProduction ? config.cookieSameSite : 'lax';

    const cookieOptions = {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure,
        sameSite,
    };

    res.cookie('token', authData.token, cookieOptions);

    const response: ApiResponse = {
        success: true,
        message: message,
        data: authData.user,
        token: authData.token,
    };

    res.status(statusCode).json(response);
};
