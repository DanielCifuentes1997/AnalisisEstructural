-- CreateEnum
CREATE TYPE "HousingType" AS ENUM ('CASA', 'APARTAMENTO');

-- CreateEnum
CREATE TYPE "Profession" AS ENUM ('ARQUITECTO', 'INGENIERO_CIVIL', 'INGENIERO_CIVIL_ESTRUCTURAS', 'INGENIERO_GEOTECNISTA', 'CONSTRUCTOR', 'TECNOLOGO_OBRAS_CIVILES', 'TECNICO_CONSTRUCCION', 'MAESTRO_DE_OBRA', 'ESTUDIANTE_ARQUITECTURA_INGENIERIA_CIVIL', 'OTRO');

-- AlterTable
ALTER TABLE "PropertyRequests" DROP COLUMN "structural_type",
ADD COLUMN     "address_text" TEXT NOT NULL,
ADD COLUMN     "housing_type" "HousingType" NOT NULL,
ADD COLUMN     "reporter_name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "VolunteerProfiles" ADD COLUMN     "full_name" TEXT NOT NULL,
ADD COLUMN     "photo_url" TEXT NOT NULL,
DROP COLUMN "declared_profession",
ADD COLUMN     "declared_profession" "Profession" NOT NULL;
