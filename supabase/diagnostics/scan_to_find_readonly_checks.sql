-- PeopleFind Scan-to-Find: READ-ONLY schema diagnostics
-- Run this in Supabase SQL Editor before applying migration 202610110002.
-- These queries inspect metadata only; they do not alter data or permissions.

-- 1) Confirm expected tables and columns.
select
  table_schema,
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'people',
    'scan_reference_index',
    'scan_allowlist',
    'scan_events',
    'scan_consent_log',
    'person_face_embeddings'
  )
order by table_name, ordinal_position;

-- 2) Confirm scan RPC signatures and definitions.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  p.prosecdef as security_definer,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('scan_match_dolls', 'scan_match_faces')
order by p.proname;

-- 3) Inspect grants on scan RPCs without changing them.
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in ('scan_match_dolls', 'scan_match_faces')
order by routine_name, grantee, privilege_type;

-- 4) Check approximate table sizes only; no personal records are returned.
select
  schemaname,
  relname as table_name,
  n_live_tup as estimated_rows
from pg_stat_user_tables
where schemaname = 'public'
  and relname in (
    'people',
    'scan_reference_index',
    'scan_allowlist',
    'scan_events',
    'scan_consent_log',
    'person_face_embeddings'
  )
order by relname;

-- 5) Check the vector extension and vector column dimensions.
select extname, extversion
from pg_extension
where extname = 'vector';

select
  table_name,
  column_name,
  udt_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('scan_reference_index', 'person_face_embeddings')
  and column_name in ('embedding', 'person_id', 'photo_url_snapshot', 'photo_url_hash', 'model_version', 'status', 'error', 'attempts', 'created_at', 'updated_at')
order by table_name, ordinal_position;
