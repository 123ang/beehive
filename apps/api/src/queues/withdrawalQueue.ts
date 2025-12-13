// ============================================
// WITHDRAWAL QUEUE
// Uses BullMQ with Redis for async withdrawal processing
// ============================================

import { Queue } from "bullmq";
import { redis } from "../lib/redis";

export interface WithdrawalJobData {
  withdrawalId: number;
  userId: number;
  memberId: number | null;
  walletAddress: string;
  currency: "USDT" | "BCC";
  amount: number;
}

// Create withdrawal queue
export const withdrawalQueue = new Queue<WithdrawalJobData>("withdrawals", {
  connection: {
    host: redis.options.host || "localhost",
    port: redis.options.port || 6379,
    // Use same Redis connection settings
    ...(redis.options.password && { password: redis.options.password }),
  },
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: "exponential",
      delay: 2000, // Start with 2 seconds, exponential backoff
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Queue event handlers
withdrawalQueue.on("error", (error) => {
  console.error("Withdrawal queue error:", error);
});

withdrawalQueue.on("waiting", (job) => {
  console.log(`Withdrawal job ${job.id} is waiting`);
});

withdrawalQueue.on("active", (job) => {
  console.log(`Processing withdrawal job ${job.id} for withdrawal ${job.data.withdrawalId}`);
});

withdrawalQueue.on("completed", (job) => {
  console.log(`Withdrawal job ${job.id} completed for withdrawal ${job.data.withdrawalId}`);
});

withdrawalQueue.on("failed", (job, err) => {
  console.error(`Withdrawal job ${job?.id} failed for withdrawal ${job?.data.withdrawalId}:`, err);
});

export default withdrawalQueue;

