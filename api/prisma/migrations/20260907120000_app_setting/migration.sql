-- Owner-editable infra overrides (Brevo / Supabase / DocuSign).
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);
