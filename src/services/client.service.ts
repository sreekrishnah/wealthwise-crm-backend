

import { ClientModel, type ClientDocument } from "../models/client.model.js";
import { logger } from "../utils/logger.js";
import type { PaginatedResult, ServiceResult } from "../domain/interfaces/index.js";

const SERVICE_NAME = "CLIENT_SERVICE";

interface ClientListFilters {
  orgId: string;
  segment?: string;
  riskLevel?: string;
  kycStatus?: string;
  pipelineStage?: string;
  search?: string;
  rmId?: string;
  page: number;
  limit: number;
}

export async function getClientsByOrganization(
  filters: ClientListFilters
): Promise<ServiceResult<PaginatedResult<ClientDocument>>> {
  logger.info(`${SERVICE_NAME}_FETCHING_CLIENTS - ORG : ${filters.orgId}`);

  const queryFilter: Record<string, unknown> = {
    orgId: filters.orgId,
    isActive: true,
  };

  if (filters.segment) {
    queryFilter.segment = filters.segment;
  }
  if (filters.riskLevel) {
    queryFilter.riskLevel = filters.riskLevel;
  }
  if (filters.kycStatus) {
    queryFilter.kycStatus = filters.kycStatus;
  }
  if (filters.pipelineStage) {
    queryFilter.pipelineStage = filters.pipelineStage;
  }
  if (filters.rmId) {
    queryFilter.rmId = filters.rmId;
  }
  if (filters.search) {
    queryFilter.$or = [
      { name: { $regex: filters.search, $options: "i" } },
      { email: { $regex: filters.search, $options: "i" } },
    ];
  }

  const skipCount = (filters.page - 1) * filters.limit;

  const [clientList, totalCount] = await Promise.all([
    ClientModel.find(queryFilter)
      .sort({ name: 1 })
      .skip(skipCount)
      .limit(filters.limit)
      .lean(),
    ClientModel.countDocuments(queryFilter),
  ]);

  const totalPages = Math.ceil(totalCount / filters.limit);

  logger.info(`${SERVICE_NAME}_FETCHED_CLIENTS - ORG : ${filters.orgId} : ${totalCount} total`);

  return {
    success: true,
    data: {
      data: clientList as any,
      total: totalCount,
      page: filters.page,
      totalPages,
      hasNextPage: filters.page < totalPages,
    },
  };
}

export async function getClientById(
  orgId: string,
  clientId: string
): Promise<ServiceResult<ClientDocument>> {
  logger.info(`${SERVICE_NAME}_FETCHING_CLIENT - ${clientId}`);

  const foundClient = await ClientModel.findOne({
    _id: clientId,
    orgId,
    isActive: true,
  });

  if (!foundClient) {
    logger.warn(`${SERVICE_NAME}_CLIENT_NOT_FOUND - ${clientId}`);
    return { success: false, error: "Client not found.", code: 404 };
  }

  return { success: true, data: foundClient };
}

export async function createClient(
  orgId: string,
  clientData: Partial<ClientDocument>
): Promise<ServiceResult<ClientDocument>> {
  logger.info(`${SERVICE_NAME}_CREATING_CLIENT - ORG : ${orgId}`);

  const createdClient = await ClientModel.create({
    ...clientData,
    orgId,
    isActive: true,
  });

  logger.info(`${SERVICE_NAME}_CLIENT_CREATED - ${createdClient._id}`);

  return { success: true, data: createdClient };
}

export async function updateClient(
  orgId: string,
  clientId: string,
  updateData: Partial<ClientDocument>
): Promise<ServiceResult<ClientDocument>> {
  logger.info(`${SERVICE_NAME}_UPDATING_CLIENT - ${clientId}`);

  const updatedClient = await ClientModel.findOneAndUpdate(
    { _id: clientId, orgId, isActive: true },
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!updatedClient) {
    return { success: false, error: "Client not found.", code: 404 };
  }

  logger.info(`${SERVICE_NAME}_CLIENT_UPDATED - ${clientId}`);

  return { success: true, data: updatedClient };
}

export async function getClientsByPipelineStage(
  orgId: string
): Promise<ServiceResult<Record<string, ClientDocument[]>>> {
  logger.info(`${SERVICE_NAME}_FETCHING_PIPELINE - ORG : ${orgId}`);

  const allActiveClients = await ClientModel.find({ orgId, isActive: true })
    .sort({ aum: -1 })
    .lean();

  const groupedByStage: Record<string, ClientDocument[]> = {};
  for (const singleClient of allActiveClients) {
    const stageKey = singleClient.pipelineStage;
    if (!groupedByStage[stageKey]) {
      groupedByStage[stageKey] = [];
    }
    groupedByStage[stageKey].push(singleClient as any);
  }

  return { success: true, data: groupedByStage };
}

export async function moveClientPipelineStage(
  orgId: string,
  clientId: string,
  newStage: string
): Promise<ServiceResult<ClientDocument>> {
  return updateClient(orgId, clientId, { pipelineStage: newStage } as Partial<ClientDocument>);
}
