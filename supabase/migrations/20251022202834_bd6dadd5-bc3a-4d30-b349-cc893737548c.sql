-- Drop existing policy
DROP POLICY IF EXISTS "Users can view device config" ON device_config;

-- Recreate policy with developer role included
CREATE POLICY "Users can view device config" 
ON device_config 
FOR SELECT 
USING (
  (EXISTS (
    SELECT 1 FROM device_access da 
    WHERE da.user_id = auth.uid() 
    AND da.devid = device_config.devid
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR has_role(auth.uid(), 'developer'::app_role)
);