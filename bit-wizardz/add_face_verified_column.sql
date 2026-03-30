-- Add face_verified column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS face_verified boolean DEFAULT false;
