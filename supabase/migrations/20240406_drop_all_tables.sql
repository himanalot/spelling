-- Drop all word list tables (cwl_*_list_*)
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'cwl_%_list_%')
  LOOP
    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;

-- Drop the dictionary table
DROP TABLE IF EXISTS dictionary CASCADE;

-- Drop the word_frequencies table if it exists
DROP TABLE IF EXISTS word_frequencies CASCADE;

-- Drop any views
DROP VIEW IF EXISTS word_list_statistics CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS exec_sql(text);
DROP FUNCTION IF EXISTS get_word_list_tables();
DROP FUNCTION IF EXISTS get_word_list(text);
DROP FUNCTION IF EXISTS search_word_lists(text);
DROP FUNCTION IF EXISTS get_random_words(text, integer);
DROP FUNCTION IF EXISTS get_words_by_letter(text, char);
DROP FUNCTION IF EXISTS count_words_in_lists();
DROP FUNCTION IF EXISTS get_word_details(text);
DROP FUNCTION IF EXISTS get_words_by_metadata(text, text, text);

-- Drop extensions (optional, comment out if you want to keep them)
-- DROP EXTENSION IF EXISTS pg_trgm CASCADE; 