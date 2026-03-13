-- Migration: Convert integer allocation to JSONB specific time blocks
-- This changes the allocation model from raw counts to specific time slots

-- 1. Add the new JSONB column
ALTER TABLE public.project_assignments 
  ADD COLUMN allocated_blocks jsonb DEFAULT '[]'::jsonb;

-- 2. Migrate existing integer allocations to the new array format
-- E.g. If allocation is 2, it becomes [1, 2]. If 3, [1, 2, 3].
UPDATE public.project_assignments 
SET allocated_blocks = (
  CASE 
    WHEN allocation = 1 THEN '[1]'::jsonb
    WHEN allocation = 2 THEN '[1, 2]'::jsonb
    WHEN allocation = 3 THEN '[1, 2, 3]'::jsonb
    WHEN allocation = 4 THEN '[1, 2, 3, 4]'::jsonb
    ELSE '[]'::jsonb
  END
);

-- 3. Drop the old integer column
ALTER TABLE public.project_assignments 
  DROP COLUMN allocation;

-- 4. Enforce validation on the new JSONB column
-- Ensures that the array only contains integers 1, 2, 3, or 4 and has max 4 elements.
-- A proper trigger or application-level logic is best for overlap prevention, 
-- but we can add a basic check constraint for valid block IDs.
ALTER TABLE public.project_assignments
  ADD CONSTRAINT valid_allocated_blocks CHECK (
    jsonb_typeof(allocated_blocks) = 'array'
    AND jsonb_array_length(allocated_blocks) <= 4
    AND (
      allocated_blocks <@ '[1, 2, 3, 4]'::jsonb
    )
  );

-- Note: Overlap validation (preventing a user from being assigned Block 1 in two different 
-- projects during the same cycle) is best handled at the application layer or via a 
-- database function/trigger. The application layer validation is implemented in the UI.
