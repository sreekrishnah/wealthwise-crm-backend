

import type { Request, Response, NextFunction } from "express";
import { loginUser, registerUser } from "../services/auth.service.js";
import { logAuditEvent } from "../services/audit.service.js";

export async function handleLogin(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = request.body;
    const loginResult = await loginUser(email, password);

    if (!loginResult.success) {
      response.status(loginResult.code || 401).json(loginResult);
      return;
    }

    await logAuditEvent({
      orgId: loginResult.data!.user.orgId,
      userId: loginResult.data!.user.id,
      action: "USER_LOGIN",
      resourceType: "auth",
      resourceId: loginResult.data!.user.id,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    response.json(loginResult);
  } catch (error) {
    next(error);
  }
}

export async function handleRegister(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const { orgId, name, email, phone, password, role } = request.body;
    const registerResult = await registerUser(orgId, name, email, phone, password, role);

    if (!registerResult.success) {
      response.status(registerResult.code || 400).json(registerResult);
      return;
    }

    response.status(201).json(registerResult);
  } catch (error) {
    next(error);
  }
}

export async function handleGetProfile(request: Request, response: Response): Promise<void> {
  response.json({
    success: true,
    data: request.user,
  });
}
