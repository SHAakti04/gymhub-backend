import { AppError } from "../../common/errors/app-error.js";
import { workoutsRepository, type WorkoutPlanRow } from "./workouts.repository.js";
import { DEFAULT_PLANS, PLAN_KEYS, type PlanKey, type WorkoutExercise, type WorkoutGoal, type WorkoutLevel } from "./workouts.defaults.js";
import { generateWorkoutPlan as buildGeneratedPlan } from "./workouts.generator.js";

function parseContent(row: WorkoutPlanRow): WorkoutExercise[] {
  try {
    const parsed = JSON.parse(row.content_json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapPlan(row: WorkoutPlanRow) {
  return {
    id: row.id,
    title: row.title,
    goal: row.goal,
    memberId: row.member_id,
    exercises: parseContent(row),
    createdAt: row.created_at,
  };
}

function assertPlanKey(planKey: string): planKey is PlanKey {
  if (!PLAN_KEYS.includes(planKey as PlanKey)) {
    throw new AppError(400, "VALIDATION_ERROR", "Unknown plan key");
  }
  return true;
}

export const workoutsService = {
  async getPresetPlans(gymId: string) {
    const rows = await workoutsRepository.listPresets(gymId);
    const byKey = new Map(rows.map((row) => [row.title as PlanKey, row]));

    const result = {} as Record<PlanKey, { id: string | null; exercises: WorkoutExercise[] }>;
    for (const key of PLAN_KEYS) {
      const row = byKey.get(key);
      result[key] = row ? { id: row.id, exercises: parseContent(row) } : { id: null, exercises: DEFAULT_PLANS[key] };
    }
    return result;
  },

  async savePreset(gymId: string, userId: string, planKey: string, exercises: WorkoutExercise[]) {
    assertPlanKey(planKey);
    if (!exercises.length) {
      throw new AppError(400, "VALIDATION_ERROR", "At least one exercise is required");
    }
    const goal = planKey.split("_").slice(0, -1).join("_");
    const row = await workoutsRepository.upsertPreset({
      gymId,
      planKey: planKey as PlanKey,
      goal,
      exercises,
      createdByUserId: userId,
    });
    return mapPlan(row!);
  },

  async resetPresets(gymId: string) {
    await workoutsRepository.deleteAllPresets(gymId);
    return { reset: true };
  },

  async generateAndSavePlan(gymId: string, memberId: string, input: { goal: WorkoutGoal; level: WorkoutLevel }) {
    const exercises = buildGeneratedPlan(input.goal, input.level);
    const title = `${input.goal.replace("_", " ")} plan (${input.level})`;
    const row = await workoutsRepository.createMemberPlan({ gymId, memberId, title, goal: input.goal, exercises });
    return mapPlan(row!);
  },

  async getMyPlans(gymId: string, memberId: string) {
    const rows = await workoutsRepository.listMemberPlans(gymId, memberId);
    return rows.map(mapPlan);
  },

  async getPlan(gymId: string, id: string) {
    const row = await workoutsRepository.getById(id, gymId);
    if (!row) {
      throw new AppError(404, "NOT_FOUND", "Workout plan not found");
    }
    return mapPlan(row);
  },

  async toggleLog(
    gymId: string,
    memberId: string,
    planId: string,
    exerciseIndex: number,
    exerciseName: string,
    logDate: string,
    completed: boolean,
  ) {
    const plan = await workoutsRepository.getById(planId, gymId);
    if (!plan) {
      throw new AppError(404, "NOT_FOUND", "Workout plan not found");
    }
    await workoutsRepository.upsertLog({ gymId, memberId, workoutPlanId: planId, logDate, exerciseIndex, exerciseName, completed });
    return { saved: true };
  },

  async getTodayChecklist(memberId: string, planId: string, logDate: string) {
    const rows = await workoutsRepository.listLogsForMemberDate(memberId, planId, logDate);
    return rows.map((row) => ({ exerciseIndex: row.exercise_index, completed: Boolean(row.completed) }));
  },

  async togglePresetLog(
    gymId: string,
    memberId: string,
    planKey: string,
    exerciseIndex: number,
    exerciseName: string,
    logDate: string,
    completed: boolean,
  ) {
    assertPlanKey(planKey);
    const plan = await workoutsRepository.materializePreset(gymId, planKey as PlanKey);
    await workoutsRepository.upsertLog({
      gymId,
      memberId,
      workoutPlanId: plan!.id,
      logDate,
      exerciseIndex,
      exerciseName,
      completed,
    });
    return { saved: true, planId: plan!.id };
  },

  async getPresetChecklist(gymId: string, memberId: string, planKey: string, logDate: string) {
    assertPlanKey(planKey);
    const existing = await workoutsRepository.getPresetByKey(gymId, planKey as PlanKey);
    if (!existing) return [];
    return this.getTodayChecklist(memberId, existing.id, logDate);
  },

  async getAdherenceReport(gymId: string, fromDate: string, toDate: string) {
    const rows = await workoutsRepository.getAdherenceForGym(gymId, fromDate, toDate);
    return rows.map((row) => ({
      memberId: row.member_id,
      memberName: row.member_name,
      logDate: row.log_date,
      completedCount: Number(row.completed_count),
    }));
  },

  async getMyAdherence(gymId: string, memberId: string, fromDate: string, toDate: string) {
    const rows = await workoutsRepository.getAdherenceForMember(gymId, memberId, fromDate, toDate);
    return rows.map((row) => ({ logDate: row.log_date, completedCount: Number(row.completed_count) }));
  },
};