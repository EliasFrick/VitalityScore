/**
 * Health Service
 * Main service for accessing health data from HealthKit
 */

import { NativeModules, Platform } from "react-native";
import AppleHealthKit, {
  HealthKitPermissions,
  HealthValue,
} from "react-native-health";
import { HealthMetrics } from '@/types/health';
import { HealthKitInitializationError } from '@/types/errors';
import {
  getRestingHeartRateData,
  getHeartRateVariabilityData,
  getVO2MaxData,
  getSleepAnalysisData,
  getTodaysStepCount,
} from './healthDataProviders';
import {
  getMonthlyWorkoutData,
  getTodaysWorkoutData,
} from './workoutDataProviders';
import {
  getHistoricalStepsData,
  getHistoricalHeartRateData,
  getHistoricalHRVData,
  getHistoricalSleepData,
  getHistoricalWorkoutData,
} from './historicalDataProviders';

// Workaround for react-native-health missing functions
if (Platform.OS === "ios" && NativeModules.AppleHealthKit) {
  for (let key of [
    "initHealthKit",
    "getRestingHeartRateSamples",
    "getHeartRateVariabilitySamples",
    "getVo2MaxSamples",
    "getSleepSamples",
    "getStepCount",
    "getSamples",
    "getAnchoredWorkouts",
  ]) {
    if (!(AppleHealthKit as any)[key] && NativeModules.AppleHealthKit[key]) {
      (AppleHealthKit as any)[key] = NativeModules.AppleHealthKit[key];
    }
  }
}

const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.HeartRateVariability,
      AppleHealthKit.Constants.Permissions.RestingHeartRate,
      AppleHealthKit.Constants.Permissions.Vo2Max,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.Workout,
    ],
    write: [],
  },
};

export class HealthService {
  private static instance: HealthService;
  private isHealthKitInitialized = false;

  private constructor() {}

  static getInstance(): HealthService {
    if (!HealthService.instance) {
      HealthService.instance = new HealthService();
    }
    return HealthService.instance;
  }

  async initialize(): Promise<boolean> {
    if (Platform.OS !== "ios") {
      return false;
    }

    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          this.isHealthKitInitialized = false;
          resolve(false);
        } else {
          this.isHealthKitInitialized = true;
          resolve(true);
        }
      });
    });
  }

  /**
   * Get all health metrics for fitness score calculation
   */
  async getAllHealthMetrics(): Promise<HealthMetrics> {
    if (!this.isHealthKitInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new HealthKitInitializationError("Failed to initialize HealthKit");
      }
    }

    try {
      const [
        restingHeartRate,
        heartRateVariability,
        vo2Max,
        sleepData,
        dailySteps,
        workoutData,
      ] = await Promise.all([
        getRestingHeartRateData(),
        getHeartRateVariabilityData(),
        getVO2MaxData(),
        getSleepAnalysisData(),
        getTodaysStepCount(),
        getMonthlyWorkoutData(),
      ]);

      return {
        restingHeartRate,
        heartRateVariability,
        vo2Max,
        deepSleepPercentage: sleepData.deepSleepPercentage,
        remSleepPercentage: sleepData.remSleepPercentage,
        sleepConsistency: sleepData.sleepConsistency,
        monthlyTrainingTime: workoutData.monthlyTrainingTime,
        trainingIntensity: workoutData.trainingIntensity,
        dailySteps,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current day's health metrics optimized for widget display
   */
  async getTodaysHealthMetrics(): Promise<{
    dailySteps: number;
    dailyTrainingTime: number;
    trainingIntensity: number;
    restingHeartRate: number;
    heartRateVariability: number;
  }> {
    if (!this.isHealthKitInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        return {
          dailySteps: 0,
          dailyTrainingTime: 0,
          trainingIntensity: 0,
          restingHeartRate: 0,
          heartRateVariability: 0,
        };
      }
    }

    try {
      const [
        dailySteps,
        todaysTraining,
        restingHeartRate,
        heartRateVariability,
      ] = await Promise.all([
        getTodaysStepCount(),
        getTodaysWorkoutData(),
        getRestingHeartRateData(),
        getHeartRateVariabilityData(),
      ]);

      return {
        dailySteps,
        dailyTrainingTime: todaysTraining.dailyTrainingTime,
        trainingIntensity: todaysTraining.trainingIntensity,
        restingHeartRate,
        heartRateVariability,
      };
    } catch (error) {
      return {
        dailySteps: 0,
        dailyTrainingTime: 0,
        trainingIntensity: 0,
        restingHeartRate: 0,
        heartRateVariability: 0,
      };
    }
  }

  /**
   * Get historical health data for trend analysis
   */
  async getHistoricalHealthData(days: number = 30): Promise<
    Array<{
      date: Date;
      stepsData: HealthValue[];
      heartRateData: HealthValue[];
      hrvData: HealthValue[];
      sleepData: any[];
    }>
  > {
    if (!this.isHealthKitInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new HealthKitInitializationError("Failed to initialize HealthKit");
      }
    }

    try {
      const [stepsData, heartRateData, hrvData, sleepData] = await Promise.all([
        getHistoricalStepsData(days),
        getHistoricalHeartRateData(days),
        getHistoricalHRVData(days),
        getHistoricalSleepData(days),
      ]);

      // Group data by date
      const dateGroups: {
        [dateString: string]: {
          date: Date;
          stepsData: HealthValue[];
          heartRateData: HealthValue[];
          hrvData: HealthValue[];
          sleepData: any[];
        };
      } = {};

      // Group steps by date
      stepsData.forEach((sample) => {
        const dateStr = new Date(sample.startDate).toDateString();
        if (!dateGroups[dateStr]) {
          dateGroups[dateStr] = {
            date: new Date(sample.startDate),
            stepsData: [],
            heartRateData: [],
            hrvData: [],
            sleepData: [],
          };
        }
        dateGroups[dateStr].stepsData.push(sample);
      });

      // Group heart rate by date
      heartRateData.forEach((sample) => {
        const dateStr = new Date(sample.startDate).toDateString();
        if (!dateGroups[dateStr]) {
          dateGroups[dateStr] = {
            date: new Date(sample.startDate),
            stepsData: [],
            heartRateData: [],
            hrvData: [],
            sleepData: [],
          };
        }
        dateGroups[dateStr].heartRateData.push(sample);
      });

      // Group HRV by date
      hrvData.forEach((sample) => {
        const dateStr = new Date(sample.startDate).toDateString();
        if (!dateGroups[dateStr]) {
          dateGroups[dateStr] = {
            date: new Date(sample.startDate),
            stepsData: [],
            heartRateData: [],
            hrvData: [],
            sleepData: [],
          };
        }
        dateGroups[dateStr].hrvData.push(sample);
      });

      // Group sleep by date
      sleepData.forEach((sample) => {
        const dateStr = new Date(sample.startDate).toDateString();
        if (!dateGroups[dateStr]) {
          dateGroups[dateStr] = {
            date: new Date(sample.startDate),
            stepsData: [],
            heartRateData: [],
            hrvData: [],
            sleepData: [],
          };
        }
        dateGroups[dateStr].sleepData.push(sample);
      });

      return Object.values(dateGroups).sort(
        (a, b) => b.date.getTime() - a.date.getTime()
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get comprehensive historical data including workouts
   */
  async getComprehensiveHistoricalData(days: number = 30): Promise<{
    historicalData: Array<{
      date: Date;
      stepsData: HealthValue[];
      heartRateData: HealthValue[];
      hrvData: HealthValue[];
      sleepData: any[];
    }>;
    workoutData: Array<{
      date: Date;
      duration: number;
      intensity: number;
    }>;
  }> {
    if (!this.isHealthKitInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new HealthKitInitializationError("Failed to initialize HealthKit");
      }
    }

    try {
      const [historicalData, workoutData] = await Promise.all([
        this.getHistoricalHealthData(days),
        getHistoricalWorkoutData(days),
      ]);

      return {
        historicalData,
        workoutData,
      };
    } catch (error) {
      throw error;
    }
  }
}

export default HealthService.getInstance();