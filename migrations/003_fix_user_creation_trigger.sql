-- Migration: Fix handle_new_user trigger function
-- Date: 2025-12-13
-- Purpose: Safely create public.profiles entry when a new user signs up, 
-- with error handling to ensure auth.users creation never fails due to profile errors.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    credits_remaining, 
    max_credits, 
    plan_type, 
    subscription_status
  )
  VALUES (
    new.id,
    new.email,
    500,     -- Default free credits
    5000,    -- Max credits cap
    'free',  -- Default plan
    'active' -- Default status
  );
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- CRITICAL: Log error but do NOT block user creation.
    -- The application (GET /me) has fallback logic to create the profile if missing.
    -- Raising an exception here would roll back the auth.users insert, preventing signup.
    RAISE WARNING 'Error in handle_new_user for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is correctly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
