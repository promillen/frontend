-- Update the user role to admin for testing
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'christoffer@clausenengineering.com');