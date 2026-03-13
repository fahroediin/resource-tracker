-- ============================================
-- ROLLBACK TO PERCENTAGE ALLOCATION
-- Run this script in the Supabase SQL Editor
-- This will revert the block system (jsonb array) 
-- back to the original 0-100 percentage integer.
-- ============================================

-- 1. Re-add the original allocation column (0-100)
ALTER TABLE public.project_assignments 
ADD COLUMN IF NOT EXISTS allocation integer DEFAULT 50 CHECK (allocation >= 0 AND allocation <= 100);

-- 2. Convert any existing allocated_blocks (jsonb) data back to percentage (1 block = 25%)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_assignments' AND column_name = 'allocated_blocks') THEN
    UPDATE public.project_assignments 
    SET allocation = LEAST(100, COALESCE(jsonb_array_length(allocated_blocks), 0) * 25);
  END IF;
END $$;

-- 3. Drop the block system columns
ALTER TABLE public.project_assignments DROP COLUMN IF EXISTS allocated_blocks;
ALTER TABLE public.project_assignments DROP COLUMN IF EXISTS cycle_id;

-- 4. Drop the cycles table if it still exists
DROP TABLE IF EXISTS public.cycles CASCADE;

-- 5. Restore original constraint on allocation (in case it was modified to 0-4 by block migration earlier)
ALTER TABLE public.project_assignments DROP CONSTRAINT IF EXISTS project_assignments_allocation_check;
ALTER TABLE public.project_assignments ADD CONSTRAINT project_assignments_allocation_check CHECK (allocation >= 0 AND allocation <= 100);
