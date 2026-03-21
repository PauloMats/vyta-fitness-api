import {
  AssessmentStatus,
  AssessmentType,
  BodyCompositionMethod,
  NotificationType,
  PostVisibility,
  PrismaClient,
  TrainerStudentStatus,
  UserRole,
  UserStatus,
  WorkoutPlanVisibility,
  WorkoutSessionStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function cleanDatabase() {
  await prisma.$transaction([
    prisma.comment.deleteMany(),
    prisma.postLike.deleteMany(),
    prisma.post.deleteMany(),
    prisma.assessmentReport.deleteMany(),
    prisma.assessmentPhoto.deleteMany(),
    prisma.assessmentFitnessTest.deleteMany(),
    prisma.assessmentBodyComposition.deleteMany(),
    prisma.assessmentSkinfold.deleteMany(),
    prisma.assessmentCircumference.deleteMany(),
    prisma.assessmentVitals.deleteMany(),
    prisma.assessmentAnamnesis.deleteMany(),
    prisma.assessmentScreening.deleteMany(),
    prisma.physicalAssessment.deleteMany(),
    prisma.workoutSet.deleteMany(),
    prisma.workoutSession.deleteMany(),
    prisma.workoutExercise.deleteMany(),
    prisma.workoutDay.deleteMany(),
    prisma.workoutPlan.deleteMany(),
    prisma.exerciseLibrary.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.friendship.deleteMany(),
    prisma.trainerStudent.deleteMany(),
    prisma.deviceToken.deleteMany(),
    prisma.mediaAsset.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.trainerProfile.deleteMany(),
    prisma.studentProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function main() {
  await cleanDatabase();
  const passwordHash = await argon2.hash('Vyta@1234');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@vyta.app',
      username: 'vyta_admin',
      passwordHash,
      fullName: 'VYTA Admin',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      bio: 'Administrador da plataforma.',
    },
  });

  const trainerOne = await prisma.user.create({
    data: {
      email: 'ana.trainer@vyta.app',
      username: 'anafit',
      passwordHash,
      fullName: 'Ana Carvalho',
      role: UserRole.TRAINER,
      bio: 'Hipertrofia e mobilidade.',
      trainerProfile: {
        create: {
          specialties: ['Hipertrofia', 'Mobilidade', 'Pós-parto'],
          yearsExperience: 8,
          cref: '123456-G/CE',
          priceNote: 'A partir de R$ 249/mês',
        },
      },
    },
  });

  const trainerTwo = await prisma.user.create({
    data: {
      email: 'bruno.trainer@vyta.app',
      username: 'brunoperf',
      passwordHash,
      fullName: 'Bruno Lima',
      role: UserRole.TRAINER,
      bio: 'Corrida e performance.',
      trainerProfile: {
        create: {
          specialties: ['Performance', 'Corrida', 'Funcional'],
          yearsExperience: 10,
          cref: '654321-G/CE',
          priceNote: 'Consultoria premium',
        },
      },
    },
  });

  const students = await Promise.all(
    [
      {
        email: 'luana@vyta.app',
        username: 'luanafit',
        fullName: 'Luana Rocha',
        bio: 'Construindo consistência e força.',
        heightCm: 165,
        weightKg: 62,
        targetWeightKg: 59,
        limitations: 'Dor lombar leve.',
      },
      {
        email: 'caio@vyta.app',
        username: 'caiorun',
        fullName: 'Caio Menezes',
        bio: 'Corrida 10k e força funcional.',
        heightCm: 178,
        weightKg: 82,
        targetWeightKg: 78,
        limitations: 'Sem limitações.',
      },
      {
        email: 'marina@vyta.app',
        username: 'marifit',
        fullName: 'Marina Nogueira',
        bio: 'Foco em recomposição corporal.',
        heightCm: 170,
        weightKg: 71,
        targetWeightKg: 66,
        limitations: 'Joelho direito sensível.',
      },
      {
        email: 'pedro@vyta.app',
        username: 'pedrovyta',
        fullName: 'Pedro Gomes',
        bio: 'Retomando a rotina.',
        heightCm: 181,
        weightKg: 88,
        targetWeightKg: 82,
        limitations: 'Mobilidade de ombro reduzida.',
      },
      {
        email: 'bia@vyta.app',
        username: 'biamove',
        fullName: 'Beatriz Costa',
        bio: 'Treino eficiente para agenda corrida.',
        heightCm: 160,
        weightKg: 58,
        targetWeightKg: 56,
        limitations: 'Sem limitações.',
      },
    ].map((student) =>
      prisma.user.create({
        data: {
          email: student.email,
          username: student.username,
          passwordHash,
          fullName: student.fullName,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          bio: student.bio,
          studentProfile: {
            create: {
              currentHeightCm: student.heightCm,
              currentWeightKg: student.weightKg,
              targetWeightKg: student.targetWeightKg,
              limitations: student.limitations,
            },
          },
        },
      }),
    ),
  );

  const [luana, caio, marina, pedro, bia] = students;

  await prisma.trainerStudent.createMany({
    data: [
      { trainerId: trainerOne.id, studentId: luana.id, status: TrainerStudentStatus.ACTIVE, startedAt: new Date('2026-01-10T09:00:00.000Z') },
      { trainerId: trainerOne.id, studentId: marina.id, status: TrainerStudentStatus.ACTIVE, startedAt: new Date('2026-02-04T09:00:00.000Z') },
      { trainerId: trainerTwo.id, studentId: caio.id, status: TrainerStudentStatus.ACTIVE, startedAt: new Date('2026-02-12T09:00:00.000Z') },
      { trainerId: trainerTwo.id, studentId: pedro.id, status: TrainerStudentStatus.PENDING },
    ],
  });

  const [squat, bench, row, rdl, intervals] = await Promise.all([
    prisma.exerciseLibrary.create({
      data: {
        name: 'Agachamento Livre',
        slug: 'agachamento-livre',
        muscleGroup: 'Quadriceps',
        equipment: 'Barra',
        instructions: 'Pés na largura dos ombros, tronco firme e descida controlada.',
      },
    }),
    prisma.exerciseLibrary.create({
      data: {
        name: 'Supino Reto',
        slug: 'supino-reto',
        muscleGroup: 'Peito',
        equipment: 'Barra',
        instructions: 'Escápulas encaixadas, pés estáveis e movimento controlado.',
      },
    }),
    prisma.exerciseLibrary.create({
      data: {
        name: 'Remada Curvada',
        slug: 'remada-curvada',
        muscleGroup: 'Costas',
        equipment: 'Barra',
        instructions: 'Puxe a barra até o abdômen mantendo a coluna neutra.',
      },
    }),
    prisma.exerciseLibrary.create({
      data: {
        name: 'Levantamento Terra Romeno',
        slug: 'terra-romeno',
        muscleGroup: 'Posterior',
        equipment: 'Barra',
        instructions: 'Leve o quadril para trás e mantenha a barra próxima às pernas.',
      },
    }),
    prisma.exerciseLibrary.create({
      data: {
        name: 'Corrida Intervalada',
        slug: 'corrida-intervalada',
        muscleGroup: 'Cardio',
        equipment: 'Esteira',
        instructions: 'Alterne blocos fortes e moderados conforme o objetivo da sessão.',
      },
    }),
  ]);

  const planOne = await prisma.workoutPlan.create({
    data: {
      trainerId: trainerOne.id,
      studentId: luana.id,
      title: 'Hipertrofia Lower/Upper',
      description: 'Plano individual de 4 semanas.',
      goal: 'Aumentar força de membros inferiores e superiores.',
      visibility: WorkoutPlanVisibility.TRAINER_ONLY,
      days: {
        create: [
          {
            weekDay: 1,
            order: 1,
            title: 'Lower Body',
            focus: 'Quadriceps e glúteos',
            notes: 'Priorizar técnica na fase excêntrica.',
            estimatedMinutes: 55,
            exercises: {
              create: [
                {
                  order: 1,
                  exerciseLibraryId: squat.id,
                  nameSnapshot: squat.name,
                  muscleGroupSnapshot: squat.muscleGroup,
                  sets: 4,
                  reps: '8-10',
                  restSeconds: 90,
                  tempo: '3010',
                  rir: 2,
                },
                {
                  order: 2,
                  exerciseLibraryId: rdl.id,
                  nameSnapshot: rdl.name,
                  muscleGroupSnapshot: rdl.muscleGroup,
                  sets: 4,
                  reps: '10-12',
                  restSeconds: 75,
                  rir: 2,
                },
              ],
            },
          },
          {
            weekDay: 3,
            order: 2,
            title: 'Upper Body',
            focus: 'Peito e costas',
            estimatedMinutes: 50,
            exercises: {
              create: [
                {
                  order: 1,
                  exerciseLibraryId: bench.id,
                  nameSnapshot: bench.name,
                  muscleGroupSnapshot: bench.muscleGroup,
                  sets: 4,
                  reps: '6-8',
                  restSeconds: 90,
                  rir: 1,
                },
                {
                  order: 2,
                  exerciseLibraryId: row.id,
                  nameSnapshot: row.name,
                  muscleGroupSnapshot: row.muscleGroup,
                  sets: 4,
                  reps: '8-10',
                  restSeconds: 75,
                  rir: 2,
                },
              ],
            },
          },
        ],
      },
    },
    include: { days: { include: { exercises: true }, orderBy: { order: 'asc' } } },
  });

  const planTwo = await prisma.workoutPlan.create({
    data: {
      trainerId: trainerTwo.id,
      studentId: caio.id,
      title: 'Corrida 10K + Força',
      description: 'Base aeróbica com estabilidade.',
      goal: 'Melhorar pace e resistência.',
      visibility: WorkoutPlanVisibility.TRAINER_ONLY,
      days: {
        create: [
          {
            weekDay: 2,
            order: 1,
            title: 'Pista / Esteira',
            focus: 'Velocidade',
            estimatedMinutes: 45,
            exercises: {
              create: [
                {
                  order: 1,
                  exerciseLibraryId: intervals.id,
                  nameSnapshot: intervals.name,
                  muscleGroupSnapshot: intervals.muscleGroup,
                  sets: 6,
                  reps: '1 min forte / 1 min leve',
                  restSeconds: 60,
                },
              ],
            },
          },
        ],
      },
    },
  });

  const planThree = await prisma.workoutPlan.create({
    data: {
      trainerId: trainerOne.id,
      title: 'Template Full Body VYTA',
      description: 'Template público para onboarding.',
      goal: 'Condicionamento geral',
      visibility: WorkoutPlanVisibility.PUBLIC,
      isTemplate: true,
      days: {
        create: [
          {
            weekDay: 1,
            order: 1,
            title: 'Full Body A',
            focus: 'Corpo inteiro',
            estimatedMinutes: 40,
            exercises: {
              create: [
                {
                  order: 1,
                  exerciseLibraryId: squat.id,
                  nameSnapshot: squat.name,
                  muscleGroupSnapshot: squat.muscleGroup,
                  sets: 3,
                  reps: '10-12',
                  restSeconds: 60,
                },
                {
                  order: 2,
                  exerciseLibraryId: bench.id,
                  nameSnapshot: bench.name,
                  muscleGroupSnapshot: bench.muscleGroup,
                  sets: 3,
                  reps: '10-12',
                  restSeconds: 60,
                },
              ],
            },
          },
        ],
      },
    },
  });

  const lowerDay = planOne.days[0];
  const sessionOne = await prisma.workoutSession.create({
    data: {
      userId: luana.id,
      workoutPlanId: planOne.id,
      workoutDayId: lowerDay.id,
      status: WorkoutSessionStatus.COMPLETED,
      startedAt: new Date('2026-03-10T10:00:00.000Z'),
      finishedAt: new Date('2026-03-10T10:54:00.000Z'),
      durationSeconds: 3240,
      feelingPre: 4,
      feelingPost: 5,
      notes: 'Treino forte e consistente.',
      sets: {
        create: [
          {
            workoutExerciseId: lowerDay.exercises[0].id,
            order: 1,
            targetReps: 10,
            actualReps: 10,
            targetLoadKg: 40,
            actualLoadKg: 42.5,
            restSeconds: 90,
            completedAt: new Date('2026-03-10T10:12:00.000Z'),
          },
          {
            workoutExerciseId: lowerDay.exercises[1].id,
            order: 1,
            targetReps: 12,
            actualReps: 12,
            targetLoadKg: 35,
            actualLoadKg: 35,
            restSeconds: 75,
            completedAt: new Date('2026-03-10T10:24:00.000Z'),
          },
        ],
      },
    },
  });

  const cardioDay = await prisma.workoutDay.findFirstOrThrow({ where: { workoutPlanId: planTwo.id } });
  const sessionTwo = await prisma.workoutSession.create({
    data: {
      userId: caio.id,
      workoutPlanId: planTwo.id,
      workoutDayId: cardioDay.id,
      status: WorkoutSessionStatus.COMPLETED,
      startedAt: new Date('2026-03-11T06:00:00.000Z'),
      finishedAt: new Date('2026-03-11T06:38:00.000Z'),
      durationSeconds: 2280,
      feelingPre: 3,
      feelingPost: 5,
      notes: 'Consegui sustentar os tiros sem queda de ritmo.',
    },
  });

  const postOne = await prisma.post.create({
    data: {
      userId: luana.id,
      workoutSessionId: sessionOne.id,
      caption: 'Primeira semana concluída com carga subindo.',
      visibility: PostVisibility.FRIENDS,
    },
  });

  const postTwo = await prisma.post.create({
    data: {
      userId: caio.id,
      workoutSessionId: sessionTwo.id,
      caption: 'Tiros entregues. Próxima meta: baixar pace nos 5km.',
      visibility: PostVisibility.PUBLIC,
    },
  });

  await prisma.comment.createMany({
    data: [
      { postId: postOne.id, userId: trainerOne.id, text: 'Excelente execução. Mantém esse ritmo.' },
      { postId: postTwo.id, userId: trainerTwo.id, text: 'Boa. Na próxima sessão ajustamos a recuperação.' },
      { postId: postTwo.id, userId: bia.id, text: 'Mandou muito bem.' },
    ],
  });

  await prisma.postLike.createMany({
    data: [
      { postId: postOne.id, userId: trainerOne.id },
      { postId: postOne.id, userId: marina.id },
      { postId: postTwo.id, userId: trainerTwo.id },
      { postId: postTwo.id, userId: luana.id },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: luana.id,
        type: NotificationType.TRAINING_REMINDER,
        title: 'Treino de hoje',
        message: 'Seu treino Upper Body está programado para hoje às 19h.',
      },
      {
        userId: trainerOne.id,
        type: NotificationType.POST_COMMENT,
        title: 'Novo comentário no post',
        message: 'Luana recebeu um comentário no post vinculado ao treino.',
        data: { postId: postOne.id },
      },
      {
        userId: caio.id,
        type: NotificationType.SYSTEM,
        title: 'Meta atualizada',
        message: 'Seu plano Corrida 10K + Força recebeu novos ajustes.',
        data: { workoutPlanId: planTwo.id },
      },
      {
        userId: pedro.id,
        type: NotificationType.TRAINER_MESSAGE,
        title: 'Solicitação em análise',
        message: 'Bruno Lima está avaliando sua solicitação de acompanhamento.',
      },
      {
        userId: bia.id,
        type: NotificationType.FRIEND_REQUEST,
        title: 'Nova solicitação de amizade',
        message: 'Caio Menezes enviou uma solicitação de amizade.',
      },
    ],
  });

  await prisma.friendship.createMany({
    data: [
      { requesterId: luana.id, addresseeId: bia.id, pairKey: [luana.id, bia.id].sort().join(':'), status: 'ACCEPTED' },
      { requesterId: caio.id, addresseeId: bia.id, pairKey: [caio.id, bia.id].sort().join(':'), status: 'PENDING' },
      { requesterId: marina.id, addresseeId: luana.id, pairKey: [marina.id, luana.id].sort().join(':'), status: 'ACCEPTED' },
    ],
  });

  await prisma.deviceToken.createMany({
    data: [
      { userId: luana.id, token: 'device-token-luana', platform: 'ios' },
      { userId: caio.id, token: 'device-token-caio', platform: 'android' },
    ],
  });

  await prisma.mediaAsset.createMany({
    data: [
      {
        userId: trainerOne.id,
        kind: 'EXERCISE_IMAGE',
        provider: 's3',
        bucket: 'vyta-media',
        objectKey: 'exercises/agachamento-livre.jpg',
        url: 'https://cdn.vyta.app/exercises/agachamento-livre.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 240000,
      },
      {
        userId: luana.id,
        kind: 'AVATAR',
        provider: 's3',
        bucket: 'vyta-media',
        objectKey: 'avatars/luana.jpg',
        url: 'https://cdn.vyta.app/avatars/luana.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 128000,
      },
    ],
  });

  await prisma.physicalAssessment.create({
    data: {
      studentId: luana.id,
      trainerId: trainerOne.id,
      status: AssessmentStatus.COMPLETED,
      assessmentDate: new Date('2026-02-01T09:00:00.000Z'),
      assessmentType: AssessmentType.INITIAL,
      notes: 'Base inicial para hipertrofia e estabilidade lombar.',
      completedAt: new Date('2026-02-01T10:00:00.000Z'),
      screening: {
        create: {
          symptoms: 'Sem sinais agudos.',
          knownConditions: 'Dor lombar leve recorrente.',
          medications: 'Nenhuma.',
          riskFlags: ['low_back'],
          restrictions: 'Evitar pico de volume sem progressao.',
        },
      },
      anamnesis: {
        create: {
          objectivePrimary: 'Hipertrofia com consistencia',
          objectiveSecondary: 'Melhorar postura',
          activityLevel: 'moderado',
          sleepQuality: 'regular',
          stressLevel: 5,
          familyHistory: 'Historico familiar de hipertensao.',
          injuriesHistory: 'Lombalgia ocasional.',
          limitations: 'Evitar compressao excessiva.',
        },
      },
      vitals: {
        create: {
          weightKg: 62.0,
          heightCm: 165.0,
          bmi: 22.77,
          restingHeartRate: 64,
          systolicBp: 112,
          diastolicBp: 72,
        },
      },
      circumferences: {
        create: [
          { kind: 'WAIST', valueCm: 74.5, order: 1 },
          { kind: 'HIP', valueCm: 98.0, order: 2 },
          { kind: 'THIGH', valueCm: 57.4, order: 3, side: 'RIGHT' },
        ],
      },
      bodyComposition: {
        create: {
          method: BodyCompositionMethod.BIA,
          protocol: 'Bioimpedancia padrao',
          bodyFatPercent: 24.4,
          fatMassKg: 15.1,
          leanMassKg: 46.9,
          isComparable: true,
        },
      },
      report: {
        create: {
          summary: 'Boa base geral, com foco em consistencia e controle lombar.',
          recommendations: 'Progressao de carga gradual e fortalecimento de core.',
          warnings: 'Monitorar desconforto lombar em dias de hinge.',
          generatedAt: new Date('2026-02-01T10:05:00.000Z'),
        },
      },
    },
  });

  await prisma.physicalAssessment.create({
    data: {
      studentId: caio.id,
      trainerId: trainerTwo.id,
      status: AssessmentStatus.COMPLETED,
      assessmentDate: new Date('2026-02-15T08:30:00.000Z'),
      assessmentType: AssessmentType.INITIAL,
      notes: 'Entrada focada em corrida de 10km e composicao corporal.',
      completedAt: new Date('2026-02-15T09:10:00.000Z'),
      screening: {
        create: {
          symptoms: 'Sem sintomas limitantes.',
          knownConditions: 'Sem comorbidades relevantes.',
          medications: 'Nenhuma.',
          riskFlags: ['running_volume'],
        },
      },
      anamnesis: {
        create: {
          objectivePrimary: 'Melhorar pace de 10km',
          objectiveSecondary: 'Reduzir gordura corporal',
          activityLevel: 'alto',
          sleepQuality: 'boa',
          stressLevel: 4,
          familyHistory: 'Sem observacoes relevantes.',
        },
      },
      vitals: {
        create: {
          weightKg: 82.0,
          heightCm: 178.0,
          bmi: 25.88,
          restingHeartRate: 58,
          systolicBp: 118,
          diastolicBp: 76,
        },
      },
      circumferences: {
        create: [
          { kind: 'WAIST', valueCm: 84.2, order: 1 },
          { kind: 'CHEST', valueCm: 101.5, order: 2 },
        ],
      },
      bodyComposition: {
        create: {
          method: BodyCompositionMethod.BIA,
          protocol: 'Bioimpedancia atleta',
          bodyFatPercent: 19.4,
          fatMassKg: 15.9,
          leanMassKg: 66.1,
          isComparable: true,
        },
      },
    },
  });

  await prisma.physicalAssessment.create({
    data: {
      studentId: marina.id,
      trainerId: trainerOne.id,
      status: AssessmentStatus.COMPLETED,
      assessmentDate: new Date('2026-03-05T11:00:00.000Z'),
      assessmentType: AssessmentType.REASSESSMENT,
      notes: 'Reavaliacao apos ciclo inicial de recomposicao.',
      completedAt: new Date('2026-03-05T11:40:00.000Z'),
      vitals: {
        create: {
          weightKg: 70.4,
          heightCm: 170.0,
          bmi: 24.36,
          restingHeartRate: 66,
        },
      },
      circumferences: {
        create: [
          { kind: 'WAIST', valueCm: 77.8, order: 1 },
          { kind: 'HIP', valueCm: 102.1, order: 2 },
        ],
      },
      bodyComposition: {
        create: {
          method: BodyCompositionMethod.SKINFOLD_JP7,
          protocol: 'Jackson Pollock 7 dobras',
          equation: 'JP7',
          bodyFatPercent: 26.1,
          fatMassKg: 18.4,
          leanMassKg: 52.0,
          isComparable: true,
        },
      },
      fitnessTests: {
        create: [
          {
            category: 'MOBILITY',
            testCode: 'overhead-squat',
            name: 'Overhead Squat',
            rawValue: 'leve valgo dinamico',
            score: 'moderado',
          },
        ],
      },
      report: {
        create: {
          summary: 'Boa adesao ao ciclo inicial e melhora visivel na cintura.',
          recommendations: 'Manter progressao e elevar volume de gluteos/posterior.',
          generatedAt: new Date('2026-03-05T11:45:00.000Z'),
        },
      },
    },
  });

  console.log(`Seed concluido: ${admin.email}, ${trainerOne.email}, ${trainerTwo.email}, ${planThree.title}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
