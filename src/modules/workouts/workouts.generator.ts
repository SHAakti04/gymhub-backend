import type { WorkoutExercise, WorkoutGoal, WorkoutLevel } from "./workouts.defaults.js";

const POOL = {
  push: ["Bench Press", "Overhead Press", "Push-ups", "Dips", "Incline DB Press"],
  pull: ["Deadlift", "Pull-ups", "Barbell Row", "Lat Pulldown", "DB Curl"],
  legs: ["Squat", "Romanian Deadlift", "Lunges", "Leg Press", "Calf Raise"],
  core: ["Plank", "Hanging Leg Raise", "Russian Twist", "Cable Crunch"],
  cardio: ["Treadmill 20min", "Rowing 15min", "HIIT Bike 12min", "Jump Rope 10min"],
};

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

export function generateWorkoutPlan(goal: WorkoutGoal, level: WorkoutLevel): WorkoutExercise[] {
  const sets = level === "beginner" ? "3" : level === "intermediate" ? "4" : "5";
  const rest = goal === "strength" ? "150s" : goal === "weight_loss" ? "30s" : "60s";
  const reps = goal === "strength" ? "4-6" : goal === "weight_loss" ? "15-20" : "8-12";
  const count = level === "beginner" ? 5 : 6;

  let pool: string[];
  if (goal === "weight_loss") pool = [...POOL.cardio, ...POOL.core, ...POOL.legs];
  else if (goal === "strength") pool = [...POOL.push, ...POOL.pull, ...POOL.legs];
  else pool = [...POOL.push, ...POOL.pull, ...POOL.legs, ...POOL.core];

  return pickN(pool, count).map((exercise) => ({ exercise, sets, reps, rest }));
}