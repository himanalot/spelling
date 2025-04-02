-- Add source_file column to researcher_profiles table
ALTER TABLE researcher_profiles
ADD COLUMN source_file text NOT NULL DEFAULT '';

-- Create index for faster lookups by source_file
CREATE INDEX researcher_profiles_source_file_idx ON researcher_profiles(source_file); 