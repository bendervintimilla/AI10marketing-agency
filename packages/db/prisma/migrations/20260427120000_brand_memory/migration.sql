-- BrandMemory: per-tenant, per-brand resource store for AI generation pipelines.
-- Adds 3 tables (BrandMemory, BrandAsset, BrandMemoryEvent) and 2 enums.

-- CreateEnum
CREATE TYPE "BrandAssetType" AS ENUM (
    'LOGO',
    'LOGO_VARIANT',
    'PRODUCT_PHOTO',
    'LIFESTYLE_PHOTO',
    'BROLL_VIDEO',
    'FONT_FILE',
    'MOODBOARD',
    'TESTIMONIAL',
    'BRIEF_DOC',
    'REFERENCE_AD',
    'BRAND_GUIDELINES',
    'COLOR_SWATCH'
);

-- CreateEnum
CREATE TYPE "BrandMemoryAction" AS ENUM (
    'READ',
    'WRITE',
    'DELETE',
    'RAG_QUERY',
    'ASSET_UPLOAD',
    'ASSET_DELETE'
);

-- CreateTable
CREATE TABLE "BrandMemory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "visualIdentity" JSONB,
    "voiceProfile" JSONB,
    "productCatalog" JSONB,
    "audiencePersonas" JSONB,
    "competitorRefs" JSONB,
    "legalConstraints" JSONB,
    "designSystem" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAsset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandMemoryId" TEXT NOT NULL,
    "type" "BrandAssetType" NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "durationSec" DOUBLE PRECISION,
    "fileSizeBytes" INTEGER,
    "caption" TEXT,
    "tags" TEXT[],
    "usageRights" JSONB,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandMemoryEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandMemoryId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "BrandMemoryAction" NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandMemoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandMemory_brandId_key" ON "BrandMemory"("brandId");

-- CreateIndex
CREATE INDEX "BrandMemory_organizationId_brandId_idx" ON "BrandMemory"("organizationId", "brandId");

-- CreateIndex
CREATE INDEX "BrandAsset_organizationId_brandMemoryId_type_idx" ON "BrandAsset"("organizationId", "brandMemoryId", "type");

-- CreateIndex
CREATE INDEX "BrandAsset_brandMemoryId_createdAt_idx" ON "BrandAsset"("brandMemoryId", "createdAt");

-- CreateIndex
CREATE INDEX "BrandMemoryEvent_brandMemoryId_createdAt_idx" ON "BrandMemoryEvent"("brandMemoryId", "createdAt");

-- CreateIndex
CREATE INDEX "BrandMemoryEvent_organizationId_action_idx" ON "BrandMemoryEvent"("organizationId", "action");

-- AddForeignKey
ALTER TABLE "BrandMemory" ADD CONSTRAINT "BrandMemory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMemory" ADD CONSTRAINT "BrandMemory_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_brandMemoryId_fkey" FOREIGN KEY ("brandMemoryId") REFERENCES "BrandMemory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMemoryEvent" ADD CONSTRAINT "BrandMemoryEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMemoryEvent" ADD CONSTRAINT "BrandMemoryEvent_brandMemoryId_fkey" FOREIGN KEY ("brandMemoryId") REFERENCES "BrandMemory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
