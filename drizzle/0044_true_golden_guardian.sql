ALTER TABLE `features` ADD `coinCostPerUse` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `plans` ADD `firstSubscriptionBonusCoins` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `monthlyRenewalBonusCoins` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `points_transactions` ADD `featureId` varchar(50);--> statement-breakpoint
ALTER TABLE `points_transactions` ADD `paymentOrderId` varchar(100);