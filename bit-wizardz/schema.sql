-- =============================================================
--  FastInn — Complete Database Schema
--  Run this in the Supabase SQL Editor (once, on a fresh project)
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. PROFILES TABLE
--    Single-device lock: tracks which device a user is logged
--    in on so simultaneous logins are blocked.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    active_device_id text,
    last_active     timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Allow service_role and authenticated to manage profiles
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;


-- ─────────────────────────────────────────────────────────────
-- 2. USERS TABLE
--    Extended guest profile: identity verification details,
--    face registration status, and device public key.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
    id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email               text,
    name                text,
    phone               text,
    dob                 text,                          -- stored as text (DD/MM/YYYY or YYYY-MM-DD)
    id_last4            text,                          -- last 4 digits of Aadhaar
    id_masked           text,                          -- e.g. "XXXX XXXX 1234"
    id_type             text DEFAULT 'aadhaar',        -- document type
    identity_verified   boolean DEFAULT false,
    face_verified       boolean DEFAULT false,
    public_key          text,                          -- ECDSA public key (JWK base64)
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own record"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own record"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own record"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;


-- ─────────────────────────────────────────────────────────────
-- 3. AUTO-CREATE USER ROW ON SIGN-UP
--    Inserts a row in public.users whenever a new auth user
--    is created (email/password or OAuth).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, email, name, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'name',
        now()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ─────────────────────────────────────────────────────────────
-- 4. CHECKINS TABLE
--    One row per check-in session.
--    Lifecycle: pending → verified → checked_out
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.checkins (
    id          bigserial PRIMARY KEY,
    session_id  text UNIQUE NOT NULL,           -- e.g. "BOOKING-4231"
    user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- linked after face verify
    status      text NOT NULL DEFAULT 'pending',-- 'pending' | 'verified' | 'checked_out'
    guest_name  text,
    room_no     text,
    nonce       text,                           -- one-time challenge (cleared after use)
    nonce_expires_at timestamptz,               -- 2-min expiry for replay prevention
    created_at  timestamptz DEFAULT now(),
    verified_at timestamptz,
    updated_at  timestamptz DEFAULT now()
);

-- No RLS needed (admin uses service_role; guests are anonymous at checkin time)
-- but enable it for safety:
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (used by /api/verify and /api/rooms)
CREATE POLICY "Service role full access"
    ON public.checkins FOR ALL
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.checkins TO service_role;
GRANT SELECT, INSERT ON public.checkins TO authenticated;  -- dashboard reads stats
GRANT USAGE, SELECT ON SEQUENCE public.checkins_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.checkins_id_seq TO service_role;


-- ─────────────────────────────────────────────────────────────
-- 5. ROOMS TABLE
--    Hotel room inventory.
--    Status: 'vacant' | 'occupied'
--    Seed with your actual room numbers below.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rooms (
    room_no     text PRIMARY KEY,              -- e.g. "101", "202"
    status      text NOT NULL DEFAULT 'vacant',-- 'vacant' | 'occupied'
    user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on rooms"
    ON public.rooms FOR ALL
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.rooms TO service_role;
GRANT SELECT ON public.rooms TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- 6. SEED ROOMS
--    Add/remove room numbers to match your hotel layout.
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.rooms (room_no, status) VALUES
    ('101', 'vacant'),
    ('102', 'vacant'),
    ('103', 'vacant'),
    ('104', 'vacant'),
    ('201', 'vacant'),
    ('202', 'vacant'),
    ('203', 'vacant'),
    ('204', 'vacant'),
    ('301', 'vacant'),
    ('302', 'vacant'),
    ('303', 'vacant'),
    ('304', 'vacant')
ON CONFLICT (room_no) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- Done! Summary of tables created:
--   public.profiles  — device lock per user
--   public.users     — guest identity & face verification status
--   public.checkins  — check-in sessions (pending → verified → checked_out)
--   public.rooms     — hotel room inventory
-- =============================================================
