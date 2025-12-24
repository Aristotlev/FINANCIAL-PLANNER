-- =====================================================
-- CHECK: Detect tables without RLS enabled
-- =====================================================
-- This script identifies tables in the 'public' schema (exposed to PostgREST)
-- that do not have Row Level Security (RLS) enabled.
-- =====================================================

SELECT
    n.nspname AS schema_name,
    c.relname AS table_name,
    CASE
        WHEN c.relrowsecurity = true THEN 'ENABLED'
        ELSE 'DISABLED'
    END AS rls_status
FROM
    pg_class c
JOIN
    pg_namespace n ON n.oid = c.relnamespace
WHERE
    c.relkind = 'r' -- Only ordinary tables
    AND n.nspname = 'public' -- Only public schema
    AND c.relrowsecurity = false -- RLS is not enabled
ORDER BY
    schema_name,
    table_name;
