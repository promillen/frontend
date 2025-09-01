-- Update all existing users to have developer role
UPDATE public.user_roles 
SET role = 'developer' 
WHERE role IN ('admin', 'moderator', 'user');