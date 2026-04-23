-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'CARRIER', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "companyName" TEXT,
    "dotNumber" TEXT,
    "mcNumber" TEXT,
    "hasCargoInsurance" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'customer',
    "fromZip" TEXT NOT NULL,
    "toZip" TEXT NOT NULL,
    "miles" INTEGER NOT NULL,
    "vehicle" TEXT NOT NULL,
    "vehicles" JSONB NOT NULL,
    "transportType" TEXT NOT NULL,
    "offer" DOUBLE PRECISION NOT NULL,
    "likelihood" INTEGER NOT NULL,
    "marketAvg" DOUBLE PRECISION NOT NULL,
    "recommendedMin" DOUBLE PRECISION NOT NULL,
    "recommendedMax" DOUBLE PRECISION NOT NULL,
    "pickupDate" TIMESTAMP(3),
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "source" TEXT DEFAULT 'quote-widget',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "draftId" TEXT,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "quoteId" TEXT,
    "customerFirstName" TEXT,
    "customerLastName" TEXT,
    "customerPhone" TEXT,
    "fromCity" TEXT NOT NULL,
    "toCity" TEXT NOT NULL,
    "vehicle" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "vehicleDetails" JSONB NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "miles" INTEGER NOT NULL,
    "transportType" TEXT NOT NULL,
    "pickupDate" TIMESTAMP(3) NOT NULL,
    "dropoffDate" TIMESTAMP(3) NOT NULL,
    "pickup" JSONB NOT NULL,
    "dropoff" JSONB NOT NULL,
    "pickupOriginType" TEXT NOT NULL,
    "dealerFirstName" TEXT,
    "dealerLastName" TEXT,
    "dealerPhone" TEXT,
    "auctionGatePass" TEXT,
    "auctionName" TEXT,
    "auctionBuyerNumber" TEXT,
    "privateFirstName" TEXT,
    "privateLastName" TEXT,
    "privatePhone" TEXT,
    "dropoffDestinationType" TEXT,
    "dropoffDealerFirstName" TEXT,
    "dropoffDealerLastName" TEXT,
    "dropoffDealerPhone" TEXT,
    "dropoffAuctionGatePass" TEXT,
    "dropoffAuctionName" TEXT,
    "dropoffAuctionBuyerNumber" TEXT,
    "dropoffPrivateFirstName" TEXT,
    "dropoffPrivateLastName" TEXT,
    "dropoffPrivatePhone" TEXT,
    "customerInstructions" TEXT,
    "notes" TEXT,
    "instructions" TEXT,
    "quote" JSONB NOT NULL,
    "scheduling" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "quote" JSONB NOT NULL,
    "pickup" JSONB NOT NULL,
    "dropoff" JSONB NOT NULL,
    "vehicleDetails" JSONB NOT NULL,
    "scheduling" JSONB NOT NULL,
    "instructions" TEXT,
    "pickupOriginType" TEXT,
    "dealerFirstName" TEXT,
    "dealerLastName" TEXT,
    "dealerPhone" TEXT,
    "auctionGatePass" TEXT,
    "auctionName" TEXT,
    "auctionBuyerNumber" TEXT,
    "privateFirstName" TEXT,
    "privateLastName" TEXT,
    "privatePhone" TEXT,
    "dropoffDestinationType" TEXT,
    "dropoffDealerFirstName" TEXT,
    "dropoffDealerLastName" TEXT,
    "dropoffDealerPhone" TEXT,
    "dropoffAuctionGatePass" TEXT,
    "dropoffAuctionName" TEXT,
    "dropoffAuctionBuyerNumber" TEXT,
    "dropoffPrivateFirstName" TEXT,
    "dropoffPrivateLastName" TEXT,
    "dropoffPrivatePhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "meta" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "street1" TEXT NOT NULL,
    "street2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "addressType" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "bookingId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "stripePaymentId" TEXT,
    "stripeCustomerId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarrierRating" (
    "id" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarrierRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Quote_userId_idx" ON "Quote"("userId");

-- CreateIndex
CREATE INDEX "Quote_userEmail_idx" ON "Quote"("userEmail");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE INDEX "Quote_createdAt_idx" ON "Quote"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_ref_key" ON "Booking"("ref");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_userEmail_idx" ON "Booking"("userEmail");

-- CreateIndex
CREATE INDEX "Booking_ref_idx" ON "Booking"("ref");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_createdAt_idx" ON "Booking"("createdAt");

-- CreateIndex
CREATE INDEX "Booking_quoteId_idx" ON "Booking"("quoteId");

-- CreateIndex
CREATE INDEX "Draft_userId_idx" ON "Draft"("userId");

-- CreateIndex
CREATE INDEX "Draft_userEmail_idx" ON "Draft"("userEmail");

-- CreateIndex
CREATE INDEX "Draft_status_idx" ON "Draft"("status");

-- CreateIndex
CREATE INDEX "Draft_createdAt_idx" ON "Draft"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_readAt_idx" ON "Notification"("readAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE INDEX "Address_isDefault_idx" ON "Address"("isDefault");

-- CreateIndex
CREATE INDEX "AccountEvent_userId_idx" ON "AccountEvent"("userId");

-- CreateIndex
CREATE INDEX "AccountEvent_eventType_idx" ON "AccountEvent"("eventType");

-- CreateIndex
CREATE INDEX "AccountEvent_createdAt_idx" ON "AccountEvent"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentTransaction_userId_idx" ON "PaymentTransaction"("userId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_bookingId_idx" ON "PaymentTransaction"("bookingId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");

-- CreateIndex
CREATE INDEX "PaymentTransaction_createdAt_idx" ON "PaymentTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "CarrierRating_carrierId_idx" ON "CarrierRating"("carrierId");

-- CreateIndex
CREATE INDEX "CarrierRating_customerId_idx" ON "CarrierRating"("customerId");

-- CreateIndex
CREATE INDEX "CarrierRating_rating_idx" ON "CarrierRating"("rating");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountEvent" ADD CONSTRAINT "AccountEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
