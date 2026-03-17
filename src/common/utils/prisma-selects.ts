export const userProfileInclude = {
  trainerProfile: true,
  studentProfile: true,
} as const;

export const workoutPlanInclude = {
  trainer: {
    select: { id: true, fullName: true, email: true, username: true, avatarUrl: true },
  },
  student: {
    select: { id: true, fullName: true, email: true, username: true, avatarUrl: true },
  },
  days: {
    orderBy: { order: 'asc' as const },
    include: {
      exercises: {
        orderBy: { order: 'asc' as const },
        include: { exerciseLibrary: true },
      },
    },
  },
} as const;

export const workoutSessionInclude = {
  workoutPlan: {
    select: { id: true, title: true, visibility: true, trainerId: true, studentId: true },
  },
  workoutDay: {
    include: {
      exercises: {
        orderBy: { order: 'asc' as const },
      },
    },
  },
  sets: {
    orderBy: { order: 'asc' as const },
    include: {
      workoutExercise: true,
    },
  },
} as const;

export const postInclude = {
  user: {
    select: { id: true, fullName: true, username: true, avatarUrl: true },
  },
  workoutSession: {
    select: { id: true, status: true, finishedAt: true, workoutPlanId: true },
  },
  comments: {
    orderBy: { createdAt: 'desc' as const },
    take: 3,
    include: {
      user: {
        select: { id: true, fullName: true, username: true, avatarUrl: true },
      },
    },
  },
  likes: {
    select: { userId: true },
  },
  _count: {
    select: { likes: true, comments: true },
  },
} as const;
