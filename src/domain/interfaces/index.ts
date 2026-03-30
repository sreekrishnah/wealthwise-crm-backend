

import type { UserRole } from "../enums/index.js";

export interface AuthenticatedUser {
  readonly userId: string;
  readonly orgId: string;
  readonly role: UserRole;
  readonly email: string;
  readonly name: string;
}

export interface PaginationParams {
  readonly page: number;
  readonly limit: number;
}

export interface PaginatedResult<TItem> {
  readonly data: TItem[];
  readonly total: number;
  readonly page: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
}

export interface ServiceResult<TData> {
  readonly success: boolean;
  readonly data?: TData;
  readonly error?: string;
  readonly code?: number;
}

export interface KpiMetric {
  readonly label: string;
  readonly value: string;
  readonly change: number;
  readonly changeLabel: string;
  readonly icon: string;
}

export interface AumTrendPoint {
  readonly month: string;
  readonly aum: number;
}

export interface FlowDataPoint {
  readonly month: string;
  readonly inflow: number;
  readonly outflow: number;
}

export interface RmPerformanceEntry {
  readonly name: string;
  readonly aum: number;
  readonly clients: number;
}

export interface ProductAllocationEntry {
  readonly name: string;
  readonly value: number;
  readonly color: string;
}
