
-- 1. Extend app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'diretor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'fundador';

-- 2. Extend clearance_level
ALTER TYPE public.clearance_level ADD VALUE IF NOT EXISTS 'nivel_fundador';
