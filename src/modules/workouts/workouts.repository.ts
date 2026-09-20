import { query } from "../../config/db.js";
import { makeId } from "../../common/utils/crypto.util.js";
import { DEFAULT_PLANS, type PlanKey, type WorkoutExercise } from "./workouts.defaults.js";

export interface WorkoutPlanRow {
  id: string;
  gym_id: string;
  member_id: string | null;
  title: string;
  goal: string | null;
  content_json: string;
  created_by_user_id: string | null;
  created_at: string;
}

export interface WorkoutLogRow {
  id: string;
  workout_plan_id: string;
  log_date: string;
  exercise_index: number;
  exercise_name: string;
  completed: boolean;
  completed_at: string;
}

export const workoutsRepository = {
  async listPresets(gymId: string) {
    return query(
      `SELECT * FROM workout_plans WHERE gym_id = $1 AND member_id IS NULL`,
      [gymId],
    );
  },

  async getPresetByKey(gymId: string, planKey: PlanKey) {
    const rows = await query(
      `SELECT * FROM workout_plans WHERE gym_id = $1 AND member_id IS NULL AND title = $2 LIMIT 1`,
      [gymId, planKey],
    );
    return rows[0] ?? null;
  },

  async getById(id: string, gymId: string) {
    const rows = await query(
      `SELECT * FROM workout_plans WHERE id = $1 AND gym_id = $2 LIMIT 1`,
      [id, gymId],
    );
    return rows[0] ?? null;
  },

  async upsertPreset(input: {
    gymId: string;
    planKey: PlanKey;
    goal: string;
    exercises: WorkoutExercise[];
    createdByUserId?: string | null;
  }) {
    const existing = await this.getPresetByKey(input.gymId, input.planKey);

    if (existing) {
      await query(`UPDATE workout_plans SET goal = $1, content_json = $2 WHERE id = $3`, [
        input.goal,
        JSON.stringify(input.exercises),
        (existing as Record<string, unknown>).id,
      ]);
      return this.getById((existing as Record<string, unknown>).id as string, input.gymId);
    }

    const id = makeId();
    await query(
      `INSERT INTO workout_plans (id, gym_id, member_id, title, goal, content_json, created_by_user_id, created_at)
       VALUES ($1, $2, NULL, $3, $4, $5, $6, NOW())`,
      [id, input.gymId, input.planKey, input.goal, JSON.stringify(input.exercises), input.createdByUserId ?? null],
    );
    return this.getById(id, input.gymId);
  },

  async materializePreset(gymId: string, planKey: PlanKey) {
    const existing = await this.getPresetByKey(gymId, planKey);
    if (existing) return existing;

    const goal = planKey.split("_").slice(0, -1).join("_");
    return this.upsertPreset({ gymId, planKey, goal, exercises: DEFAULT_PLANS[planKey], createdByUserId: null });
  },

  async deleteAllPresets(gymId: string) {
    await query(`DELETE FROM workout_plans WHERE gym_id = $1 AND member_id IS NULL`, [gymId]);
  },

  async createMemberPlan(input: {
    gymId: string;
    memberId: string;
    title: string;
    goal: string;
    exercises: WorkoutExercise[];
  }) {
    const id = makeId();
    await query(
      `INSERT INTO workout_plans (id, gym_id, member_id, title, goal, content_json, created_by_user_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NULL, NOW())`,
      [id, input.gymId, input.memberId, input.title, input.goal, JSON.stringify(input.exercises)],
    );
    return this.getById(id, input.gymId);
  },

  async listMemberPlans(gymId: string, memberId: string) {
    return query(
      `SELECT * FROM workout_plans WHERE gym_id = $1 AND member_id = $2 ORDER BY created_at DESC`,
      [gymId, memberId],
    );
  },

  async upsertLog(input: {
    gymId: string;
    memberId: string;
    workoutPlanId: string;
    logDate: string;
    exerciseIndex: number;
    exerciseName: string;
    completed: boolean;
  }) {
    await query(
      `INSERT INTO workout_logs
       (id, gym_id, member_id, workout_plan_id, log_date, exercise_index, exercise_name, completed, completed_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       ON CONFLICT (member_id, workout_plan_id, log_date, exercise_index)
       DO UPDATE SET completed = EXCLUDED.completed, exercise_name = EXCLUDED.exercise_name, completed_at = NOW()`,
      [
        makeId(),
        input.gymId,
        input.memberId,
        input.workoutPlanId,
        input.logDate,
        input.exerciseIndex,
        input.exerciseName,
        input.completed,
      ],
    );
  },

  async listLogsForMemberDate(memberId: string, workoutPlanId: string, logDate: string) {
    return query(
      `SELECT * FROM workout_logs WHERE member_id = $1 AND workout_plan_id = $2 AND log_date = $3`,
      [memberId, workoutPlanId, logDate],
    );
  },

  async getAdherenceForGym(gymId: string, fromDate: string, toDate: string) {
    return query(
      `
      SELECT
        wl.member_id,
        u.full_name AS member_name,
        wl.log_date,
        SUM(CASE WHEN wl.completed THEN 1 ELSE 0 END) AS completed_count
      FROM workout_logs wl
      JOIN members m ON m.id = wl.member_id
      JOIN users u ON u.id = m.user_id
      WHERE wl.gym_id = $1 AND wl.log_date BETWEEN $2 AND $3
      GROUP BY wl.member_id, u.full_name, wl.log_date
      ORDER BY wl.log_date DESC, u.full_name ASC
      `,
      [gymId, fromDate, toDate],
    );
  },

  async getAdherenceForMember(gymId: string, memberId: string, fromDate: string, toDate: string) {
    return query(
      `
      SELECT log_date, SUM(CASE WHEN completed THEN 1 ELSE 0 END) AS completed_count
      FROM workout_logs
      WHERE gym_id = $1 AND member_id = $2 AND log_date BETWEEN $3 AND $4
      GROUP BY log_date
      ORDER BY log_date DESC
      `,
      [gymId, memberId, fromDate, toDate],
    );
  },
};