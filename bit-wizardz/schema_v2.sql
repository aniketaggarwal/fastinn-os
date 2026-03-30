-- =============================================================
--  FastInn OS - Phase 1 MVP Database Schema (SaaS / Multi-Hotel)
-- =============================================================

-- IMPORTANT: This script drops old tables to apply the massive Phase 1 redesign.
-- Because previous 'rooms' and 'checkins' had different primary keys, we must drop them.
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.housekeeping_tasks CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.invoice_items CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.checkins CASCADE;
DROP TABLE IF EXISTS public.booking_status_history CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.room_types CASCADE;
DROP TABLE IF EXISTS public.hotel_users CASCADE;
DROP TABLE IF EXISTS public.hotels CASCADE;
-- We do not drop public.users or public.profiles to preserve authentication records,
-- but if you want a complete wipe, you can uncomment these:
-- DROP TABLE IF EXISTS public.users CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- ==========================================
-- 1. CORE SYSTEM & TENANTS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.hotels (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    domain      text,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

-- Profiles for device locking
CREATE TABLE IF NOT EXISTS public.profiles (
    id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    active_device_id text,
    last_active     timestamptz DEFAULT now()
);

-- Users (Identity & Biometrics)
CREATE TABLE IF NOT EXISTS public.users (
    id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email               text,
    name                text,
    phone               text,
    dob                 text,
    id_last4            text,
    id_masked           text,
    id_type             text DEFAULT 'aadhaar',
    identity_verified   boolean DEFAULT false,
    face_verified       boolean DEFAULT false,
    face_descriptor     real[],                        -- 128-dimensional float array for face matching
    public_key          text,                          -- ECDSA public key (JWK base64)
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- Roles Mapping (Multi-tenant RBAC)
-- Roles: 'admin', 'reception', 'housekeeping', 'guest'
CREATE TABLE IF NOT EXISTS public.hotel_users (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id    uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role        text NOT NULL DEFAULT 'guest',
    created_at  timestamptz DEFAULT now(),
    UNIQUE(hotel_id, user_id)
);

-- ==========================================
-- 2. INVENTORY & ROOM MANAGEMENT
-- ==========================================

CREATE TABLE IF NOT EXISTS public.room_types (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id    uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    name        text NOT NULL,
    description text,
    base_price  numeric(10,2) NOT NULL DEFAULT 0.00,
    capacity    int NOT NULL DEFAULT 2,
    created_at  timestamptz DEFAULT now()
);

-- Status: 'vacant', 'occupied', 'cleaning', 'maintenance'
CREATE TABLE IF NOT EXISTS public.rooms (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id        uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    room_no         text NOT NULL,
    room_type_id    uuid REFERENCES public.room_types(id) ON DELETE SET NULL,
    floor           text,
    status          text NOT NULL DEFAULT 'vacant',
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now(),
    UNIQUE(hotel_id, room_no)
);

-- ==========================================
-- 3. BOOKINGS & CHECK-IN
-- ==========================================

-- Status: 'pending', 'confirmed', 'checked_in', 'completed', 'cancelled'
CREATE TABLE IF NOT EXISTS public.bookings (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id        uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    guest_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    room_type_id    uuid REFERENCES public.room_types(id) ON DELETE RESTRICT,
    room_id         uuid REFERENCES public.rooms(id) ON DELETE SET NULL,     -- Allocated room
    check_in_date   date NOT NULL,
    check_out_date  date NOT NULL,
    status          text NOT NULL DEFAULT 'pending',
    payment_status  text NOT NULL DEFAULT 'unpaid',     -- 'unpaid', 'partial', 'paid'
    total_amount    numeric(10,2) NOT NULL DEFAULT 0.00,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_status_history (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    status      text NOT NULL,
    changed_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at  timestamptz DEFAULT now()
);

-- Advanced Check-in (Replaces current checkins)
CREATE TABLE IF NOT EXISTS public.checkins (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id            uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    booking_id          uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    guest_id            uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    status              text NOT NULL DEFAULT 'pending',  -- 'pending', 'verified', 'completed'
    nonce               text,
    nonce_expires_at    timestamptz,
    verified_at         timestamptz,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    UNIQUE(booking_id)
);

-- ==========================================
-- 4. BILLING & PAYMENTS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.invoices (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id        uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    booking_id      uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    guest_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    amount_subtotal numeric(10,2) NOT NULL DEFAULT 0.00,
    tax             numeric(10,2) NOT NULL DEFAULT 0.00,
    amount_total    numeric(10,2) NOT NULL DEFAULT 0.00,
    status          text NOT NULL DEFAULT 'pending',  -- 'pending', 'paid', 'cancelled'
    created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description     text NOT NULL,
    amount          numeric(10,2) NOT NULL DEFAULT 0.00,
    created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    amount          numeric(10,2) NOT NULL DEFAULT 0.00,
    method          text NOT NULL,      -- 'cash', 'card', 'upi', 'stripe'
    status          text NOT NULL DEFAULT 'pending',  -- 'pending', 'success', 'failed', 'refunded'
    gateway_ref     text,
    created_at      timestamptz DEFAULT now()
);

-- ==========================================
-- 5. OPERATIONS & LOGGING
-- ==========================================

CREATE TABLE IF NOT EXISTS public.housekeeping_tasks (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id        uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    room_id         uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    assigned_to     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    status          text NOT NULL DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed'
    notes           text,
    created_at      timestamptz DEFAULT now(),
    completed_at    timestamptz
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id        uuid REFERENCES public.hotels(id) ON DELETE CASCADE,
    user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action          text NOT NULL,      -- 'create_booking', 'update_room_status', 'check_in_guest'
    entity_type     text NOT NULL,      -- 'booking', 'room', 'checkin'
    entity_id       uuid,
    details         jsonb,
    ip_address      text,
    created_at      timestamptz DEFAULT now()
);

-- ==========================================
-- AUTO-CREATE USER TRIGGER (UPDATED)
-- ==========================================
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

    -- NOTE: By default, users are NOT assigned to a hotel.
    -- Guests get a hotel_users record when they book.
    -- Staff get a hotel_users record created by an admin.

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- RLS (To be expanded in later setup phases)
-- ==========================================
-- We will enable RLS on all tables, and use `hotel_users` to dynamically enforce `hotel_id`
-- constraints for Reception/Admin/Housekeeping, while Guests only see their own `guest_id` rows.

-- 1. Grant base permissions to the Supabase authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 2. Basic RLS for RBAC resolution (Crucial for Dashboard Login)
ALTER TABLE public.hotel_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own tenant mappings" ON public.hotel_users;
CREATE POLICY "Users can read their own tenant mappings"
    ON public.hotel_users FOR SELECT
    USING (auth.uid() = user_id);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own profile" ON public.users;
CREATE POLICY "Users can read their own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

-- Future phases will add strict RLS to bookings and rooms. 
-- For MVP, API Routes with Service Role keys are acting as the secure gateway.
