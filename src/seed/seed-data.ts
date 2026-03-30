

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { OrganizationModel } from "../models/organization.model.js";
import { UserModel } from "../models/user.model.js";
import { ClientModel } from "../models/client.model.js";
import { PortfolioHoldingModel } from "../models/portfolio-holding.model.js";
import { ReviewModel } from "../models/review.model.js";
import { ComplianceTaskModel } from "../models/compliance-task.model.js";
import { GoalModel } from "../models/goal.model.js";
import { AumSnapshotModel } from "../models/aum-snapshot.model.js";
import { UserRole, ClientSegment, RiskLevel, KycStatus, PipelineStage, ReviewStatus, ComplianceStatus, ComplianceType, GoalStatus, HoldingType } from "../domain/enums/index.js";
import { logger } from "../utils/logger.js";

const SERVICE_NAME = "SEED_DATA";

async function seedDatabase(): Promise<void> {
  logger.info(`${SERVICE_NAME}_STARTING - SEED : initializing`);

  await connectDatabase();

  // Clear existing data
  await Promise.all([
    OrganizationModel.deleteMany({}),
    UserModel.deleteMany({}),
    ClientModel.deleteMany({}),
    PortfolioHoldingModel.deleteMany({}),
    ReviewModel.deleteMany({}),
    ComplianceTaskModel.deleteMany({}),
    GoalModel.deleteMany({}),
    AumSnapshotModel.deleteMany({}),
  ]);

  logger.info(`${SERVICE_NAME}_CLEARED - SEED : existing data removed`);

  // Create organization
  const organization = await OrganizationModel.create({
    name: "WealthIntel Advisory Pvt. Ltd",
    sebiRegistrationNumber: "INP000012345",
    address: "Level 12, One BKC, Bandra Kurla Complex, Mumbai 400051",
    contactEmail: "admin@wealthintel.in",
    contactPhone: "+91-22-6123-4567",
    billingPlan: "professional",
    isActive: true,
    settings: {
      maxClients: 250,
      maxRmSeats: 5,
      aiAssistantEnabled: true,
      customPipelineStages: [],
    },
  });

  const orgId = organization._id;
  const hashedPassword = await bcrypt.hash("Demo@12345", 12);

  // Create users (RMs and admin)
  const adminUser = await UserModel.create({
    orgId, name: "Sanjay Kapoor", email: "admin@wealthintel.in",
    phone: "+91-98765-00001", passwordHash: hashedPassword, role: UserRole.ADMIN,
  });

  const rmPriya = await UserModel.create({
    orgId, name: "Priya Sharma", email: "priya@wealthintel.in",
    phone: "+91-98765-00002", passwordHash: hashedPassword, role: UserRole.RM,
  });

  const rmVikram = await UserModel.create({
    orgId, name: "Vikram Patel", email: "vikram@wealthintel.in",
    phone: "+91-98765-00003", passwordHash: hashedPassword, role: UserRole.RM,
  });

  const rmArjun = await UserModel.create({
    orgId, name: "Arjun Nair", email: "arjun@wealthintel.in",
    phone: "+91-98765-00004", passwordHash: hashedPassword, role: UserRole.RM,
  });

  logger.info(`${SERVICE_NAME}_USERS_CREATED - COUNT : 4`);

  // Create clients (matching frontend mock data)
  const clientDataList = [
    { name: "Rajesh Mehta", email: "rajesh@mehta.in", phone: "+91-98765-43210", segment: ClientSegment.UHNI, aum: 45200000, riskScore: 32, riskLevel: RiskLevel.LOW, kycStatus: KycStatus.VERIFIED, rmId: rmPriya._id, rmName: "Priya Sharma", nextReview: new Date("2026-03-28"), pipelineStage: PipelineStage.PREMIUM, joinedDate: new Date("2021-06-15") },
    { name: "Ananya Iyer", email: "ananya@iyer.co", phone: "+91-87654-32109", segment: ClientSegment.HNI, aum: 18700000, riskScore: 58, riskLevel: RiskLevel.MEDIUM, kycStatus: KycStatus.VERIFIED, rmId: rmVikram._id, rmName: "Vikram Patel", nextReview: new Date("2026-03-25"), pipelineStage: PipelineStage.ACTIVE, joinedDate: new Date("2022-01-10") },
    { name: "Kabir Singh", email: "kabir@singh.com", phone: "+91-76543-21098", segment: ClientSegment.HNI, aum: 12300000, riskScore: 74, riskLevel: RiskLevel.HIGH, kycStatus: KycStatus.PENDING, rmId: rmPriya._id, rmName: "Priya Sharma", nextReview: new Date("2026-03-22"), pipelineStage: PipelineStage.AT_RISK, joinedDate: new Date("2020-11-03") },
    { name: "Deepa Reddy", email: "deepa@reddy.in", phone: "+91-65432-10987", segment: ClientSegment.UHNI, aum: 67800000, riskScore: 21, riskLevel: RiskLevel.LOW, kycStatus: KycStatus.VERIFIED, rmId: rmArjun._id, rmName: "Arjun Nair", nextReview: new Date("2026-04-05"), pipelineStage: PipelineStage.PREMIUM, joinedDate: new Date("2019-08-22") },
    { name: "Suresh Kumar", email: "suresh@kumar.co", phone: "+91-54321-09876", segment: ClientSegment.RETAIL, aum: 3200000, riskScore: 45, riskLevel: RiskLevel.MEDIUM, kycStatus: KycStatus.EXPIRED, rmId: rmVikram._id, rmName: "Vikram Patel", nextReview: new Date("2026-03-30"), pipelineStage: PipelineStage.ACTIVE, joinedDate: new Date("2023-03-14") },
    { name: "Meera Joshi", email: "meera@joshi.in", phone: "+91-43210-98765", segment: ClientSegment.HNI, aum: 22100000, riskScore: 85, riskLevel: RiskLevel.CRITICAL, kycStatus: KycStatus.VERIFIED, rmId: rmArjun._id, rmName: "Arjun Nair", nextReview: new Date("2026-03-23"), pipelineStage: PipelineStage.AT_RISK, joinedDate: new Date("2021-02-28") },
    { name: "Aditya Rao", email: "aditya@rao.com", phone: "+91-32109-87654", segment: ClientSegment.RETAIL, aum: 5600000, riskScore: 38, riskLevel: RiskLevel.LOW, kycStatus: KycStatus.VERIFIED, rmId: rmPriya._id, rmName: "Priya Sharma", nextReview: new Date("2026-04-10"), pipelineStage: PipelineStage.ACTIVE, joinedDate: new Date("2022-09-05") },
    { name: "Nisha Gupta", email: "nisha@gupta.in", phone: "+91-21098-76543", segment: ClientSegment.HNI, aum: 15400000, riskScore: 62, riskLevel: RiskLevel.MEDIUM, kycStatus: KycStatus.PENDING, rmId: rmVikram._id, rmName: "Vikram Patel", nextReview: new Date("2026-03-26"), pipelineStage: PipelineStage.KYC_DONE, joinedDate: new Date("2023-07-19") },
  ];

  const createdClients = await ClientModel.insertMany(
    clientDataList.map((clientData) => ({ ...clientData, orgId }))
  );

  logger.info(`${SERVICE_NAME}_CLIENTS_CREATED - COUNT : ${createdClients.length}`);

  // Create portfolio holdings
  const holdingsData = [
    { clientId: createdClients[0]._id, name: "HDFC Mid-Cap Opportunities", type: HoldingType.MUTUAL_FUND, value: 2450000, allocation: 12.8, costBasis: 2105000, gainLoss: 345000, gainLossPercent: 16.4, units: 1200, purchaseDate: new Date("2022-06-15") },
    { clientId: createdClients[0]._id, name: "ICICI Prudential Bluechip", type: HoldingType.MUTUAL_FUND, value: 3200000, allocation: 16.7, costBasis: 2680000, gainLoss: 520000, gainLossPercent: 19.4, units: 800, purchaseDate: new Date("2021-03-10") },
    { clientId: createdClients[0]._id, name: "Reliance Industries", type: HoldingType.EQUITY, value: 1800000, allocation: 9.4, costBasis: 1920000, gainLoss: -120000, gainLossPercent: -6.3, units: 150, purchaseDate: new Date("2023-01-20") },
    { clientId: createdClients[0]._id, name: "SBI Fixed Deposit", type: HoldingType.FIXED_DEPOSIT, value: 5000000, allocation: 26.1, costBasis: 4650000, gainLoss: 350000, gainLossPercent: 7.5, units: 1, purchaseDate: new Date("2023-06-01") },
    { clientId: createdClients[0]._id, name: "Sovereign Gold Bond", type: HoldingType.GOLD, value: 2100000, allocation: 11.0, costBasis: 1820000, gainLoss: 280000, gainLossPercent: 15.4, units: 50, purchaseDate: new Date("2022-11-15") },
    { clientId: createdClients[1]._id, name: "Tata Digital India Fund", type: HoldingType.MUTUAL_FUND, value: 1400000, allocation: 7.3, costBasis: 1485000, gainLoss: -85000, gainLossPercent: -5.7, units: 500, purchaseDate: new Date("2023-04-10") },
    { clientId: createdClients[1]._id, name: "LIC Jeevan Labh", type: HoldingType.INSURANCE, value: 1200000, allocation: 6.3, costBasis: 1105000, gainLoss: 95000, gainLossPercent: 8.6, units: 1, purchaseDate: new Date("2022-01-01") },
    { clientId: createdClients[1]._id, name: "PPFAS Flexi Cap", type: HoldingType.MUTUAL_FUND, value: 2000000, allocation: 10.4, costBasis: 1590000, gainLoss: 410000, gainLossPercent: 25.8, units: 600, purchaseDate: new Date("2021-09-15") },
  ];

  await PortfolioHoldingModel.insertMany(
    holdingsData.map((holdingData) => ({ ...holdingData, orgId }))
  );

  logger.info(`${SERVICE_NAME}_HOLDINGS_CREATED - COUNT : ${holdingsData.length}`);

  // Create reviews
  const reviewsData = [
    { clientId: createdClients[2]._id, clientName: "Kabir Singh", rmId: rmPriya._id, rmName: "Priya Sharma", date: new Date("2026-03-22"), status: ReviewStatus.SCHEDULED, notes: "Discuss portfolio rebalancing" },
    { clientId: createdClients[5]._id, clientName: "Meera Joshi", rmId: rmArjun._id, rmName: "Arjun Nair", date: new Date("2026-03-23"), status: ReviewStatus.SCHEDULED, notes: "Risk assessment review" },
    { clientId: createdClients[1]._id, clientName: "Ananya Iyer", rmId: rmVikram._id, rmName: "Vikram Patel", date: new Date("2026-03-25"), status: ReviewStatus.SCHEDULED },
    { clientId: createdClients[7]._id, clientName: "Nisha Gupta", rmId: rmVikram._id, rmName: "Vikram Patel", date: new Date("2026-03-26"), status: ReviewStatus.SCHEDULED },
    { clientId: createdClients[0]._id, clientName: "Rajesh Mehta", rmId: rmPriya._id, rmName: "Priya Sharma", date: new Date("2026-03-18"), status: ReviewStatus.COMPLETED },
    { clientId: createdClients[4]._id, clientName: "Suresh Kumar", rmId: rmVikram._id, rmName: "Vikram Patel", date: new Date("2026-03-15"), status: ReviewStatus.MISSED },
  ];

  await ReviewModel.insertMany(
    reviewsData.map((reviewData) => ({ ...reviewData, orgId }))
  );

  logger.info(`${SERVICE_NAME}_REVIEWS_CREATED - COUNT : ${reviewsData.length}`);

  // Create compliance tasks
  const complianceData = [
    { clientId: createdClients[4]._id, clientName: "Suresh Kumar", type: ComplianceType.KYC_RENEWAL, dueDate: new Date("2026-03-20"), status: ComplianceStatus.OVERDUE },
    { clientId: createdClients[2]._id, clientName: "Kabir Singh", type: ComplianceType.RISK_PROFILE, dueDate: new Date("2026-03-25"), status: ComplianceStatus.PENDING },
    { clientId: createdClients[7]._id, clientName: "Nisha Gupta", type: ComplianceType.KYC_RENEWAL, dueDate: new Date("2026-03-28"), status: ComplianceStatus.PENDING },
    { clientId: createdClients[5]._id, clientName: "Meera Joshi", type: ComplianceType.NOMINATION, dueDate: new Date("2026-03-19"), status: ComplianceStatus.OVERDUE },
    { clientId: createdClients[0]._id, clientName: "Rajesh Mehta", type: ComplianceType.RISK_PROFILE, dueDate: new Date("2026-03-15"), status: ComplianceStatus.COMPLETED },
  ];

  await ComplianceTaskModel.insertMany(
    complianceData.map((complianceEntry) => ({ ...complianceEntry, orgId }))
  );

  logger.info(`${SERVICE_NAME}_COMPLIANCE_CREATED - COUNT : ${complianceData.length}`);

  // Create goals
  const goalsData = [
    { clientId: createdClients[0]._id, clientName: "Rajesh Mehta", name: "Retirement Corpus", targetAmount: 80000000, currentAmount: 45200000, status: GoalStatus.ON_TRACK, deadline: new Date("2035-06-15") },
    { clientId: createdClients[1]._id, clientName: "Ananya Iyer", name: "Child Education", targetAmount: 25000000, currentAmount: 12400000, status: GoalStatus.ON_TRACK, deadline: new Date("2030-08-01") },
    { clientId: createdClients[5]._id, clientName: "Meera Joshi", name: "Home Purchase", targetAmount: 30000000, currentAmount: 8500000, status: GoalStatus.AT_RISK, deadline: new Date("2028-03-01") },
    { clientId: createdClients[3]._id, clientName: "Deepa Reddy", name: "Wealth Preservation", targetAmount: 100000000, currentAmount: 67800000, status: GoalStatus.ON_TRACK, deadline: new Date("2040-01-01") },
  ];

  await GoalModel.insertMany(
    goalsData.map((goalEntry) => ({ ...goalEntry, orgId }))
  );

  logger.info(`${SERVICE_NAME}_GOALS_CREATED - COUNT : ${goalsData.length}`);

  // Create AUM snapshots for charts
  const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const aumValues = [165, 172, 168, 178, 182, 186, 190];
  const inflowValues = [3.2, 2.8, 4.1, 3.5, 2.9, 3.8, 2.8];
  const outflowValues = [1.1, 1.5, 0.9, 1.3, 1.0, 0.8, 0.5];

  const snapshotData = months.map((month, index) => ({
    orgId,
    month,
    year: index < 4 ? 2025 : 2026,
    totalAum: aumValues[index] * 10000000,
    inflow: inflowValues[index] * 10000000,
    outflow: outflowValues[index] * 10000000,
    clientCount: 8,
  }));

  await AumSnapshotModel.insertMany(snapshotData);

  logger.info(`${SERVICE_NAME}_SNAPSHOTS_CREATED - COUNT : ${snapshotData.length}`);

  logger.info(`${SERVICE_NAME}_COMPLETED - SEED : all data seeded successfully`);
  logger.info(`\n  Login Credentials:`);
  logger.info(`  Admin: admin@wealthintel.in / Demo@12345`);
  logger.info(`  RM:    priya@wealthintel.in / Demo@12345`);
  logger.info(`  RM:    vikram@wealthintel.in / Demo@12345`);
  logger.info(`  RM:    arjun@wealthintel.in / Demo@12345\n`);

  await disconnectDatabase();
  process.exit(0);
}

seedDatabase().catch((seedError) => {
  logger.error(`${SERVICE_NAME}_FAILED - SEED : ${seedError}`);
  process.exit(1);
});
