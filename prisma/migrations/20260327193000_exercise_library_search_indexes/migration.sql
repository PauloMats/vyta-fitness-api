CREATE INDEX IF NOT EXISTS "ExerciseLibrary_primaryMuscles_gin_idx"
ON "ExerciseLibrary"
USING GIN ("primaryMuscles");

CREATE INDEX IF NOT EXISTS "ExerciseLibrary_secondaryMuscles_gin_idx"
ON "ExerciseLibrary"
USING GIN ("secondaryMuscles");

CREATE INDEX IF NOT EXISTS "ExerciseLibrary_equipmentList_gin_idx"
ON "ExerciseLibrary"
USING GIN ("equipmentList");

CREATE INDEX IF NOT EXISTS "ExerciseLibrary_tags_gin_idx"
ON "ExerciseLibrary"
USING GIN ("tags");
