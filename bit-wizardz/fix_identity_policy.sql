-- Allow users to insert their own profile row
-- This is necessary for 'upsert' to work if the row doesn't exist yet
CREATE POLICY "Users can insert their own profile" 
ON public.users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Grant usage on sequence if there is any (unlikely for UUID but good practice)
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
