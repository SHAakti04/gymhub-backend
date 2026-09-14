export type WorkoutGoal = "muscle" | "weight_loss" | "strength";

export type WorkoutLevel = "beginner" | "intermediate" | "advanced";

export type PlanKey = `${WorkoutGoal}_${WorkoutLevel}`;



export interface WorkoutExercise {

  exercise: string;

  sets: string;

  reps: string;

  rest: string;

}



export const GOALS: WorkoutGoal[] = ["muscle", "weight_loss", "strength"];

export const LEVELS: WorkoutLevel[] = ["beginner", "intermediate", "advanced"];



export const PLAN_KEYS: PlanKey[] = GOALS.flatMap((goal) =>

  LEVELS.map((level) => `${goal}_${level}` as PlanKey),

);



export const DEFAULT_PLANS: Record<PlanKey, WorkoutExercise[]> = {

  muscle_beginner: [

    { exercise: "Goblet Squat", sets: "3", reps: "10-12", rest: "60s" },

    { exercise: "Dumbbell Bench Press", sets: "3", reps: "10-12", rest: "60s" },

    { exercise: "Lat Pulldown", sets: "3", reps: "10-12", rest: "60s" },

    { exercise: "Seated Shoulder Press", sets: "3", reps: "10-12", rest: "60s" },

    { exercise: "Bicep Curl", sets: "3", reps: "12-15", rest: "45s" },

  ],

  muscle_intermediate: [

    { exercise: "Bench Press", sets: "4", reps: "8-10", rest: "90s" },

    { exercise: "Squats", sets: "4", reps: "8-10", rest: "120s" },

    { exercise: "Deadlift", sets: "3", reps: "6-8", rest: "120s" },

    { exercise: "Overhead Press", sets: "3", reps: "8-10", rest: "90s" },

    { exercise: "Barbell Row", sets: "3", reps: "10-12", rest: "60s" },

    { exercise: "Bicep Curls", sets: "3", reps: "12-15", rest: "60s" },

  ],

  muscle_advanced: [

    { exercise: "Pause Bench Press", sets: "5", reps: "5", rest: "150s" },

    { exercise: "Front Squat", sets: "5", reps: "5", rest: "150s" },

    { exercise: "Romanian Deadlift", sets: "4", reps: "6", rest: "120s" },

    { exercise: "Weighted Pull-ups", sets: "4", reps: "6-8", rest: "120s" },

    { exercise: "Push Press", sets: "4", reps: "5", rest: "120s" },

    { exercise: "Barbell Row", sets: "4", reps: "8", rest: "90s" },

  ],

  weight_loss_beginner: [

    { exercise: "Brisk Walk Incline", sets: "1", reps: "20 min", rest: "—" },

    { exercise: "Bodyweight Squat", sets: "3", reps: "12", rest: "45s" },

    { exercise: "Wall Push-up", sets: "3", reps: "10", rest: "45s" },

    { exercise: "Glute Bridge", sets: "3", reps: "12", rest: "45s" },

    { exercise: "Plank Hold", sets: "3", reps: "20-30s", rest: "30s" },

  ],

  weight_loss_intermediate: [

    { exercise: "Burpees", sets: "3", reps: "15", rest: "30s" },

    { exercise: "Mountain Climbers", sets: "3", reps: "20", rest: "30s" },

    { exercise: "Jump Squats", sets: "3", reps: "15", rest: "45s" },

    { exercise: "Kettlebell Swings", sets: "3", reps: "20", rest: "30s" },

    { exercise: "Box Jumps", sets: "3", reps: "12", rest: "45s" },

    { exercise: "Battle Ropes", sets: "3", reps: "30s", rest: "30s" },

  ],

  weight_loss_advanced: [

    { exercise: "Sprint Intervals", sets: "8", reps: "30s on/30s off", rest: "—" },

    { exercise: "Thrusters", sets: "5", reps: "12", rest: "45s" },

    { exercise: "Burpee Box Jumps", sets: "5", reps: "10", rest: "45s" },

    { exercise: "KB Snatch", sets: "5", reps: "10/side", rest: "45s" },

    { exercise: "Rower Sprint", sets: "5", reps: "250m", rest: "60s" },

  ],

  strength_beginner: [

    { exercise: "Goblet Squat", sets: "3", reps: "8", rest: "90s" },

    { exercise: "Dumbbell Press", sets: "3", reps: "8", rest: "90s" },

    { exercise: "Trap-bar Deadlift", sets: "3", reps: "5", rest: "120s" },

    { exercise: "Inverted Row", sets: "3", reps: "8", rest: "60s" },

  ],

  strength_intermediate: [

    { exercise: "Back Squat", sets: "5", reps: "5", rest: "150s" },

    { exercise: "Bench Press", sets: "5", reps: "5", rest: "150s" },

    { exercise: "Deadlift", sets: "5", reps: "3", rest: "180s" },

    { exercise: "Overhead Press", sets: "5", reps: "5", rest: "120s" },

    { exercise: "Pull-ups", sets: "4", reps: "6-8", rest: "120s" },

  ],

  strength_advanced: [

    { exercise: "Back Squat", sets: "6", reps: "3", rest: "180s" },

    { exercise: "Bench Press", sets: "6", reps: "3", rest: "180s" },

    { exercise: "Deadlift", sets: "5", reps: "2", rest: "240s" },

    { exercise: "Weighted Pull-ups", sets: "5", reps: "5", rest: "150s" },

    { exercise: "Push Press", sets: "5", reps: "3", rest: "150s" },

  ],

};