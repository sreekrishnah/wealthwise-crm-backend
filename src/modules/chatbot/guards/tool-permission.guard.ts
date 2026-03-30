

import { UserRole } from "../../../domain/enums/index.js";
import { logger } from "../../../utils/logger.js";

const SERVICE_NAME = "TOOL_PERMISSION_GUARD";

interface ToolPermissionCheck {
  isAllowed: boolean;
  reason: string;
}

const ROLE_TOOL_PERMISSIONS: Record<string, string[]> = {
  [UserRole.ADMIN]: [
    "getClientList", "getClientDetail", "getPortfolio", "getReviews",
    "getCompliance", "getGoals", "getAnalytics", "scheduleReview",
    "createTask", "requestStatement",
  ],
  [UserRole.RM]: [
    "getClientList", "getClientDetail", "getPortfolio", "getReviews",
    "getCompliance", "getGoals", "scheduleReview", "createTask",
    "requestStatement",
  ],
  [UserRole.CLIENT]: [
    "getOwnProfile", "getOwnPortfolio", "getOwnReviews",
    "getOwnGoals", "getOwnCompliance", "requestStatement",
  ],
};

export function checkToolPermission(
  userRole: UserRole,
  toolName: string,
  targetClientId?: string,
  requestingUserId?: string
): ToolPermissionCheck {
  const allowedTools = ROLE_TOOL_PERMISSIONS[userRole] || [];

  if (!allowedTools.includes(toolName)) {
    logger.warn(
      `${SERVICE_NAME}_DENIED - ROLE : ${userRole} : TOOL : ${toolName}`
    );
    return {
      isAllowed: false,
      reason: `Tool '${toolName}' is not accessible for role '${userRole}'. Contact your administrator.`,
    };
  }

  // WHY: Client role can ONLY access own data — cross-client access is a compliance violation
  if (userRole === UserRole.CLIENT && targetClientId && targetClientId !== requestingUserId) {
    logger.warn(
      `${SERVICE_NAME}_CROSS_CLIENT_ACCESS_DENIED - USER : ${requestingUserId} : TARGET : ${targetClientId}`
    );
    return {
      isAllowed: false,
      reason: "You can only access your own account data.",
    };
  }

  return { isAllowed: true, reason: "" };
}
