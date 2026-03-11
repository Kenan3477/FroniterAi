UPDATE recordings SET "storageType" = 'twilio' WHERE "storageType" IS NULL OR "storageType" != 'twilio';
SELECT COUNT(*) as updated_recordings FROM recordings WHERE "storageType" = 'twilio';
\q