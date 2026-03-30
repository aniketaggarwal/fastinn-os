-- ============================================================
-- FastInn Booking Portal — Schema Additions (schema_portal.sql)
-- Run this AFTER schema_v2.sql in your Supabase SQL Editor
-- ============================================================

-- Add rich content columns to hotels for the booking portal
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS description       text,
  ADD COLUMN IF NOT EXISTS location          text,
  ADD COLUMN IF NOT EXISTS city              text,
  ADD COLUMN IF NOT EXISTS country           text DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS amenities         text[],   -- e.g. ['pool', 'spa', 'wifi', 'gym']
  ADD COLUMN IF NOT EXISTS images            text[],   -- array of public image URLs
  ADD COLUMN IF NOT EXISTS star_rating       int DEFAULT 4,
  ADD COLUMN IF NOT EXISTS base_price        numeric(10,2) DEFAULT 0.00;

-- Add idempotency key to bookings (prevents duplicate bookings on page refresh)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS idempotency_key   text UNIQUE;

-- Allow authenticated users to read public hotel data
GRANT SELECT ON public.hotels TO authenticated;
GRANT SELECT ON public.hotels TO anon;

GRANT SELECT ON public.room_types TO authenticated;
GRANT SELECT ON public.room_types TO anon;

GRANT SELECT ON public.rooms TO authenticated;
GRANT SELECT ON public.rooms TO anon;

-- Service role gets full access (used by API routes)
GRANT ALL ON public.hotels TO service_role;
GRANT ALL ON public.room_types TO service_role;
GRANT ALL ON public.rooms TO service_role;
GRANT ALL ON public.bookings TO service_role;
GRANT ALL ON public.hotel_users TO service_role;

-- ── Demo Data ──────────────────────────────────────────────
-- Uncomment and run after setting up your hotel ID in the staff dashboard:
--
-- UPDATE public.hotels SET
--   description = 'A world-class urban retreat in the heart of the city, offering unparalleled luxury and impeccable service.',
--   location = 'Connaught Place, New Delhi',
--   city = 'New Delhi',
--   amenities = ARRAY['pool', 'spa', 'gym', 'valet', 'restaurant', 'wifi', 'bar'],
--   images = ARRAY['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200'],
--   star_rating = 5,
--   base_price = 150.00
-- WHERE name = 'FastInn Demo Property';
