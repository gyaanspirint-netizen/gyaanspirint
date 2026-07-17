-- Add 'teacher' to app_role enum and update handle_new_user to skip user_roles insert for teachers
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';
