-- Migration: Remove Allocation Cycles abstraction
-- This drops the `cycles` table and foreign keys to simplify time-boxing to project-level dates instead.

-- 1. Remove the foreign key column from project_assignments
ALTER TABLE public.project_assignments
  DROP COLUMN IF EXISTS cycle_id;

-- 2. Drop the cycles table entirely
DROP TABLE IF EXISTS public.cycles CASCADE;

-- Note: The `allocated_blocks` JSONB column (from Phase 7 specific time blocks) 
-- is kept intact, as block assignments are now directly tied to the project duration
-- rather than an arbitrary cycle.
