BEGIN;

-- CreateEnum
CREATE TYPE "exercise_equipment_type" AS ENUM ('BODYWEIGHT', 'BARBELL', 'DUMBBELL', 'KETTLEBELL', 'CABLE_MACHINE', 'SELECTORIZED_MACHINE', 'PLATE_LOADED_MACHINE', 'ASSISTED_MACHINE', 'RESISTANCE_BAND', 'OTHER');

-- CreateEnum
CREATE TYPE "exercise_measurement_mode" AS ENUM ('REPS', 'DURATION');

-- CreateEnum
CREATE TYPE "exercise_load_mode" AS ENUM ('NONE', 'EXTERNAL_TOTAL', 'PER_HAND', 'ADDED_BODYWEIGHT', 'ASSISTANCE');

-- CreateEnum
CREATE TYPE "exercise_muscle_role" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "exercise_media_type" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "cloudinary_delivery_type" AS ENUM ('UPLOAD', 'PRIVATE', 'AUTHENTICATED');

-- CreateTable
CREATE TABLE "exercises" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "equipment_type" "exercise_equipment_type" NOT NULL,
    "measurement_mode" "exercise_measurement_mode" NOT NULL,
    "load_mode" "exercise_load_mode" NOT NULL,
    "load_note" TEXT,
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "muscle_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "muscle_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_muscles" (
    "exercise_id" UUID NOT NULL,
    "muscle_group_id" UUID NOT NULL,
    "role" "exercise_muscle_role" NOT NULL,

    CONSTRAINT "exercise_muscles_pkey" PRIMARY KEY ("exercise_id","muscle_group_id")
);

-- CreateTable
CREATE TABLE "exercise_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exercise_id" UUID NOT NULL,
    "type" "exercise_media_type" NOT NULL,
    "cloudinary_cloud_name" TEXT NOT NULL,
    "cloudinary_public_id" TEXT NOT NULL,
    "cloudinary_delivery_type" "cloudinary_delivery_type" NOT NULL DEFAULT 'UPLOAD',
    "cloudinary_version" BIGINT,
    "cloudinary_format" TEXT,
    "position" INTEGER NOT NULL,
    "alt_text" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exercises_archived_at_name_id_idx" ON "exercises"("archived_at", "name", "id");

-- CreateIndex
CREATE UNIQUE INDEX "muscle_groups_slug_key" ON "muscle_groups"("slug");

-- CreateIndex
CREATE INDEX "exercise_muscles_muscle_group_id_exercise_id_idx" ON "exercise_muscles"("muscle_group_id", "exercise_id");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_media_exercise_id_position_key" ON "exercise_media"("exercise_id", "position");

-- AddForeignKey
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_muscle_group_id_fkey" FOREIGN KEY ("muscle_group_id") REFERENCES "muscle_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_media" ADD CONSTRAINT "exercise_media_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Estas restricciones CHECK se mantienen en SQL porque Prisma 7 no las representa en el esquema.
ALTER TABLE "exercises"
    ADD CONSTRAINT "exercises_name_not_blank" CHECK ("name" ~ '[^[:space:]]');

ALTER TABLE "muscle_groups"
    ADD CONSTRAINT "muscle_groups_name_not_blank" CHECK ("name" ~ '[^[:space:]]'),
    ADD CONSTRAINT "muscle_groups_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

ALTER TABLE "exercise_media"
    ADD CONSTRAINT "exercise_media_position_nonnegative" CHECK ("position" >= 0),
    ADD CONSTRAINT "exercise_media_version_positive" CHECK ("cloudinary_version" IS NULL OR "cloudinary_version" > 0),
    ADD CONSTRAINT "exercise_media_cloud_name_format" CHECK ("cloudinary_cloud_name" ~ '^[a-zA-Z0-9_-]+$'),
    ADD CONSTRAINT "exercise_media_public_id_reference" CHECK (
        length(btrim("cloudinary_public_id")) > 0
        AND "cloudinary_public_id" = btrim("cloudinary_public_id")
        AND position('://' IN "cloudinary_public_id") = 0
        AND position(chr(92) IN "cloudinary_public_id") = 0
        AND left("cloudinary_public_id", 1) <> '/'
        AND right("cloudinary_public_id", 1) <> '/'
        AND "cloudinary_public_id" !~ '^[a-zA-Z]:/'
        AND "cloudinary_public_id" !~ '[?&#%<>]'
    ),
    ADD CONSTRAINT "exercise_media_format_valid" CHECK (
        "cloudinary_format" IS NULL OR "cloudinary_format" ~ '^[a-zA-Z0-9]+$'
    );

COMMIT;
