-- Fix existing users without profiles and roles

-- Insert missing profiles for users who don't have them yet
INSERT INTO public.profiles (id, email, full_name)
SELECT 
  au.id, 
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'full_name', '')
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Insert missing user roles for users who don't have them
INSERT INTO public.user_roles (user_id, role)
SELECT 
  au.id,
  'user'::app_role
FROM auth.users au
LEFT JOIN public.user_roles ur ON au.id = ur.user_id
WHERE ur.id IS NULL;