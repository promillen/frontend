-- Add last_login column to profiles table
ALTER TABLE public.profiles
ADD COLUMN last_login timestamp with time zone;