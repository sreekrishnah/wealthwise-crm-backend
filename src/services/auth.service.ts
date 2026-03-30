

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { UserModel } from "../models/user.model.js";
import { OrganizationModel } from "../models/organization.model.js";
import { environment } from "../config/environment.js";
import { logger } from "../utils/logger.js";
import type { ServiceResult } from "../domain/interfaces/index.js";

const SERVICE_NAME = "AUTH_SERVICE";

interface LoginResult {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    orgId: string;
    orgName: string;
  };
}

export async function loginUser(email: string, password: string): Promise<ServiceResult<LoginResult>> {
  logger.info(`${SERVICE_NAME}_LOGIN_ATTEMPT - EMAIL : ${email}`);

  const existingUser = await UserModel.findOne({ email: email.toLowerCase() });

  if (!existingUser) {
    logger.warn(`${SERVICE_NAME}_USER_NOT_FOUND - EMAIL : ${email}`);
    return { success: false, error: "Invalid email or password.", code: 401 };
  }

  if (!existingUser.isActive) {
    logger.warn(`${SERVICE_NAME}_INACTIVE_USER - ${existingUser._id}`);
    return { success: false, error: "Account is deactivated. Contact your administrator.", code: 403 };
  }

  const isPasswordValid = await bcrypt.compare(password, existingUser.passwordHash);

  if (!isPasswordValid) {
    logger.warn(`${SERVICE_NAME}_INVALID_PASSWORD - ${existingUser._id}`);
    return { success: false, error: "Invalid email or password.", code: 401 };
  }

  const parentOrganization = await OrganizationModel.findById(existingUser.orgId);
  if (!parentOrganization) {
    logger.error(`${SERVICE_NAME}_ORG_NOT_FOUND - ID : ${existingUser.orgId}`);
    return { success: false, error: "Associated organization not found.", code: 404 };
  }

  if (!parentOrganization.isActive) {
    logger.warn(`${SERVICE_NAME}_INACTIVE_ORG - ${existingUser.orgId}`);
    return { success: false, error: "Organization is not active. Contact support.", code: 403 };
  }

  const tokenPayload = {
    userId: existingUser._id.toString(),
    orgId: existingUser.orgId.toString(),
    role: existingUser.role,
    email: existingUser.email,
    name: existingUser.name,
  };

  const signedToken = jwt.sign(tokenPayload, environment.JWT_SECRET, {
    expiresIn: environment.JWT_EXPIRY as any,
  });

  existingUser.lastLoginAt = new Date();
  await existingUser.save();

  logger.info(`${SERVICE_NAME}_LOGIN_SUCCESS - ${existingUser._id}`);

  return {
    success: true,
    data: {
      token: signedToken,
      user: {
        id: existingUser._id.toString(),
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        orgId: existingUser.orgId.toString(),
        orgName: parentOrganization.name,
      },
    },
  };
}

export async function registerUser(
  orgId: string,
  name: string,
  email: string,
  phone: string,
  password: string,
  role: string
): Promise<ServiceResult<{ id: string }>> {
  logger.info(`${SERVICE_NAME}_REGISTER_ATTEMPT - EMAIL : ${email}`);

  // 1. Check if user already exists
  const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return { success: false, error: "Email is already registered.", code: 409 };
  }

  // 2. Ensure organization exists OR create a default one for SaaS onboarding
  let targetOrgId = orgId;
  const isValidObjectId = mongoose.Types.ObjectId.isValid(orgId);
  const orgExists = isValidObjectId ? await OrganizationModel.exists({ _id: orgId }) : null;

  if (!orgExists) {
    logger.info(`${SERVICE_NAME}_ORG_CREATION_STARTED - REASON : ${isValidObjectId ? "ID_NOT_FOUND" : "INVALID_ID_PLACEHOLDER"}`);
    const companySubdomain = email.split("@")[1]?.split(".")[0] || "NewOrg";
    const newOrg = await OrganizationModel.create({
      name: `${companySubdomain.toUpperCase()} Advisors`,
      sebiRegistrationNumber: `TMP_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      contactEmail: email.toLowerCase(),
      contactPhone: phone,
      isActive: true,
      billingPlan: "starter",
    });
    targetOrgId = newOrg._id.toString();
  }

  // 3. Hash password and create user
  const SALT_ROUNDS = 12;
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const createdUser = await UserModel.create({
    orgId: targetOrgId,
    name,
    email: email.toLowerCase(),
    phone,
    passwordHash: hashedPassword,
    role,
    isActive: true,
  });

  logger.info(`${SERVICE_NAME}_REGISTER_SUCCESS - ${createdUser._id} in ORG : ${targetOrgId}`);

  return { success: true, data: { id: createdUser._id.toString() } };
}
