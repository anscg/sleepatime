-- AlterTable
ALTER TABLE "User" ADD COLUMN     "wakatimeRefreshToken" TEXT,
ADD COLUMN     "wakatimeTokenExpires" TIMESTAMP(3),
ALTER COLUMN "wakatimeApiUrl" SET DEFAULT '';
