-- Update users table to match required schema
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS identity_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS dob text,
ADD COLUMN IF NOT EXISTS id_last4 text,
ADD COLUMN IF NOT EXISTS id_type text DEFAULT 'aadhaar',
ADD COLUMN IF NOT EXISTS id_masked text,
ADD COLUMN IF NOT EXISTS public_key text;

-- Add RLS policy to allow users to update their own profile
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can update their own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can view their own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

-- Ensure users are inserted when they sign up (if not already handled by a trigger)
-- This trigger handles the creation of a public.users row when a new user signs up via Supabase Auth
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, email, name, created_at)
  values (new.id, new.email, new.raw_user_meta_data->>'name', now());
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
