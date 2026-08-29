-- loss_and_damage.claim_recovery needs the reporting microservice to read
-- Issue.claimStatus/claimFiledAmount/claimRecoveredAmount, same as the other
-- public-schema tables granted in 20260827135826.
GRANT SELECT ON "public"."issues" TO "report_reader";
