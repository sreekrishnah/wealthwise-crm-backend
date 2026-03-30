

import type { Request, Response, NextFunction } from "express";
import {
  getClientsByOrganization,
  getClientById,
  createClient,
  updateClient,
  getClientsByPipelineStage,
  moveClientPipelineStage,
} from "../services/client.service.js";
import { getGoals } from "../services/goal.service.js";
import { getPortfolioHoldings, getAssetAllocation } from "../services/portfolio.service.js";
import { getReviews } from "../services/review.service.js";
import { getComplianceTasks } from "../services/compliance.service.js";
import { logAuditEvent } from "../services/audit.service.js";

export async function handleGetClients(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const { segment, riskLevel, kycStatus, pipelineStage, search, page, limit } = request.query;

    const clientsResult = await getClientsByOrganization({
      orgId,
      segment: segment as string,
      riskLevel: riskLevel as string,
      kycStatus: kycStatus as string,
      pipelineStage: pipelineStage as string,
      search: search as string,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 50,
    });

    response.json(clientsResult);
  } catch (error) {
    next(error);
  }
}

export async function handleGetClientById(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const clientResult = await getClientById(orgId, (request.params.id as string));

    if (!clientResult.success) {
      response.status(clientResult.code || 404).json(clientResult);
      return;
    }

    response.json(clientResult);
  } catch (error) {
    next(error);
  }
}

export async function handleCreateClient(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const createResult = await createClient(orgId, request.body);

    if (createResult.success) {
      await logAuditEvent({
        orgId,
        userId: request.user!.userId,
        action: "CLIENT_CREATED",
        resourceType: "client",
        resourceId: createResult.data!._id.toString(),
        ipAddress: request.ip,
      });
    }

    response.status(201).json(createResult);
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateClient(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const updateResult = await updateClient(orgId, (request.params.id as string), request.body);

    if (!updateResult.success) {
      response.status(updateResult.code || 400).json(updateResult);
      return;
    }

    await logAuditEvent({
      orgId,
      userId: request.user!.userId,
      action: "CLIENT_UPDATED",
      resourceType: "client",
      resourceId: (request.params.id as string),
      details: { updatedFields: Object.keys(request.body) },
      ipAddress: request.ip,
    });

    response.json(updateResult);
  } catch (error) {
    next(error);
  }
}

export async function handleGetClientPortfolio(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const [holdingsResult, allocationResult] = await Promise.all([
      getPortfolioHoldings(orgId, (request.params.id as string)),
      getAssetAllocation(orgId, (request.params.id as string)),
    ]);

    response.json({
      success: true,
      data: {
        holdings: holdingsResult.data,
        allocation: allocationResult.data,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetClientReviews(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const reviewsResult = await getReviews(orgId, {
      clientId: (request.params.id as string),
      page: 1,
      limit: 20,
    });

    response.json(reviewsResult);
  } catch (error) {
    next(error);
  }
}

export async function handleGetClientGoals(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const goalsResult = await getGoals(orgId, (request.params.id as string));
    response.json(goalsResult);
  } catch (error) {
    next(error);
  }
}

export async function handleGetClientCompliance(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const complianceResult = await getComplianceTasks(orgId, {
      clientId: (request.params.id as string),
      page: 1,
      limit: 20,
    });

    response.json(complianceResult);
  } catch (error) {
    next(error);
  }
}

export async function handleGetPipelineStages(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const pipelineResult = await getClientsByPipelineStage(orgId);
    response.json(pipelineResult);
  } catch (error) {
    next(error);
  }
}

export async function handleMovePipelineStage(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = request.user!.orgId;
    const { clientId, newStage } = request.body;
    const moveResult = await moveClientPipelineStage(orgId, clientId, newStage);

    if (!moveResult.success) {
      response.status(moveResult.code || 400).json(moveResult);
      return;
    }

    await logAuditEvent({
      orgId,
      userId: request.user!.userId,
      action: "PIPELINE_STAGE_CHANGED",
      resourceType: "client",
      resourceId: clientId,
      details: { newStage },
      ipAddress: request.ip,
    });

    response.json(moveResult);
  } catch (error) {
    next(error);
  }
}
