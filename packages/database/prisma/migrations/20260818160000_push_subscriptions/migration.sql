-- CreateTable
CREATE TABLE "PushSubscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failed_at" TIMESTAMP(3),
    CONSTRAINT "PushSubscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscriptions_endpoint_key" ON "PushSubscriptions"("endpoint");
CREATE INDEX "PushSubscriptions_user_id_idx" ON "PushSubscriptions"("user_id");

-- AddForeignKey
ALTER TABLE "PushSubscriptions" ADD CONSTRAINT "PushSubscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
