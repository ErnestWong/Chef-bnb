-- Phone sign-in: a user is identified by a verified phone number or an email
-- address, never neither. Chefs always have an email; guests may have only a phone.
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "phone_verified_at" TIMESTAMP(3);
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
ALTER TABLE "users" ADD CONSTRAINT "users_contact_check" CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL);
