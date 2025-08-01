/**
 * Health Data Providers
 * Individual data fetching methods for specific health metrics
 */

import { NativeModules, Platform } from "react-native";
import AppleHealthKit, {
  HealthInputOptions,
  HealthValue,
} from "react-native-health";
import { HealthKitError, HealthKitDataError } from '@/types/errors';

/**
 * Get resting heart rate data from the last 7 days
 */
export async function getRestingHeartRateData(): Promise<number> {
  if (Platform.OS !== "ios") return 0;

  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      ascending: false,
      limit: 7,
    };

    AppleHealthKit.getRestingHeartRateSamples(
      options,
      (callbackError: string, results: HealthValue[]) => {
        if (callbackError) {
          resolve(0);
        } else {
          const averageRestingHeartRate =
            results.length > 0
              ? results.reduce((sum, sample) => sum + sample.value, 0) /
                results.length
              : 0;
          resolve(Math.round(averageRestingHeartRate));
        }
      }
    );
  });
}

/**
 * Get heart rate variability data from the last 7 days
 */
export async function getHeartRateVariabilityData(): Promise<number> {
  if (Platform.OS !== "ios") return 0;

  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      ascending: false,
      limit: 7,
    };

    AppleHealthKit.getHeartRateVariabilitySamples(
      options,
      (callbackError: string, results: HealthValue[]) => {
        if (callbackError) {
          resolve(0);
        } else {
          const averageHeartRateVariability =
            results.length > 0
              ? results.reduce((sum, sample) => sum + sample.value, 0) /
                results.length
              : 0;
          resolve(Math.round(averageHeartRateVariability));
        }
      }
    );
  });
}

/**
 * Get VO2 Max data from the last 30 days
 */
export async function getVO2MaxData(): Promise<number> {
  if (Platform.OS !== "ios") return 0;

  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      ascending: false,
      limit: 5,
    };

    AppleHealthKit.getVo2MaxSamples(
      options,
      (callbackError: string, results: HealthValue[]) => {
        if (callbackError) {
          resolve(0);
        } else {
          const averageVO2Max =
            results.length > 0
              ? results.reduce((sum, sample) => sum + sample.value, 0) /
                results.length
              : 0;
          resolve(Math.round(averageVO2Max * 10) / 10);
        }
      }
    );
  });
}

/**
 * Get sleep analysis data from the last 7 days
 */
export async function getSleepAnalysisData(): Promise<{
  deepSleepPercentage: number;
  remSleepPercentage: number;
  sleepConsistency: number;
}> {
  if (Platform.OS !== "ios") {
    return {
      deepSleepPercentage: 0,
      remSleepPercentage: 0,
      sleepConsistency: 0,
    };
  }

  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    };

    AppleHealthKit.getSleepSamples(
      options,
      (callbackError: string, results: any[]) => {
        if (callbackError) {
          resolve({
            deepSleepPercentage: 0,
            remSleepPercentage: 0,
            sleepConsistency: 0,
          });
        } else {
          let totalDeepSleep = 0;
          let totalRemSleep = 0;
          let totalSleep = 0;
          const sleepDurations: number[] = [];

          results.forEach((sample) => {
            const duration =
              new Date(sample.endDate).getTime() -
              new Date(sample.startDate).getTime();
            const hours = duration / (1000 * 60 * 60);

            totalSleep += hours;

            if (sample.value === "DEEP") {
              totalDeepSleep += hours;
            } else if (sample.value === "REM") {
              totalRemSleep += hours;
            }

            sleepDurations.push(hours);
          });

          const deepSleepPercentage =
            totalSleep > 0 ? (totalDeepSleep / totalSleep) * 100 : 0;
          const remSleepPercentage =
            totalSleep > 0 ? (totalRemSleep / totalSleep) * 100 : 0;

          // Calculate sleep consistency (lower standard deviation = better consistency)
          const averageSleep =
            sleepDurations.length > 0
              ? sleepDurations.reduce((a, b) => a + b, 0) /
                sleepDurations.length
              : 0;
          const variance =
            sleepDurations.length > 0
              ? sleepDurations.reduce(
                  (sum, duration) => sum + Math.pow(duration - averageSleep, 2),
                  0
                ) / sleepDurations.length
              : 0;
          const standardDeviation = Math.sqrt(variance);
          const sleepConsistency = Math.max(0, 100 - standardDeviation * 20);

          resolve({
            deepSleepPercentage: Math.round(deepSleepPercentage * 10) / 10,
            remSleepPercentage: Math.round(remSleepPercentage * 10) / 10,
            sleepConsistency: Math.round(sleepConsistency),
          });
        }
      }
    );
  });
}

/**
 * Get today's step count
 */
export async function getTodaysStepCount(): Promise<number> {
  if (Platform.OS !== "ios") return 0;

  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      date: new Date().toISOString(),
    };

    AppleHealthKit.getStepCount(
      options,
      (callbackError: string, results: HealthValue) => {
        if (callbackError) {
          resolve(0);
        } else {
          resolve(results.value || 0);
        }
      }
    );
  });
}