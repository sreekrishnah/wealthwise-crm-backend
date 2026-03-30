

export enum ClientSegment {
  HNI = "HNI",
  UHNI = "UHNI",
  RETAIL = "Retail",
  CORPORATE = "Corporate",
}

export enum RiskLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum KycStatus {
  VERIFIED = "verified",
  PENDING = "pending",
  EXPIRED = "expired",
  REJECTED = "rejected",
}

export enum ReviewStatus {
  SCHEDULED = "scheduled",
  COMPLETED = "completed",
  MISSED = "missed",
}

export enum ComplianceStatus {
  PENDING = "pending",
  OVERDUE = "overdue",
  COMPLETED = "completed",
}

export enum ComplianceType {
  KYC_RENEWAL = "kyc_renewal",
  RISK_PROFILE = "risk_profile",
  NOMINATION = "nomination",
}

export enum GoalStatus {
  ON_TRACK = "on_track",
  AT_RISK = "at_risk",
  ACHIEVED = "achieved",
}

export enum PipelineStage {
  PROSPECT = "prospect",
  KYC_DONE = "kyc_done",
  ACTIVE = "active",
  PREMIUM = "premium",
  AT_RISK = "at_risk",
}

export enum UserRole {
  ADMIN = "admin",
  RM = "rm",
  CLIENT = "client",
}

export enum ChatMessageRole {
  USER = "user",
  ASSISTANT = "assistant",
  SYSTEM = "system",
}

export enum BillingPlan {
  STARTER = "starter",
  PROFESSIONAL = "professional",
  ENTERPRISE = "enterprise",
}

export enum HoldingType {
  MUTUAL_FUND = "Mutual Fund",
  EQUITY = "Equity",
  FIXED_DEPOSIT = "FD",
  GOLD = "Gold",
  INSURANCE = "Insurance",
  REAL_ESTATE = "Real Estate",
  CASH = "Cash",
  OTHER = "Other",
}
