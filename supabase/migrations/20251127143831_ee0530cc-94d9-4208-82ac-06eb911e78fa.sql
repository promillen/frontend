-- Remove uplink_count column from activity table
ALTER TABLE public.activity DROP COLUMN IF EXISTS uplink_count;