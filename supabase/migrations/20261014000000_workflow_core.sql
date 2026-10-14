-- PAVEMENT-PINN — core schema for the cloud target (Supabase PostgreSQL + PostGIS).
--
-- STATUS: written and reviewed against the TypeScript domain model (src/domain), NOT yet
-- applied: no Supabase project credentials are configured (docs/GAP_REGISTER.md G-SB-01).
-- The running demo server persists the same model in a local JSON store behind the
-- CaseStore interface (server/repositories/fileCaseStore.ts).
--
-- Security model (least privilege):
--   * Browser clients never update workflow tables directly. There are no INSERT/UPDATE
--     policies for `anon`/`authenticated` on workflow tables; the API (service role)
--     applies the state machine and writes the audit log in one transaction.
--   * Official roles may SELECT full cases; everyone else reads `public_report_view`.
--   * Audit logs are readable by official roles only.

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- reference enums
create type app_role as enum ('PUBLIC_REPORTER', 'PUBLIC_VIEWER', 'FIELD_ENGINEER', 'OPERATIONS_MANAGER', 'POLICY_MAKER');
create type workflow_state as enum (
  'SUBMITTED', 'AI_SCREENING', 'NEEDS_REVIEW', 'VERIFIED', 'FIELD_INSPECTION_REQUESTED',
  'INSPECTED', 'ACTION_RECOMMENDED', 'ACTION_APPROVED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
);
create type data_status as enum (
  'OBSERVED', 'USER_GENERATED', 'PUBLIC', 'INFERRED', 'ESTIMATED', 'SYNTHETIC',
  'SIMULATED', 'ILLUSTRATIVE', 'RULE_BASED', 'DEMO', 'MODEL_UNAVAILABLE'
);

-- ---------------------------------------------------------------- identity
-- One profile per Supabase Auth user; the role is assigned by an administrator, never by the user.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role app_role not null default 'PUBLIC_REPORTER',
  agency_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function current_app_role() returns app_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function is_official() returns boolean
language sql stable as $$
  select coalesce(current_app_role() in ('FIELD_ENGINEER', 'OPERATIONS_MANAGER', 'POLICY_MAKER'), false)
$$;

-- ---------------------------------------------------------------- road network
create table road_segments (
  id text primary key,                         -- canonical ids, e.g. KRW-001
  name text not null,
  corridor text not null,
  province text not null,
  geom geometry(LineString, 4326) not null,
  length_km numeric(8, 3),
  geometry_status data_status not null,        -- ILLUSTRATIVE until digitised from open road data
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index road_segments_geom_idx on road_segments using gist (geom);

create table pavement_baselines (
  id uuid primary key default gen_random_uuid(),
  segment_id text not null references road_segments (id) on delete cascade,
  surface text,
  surface_thickness_cm numeric(5, 1),
  base_thickness_cm numeric(5, 1),
  subbase_thickness_cm numeric(5, 1),
  subgrade_cbr_min numeric(5, 1),
  subgrade_cbr_max numeric(5, 1),
  modulus_min_mpa numeric(8, 1),
  modulus_max_mpa numeric(8, 1),
  source text not null,
  confidence text not null check (confidence in ('HIGH', 'MODERATE', 'LOW')),
  data_status data_status not null,            -- REFERENCE values are SYNTHETIC/ESTIMATED, never OBSERVED
  valid_from date,
  created_at timestamptz not null default now()
);
create index pavement_baselines_segment_idx on pavement_baselines (segment_id);

-- ---------------------------------------------------------------- observations
create table traffic_observations (
  id uuid primary key default gen_random_uuid(),
  segment_id text not null references road_segments (id) on delete cascade,
  observed_from timestamptz not null,
  observed_to timestamptz not null,
  vehicle_class text not null,
  vehicle_count integer check (vehicle_count >= 0),
  heavy_vehicle_likelihood numeric(4, 3) check (heavy_vehicle_likelihood between 0 and 1),
  source text not null,
  source_reference text,
  collection_method text not null,
  data_status data_status not null,
  created_at timestamptz not null default now(),
  check (observed_to >= observed_from)
);
create index traffic_observations_segment_time_idx on traffic_observations (segment_id, observed_from desc);

create table wim_observations (
  id uuid primary key default gen_random_uuid(),
  station_id text not null,
  segment_id text references road_segments (id) on delete set null,
  observed_at timestamptz not null,
  location geometry(Point, 4326),
  axle_count smallint,
  axle_loads_ton numeric(6, 2)[],
  gross_weight_ton numeric(7, 2),
  confidence text check (confidence in ('HIGH', 'MODERATE', 'LOW')),
  source text not null,
  data_status data_status not null,            -- OBSERVED only for real WIM feeds; no plates stored (spec §29)
  created_at timestamptz not null default now()
);
create index wim_observations_segment_time_idx on wim_observations (segment_id, observed_at desc);

create table weather_observations (
  id uuid primary key default gen_random_uuid(),
  segment_id text references road_segments (id) on delete set null,
  observed_at timestamptz not null,
  location geometry(Point, 4326),
  rainfall_mm_per_hr numeric(6, 2),
  rainfall_accumulation_mm numeric(7, 2),
  temperature_c numeric(5, 2),
  flood_indicator boolean,
  source text not null,
  data_status data_status not null,
  created_at timestamptz not null default now()
);
create index weather_observations_segment_time_idx on weather_observations (segment_id, observed_at desc);

-- ---------------------------------------------------------------- report workflow
create table report_cases (
  id text primary key,                         -- REP-<16 hex>
  version integer not null default 1 check (version >= 1),
  state workflow_state not null,
  segment_id text references road_segments (id) on delete set null,
  location geometry(Point, 4326) not null,
  damage_type text not null,
  severity text not null check (severity in ('LIGHT', 'MODERATE', 'SEVERE', 'CRITICAL')),
  description text not null check (char_length(description) <= 2000),
  estimated_depth_cm numeric(6, 1) check (estimated_depth_cm >= 0),
  estimated_area_m2 numeric(8, 2) check (estimated_area_m2 >= 0),
  photo_object_key text,                       -- Supabase Storage key; never a filesystem path
  creator_id text not null,                    -- auth user id, or server-issued anon-… id
  creator_role text not null,
  creator_kind text not null check (creator_kind in ('DEMO_ACCOUNT', 'ANONYMOUS', 'AUTHENTICATED', 'SYSTEM')),
  claim_token_hash text,                       -- sha256 of the anonymous claim token
  data_status data_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index report_cases_state_idx on report_cases (state);
create index report_cases_segment_idx on report_cases (segment_id);
create index report_cases_location_idx on report_cases using gist (location);

create table damage_detections (
  id uuid primary key default gen_random_uuid(),
  report_id text not null references report_cases (id) on delete cascade,
  model_status text not null check (model_status in ('REAL', 'DEMO', 'MODEL_UNAVAILABLE')),
  model_version text,
  detected_class text,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  mask_geojson jsonb,                          -- segmentation polygon in image coordinates, when available
  passed_screening boolean not null,
  reasons text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index damage_detections_report_idx on damage_detections (report_id);

create table inspection_assignments (
  id text primary key,
  report_id text not null references report_cases (id) on delete cascade,
  engineer_id text not null,
  assigned_by text not null,
  assigned_at timestamptz not null,
  due_at timestamptz not null,
  instructions text not null default ''
);
create index inspection_assignments_engineer_idx on inspection_assignments (engineer_id, due_at);

create table inspections (
  id text primary key,
  report_id text not null references report_cases (id) on delete cascade,
  engineer_id text not null,
  inspected_at timestamptz not null,
  verdict text not null check (verdict in ('CONFIRMED', 'NOT_CONFIRMED')),
  cv_accepted boolean not null,
  corrected_class text,
  measured_depth_cm numeric(6, 1),
  measured_area_m2 numeric(8, 2),
  severity text not null,
  notes text not null,
  data_status data_status not null default 'OBSERVED'
);

create table pinn_predictions (
  id text primary key,
  segment_id text not null references road_segments (id) on delete cascade,
  report_id text references report_cases (id) on delete set null,
  engine text not null check (engine in ('PINN', 'RULE_BASED', 'DEMO')),
  model_version text not null,
  input_snapshot jsonb not null,
  outputs jsonb not null,
  confidence text not null check (confidence in ('HIGH', 'MODERATE', 'LOW')),
  uncertainty jsonb not null,
  physics_residual numeric,                    -- null unless a trained PINN reports it
  validation_status text not null,             -- e.g. VALIDATION_REQUIRED
  provenance jsonb not null,
  created_at timestamptz not null default now()
);
create index pinn_predictions_segment_idx on pinn_predictions (segment_id, created_at desc);

create table maintenance_recommendations (
  id text primary key,
  report_id text not null references report_cases (id) on delete cascade,
  recommended_by text not null,
  recommended_at timestamptz not null,
  treatment text not null,
  urgency text not null check (urgency in ('ROUTINE', 'PRIORITY', 'URGENT')),
  rationale text not null,
  assessment_id text references pinn_predictions (id) on delete set null
);

create table approvals (
  id text primary key,
  report_id text not null references report_cases (id) on delete cascade,
  decided_by text not null,
  decided_at timestamptz not null,
  decision text not null check (decision in ('APPROVED', 'REJECTED')),
  reason text not null
);

create table work_orders (
  id text primary key,
  report_id text not null references report_cases (id) on delete cascade,
  issued_by text not null,
  issued_at timestamptz not null,
  status text not null check (status in ('ISSUED', 'IN_PROGRESS', 'COMPLETED')),
  contractor_note text not null default '',
  completed_at timestamptz,
  is_official_document boolean not null default false check (is_official_document = false)
);

create table audit_logs (
  id text primary key,
  at timestamptz not null default now(),
  actor_id text not null,
  actor_role text not null,
  actor_kind text not null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  from_state text,
  to_state text,
  reason text not null,
  public_note text
);
create index audit_logs_entity_idx on audit_logs (entity_type, entity_id, at desc);

create table simulations (
  id uuid primary key default gen_random_uuid(),
  segment_id text not null references road_segments (id) on delete cascade,
  requested_by text not null,
  baseline jsonb not null,
  scenario jsonb not null,
  result jsonb not null,
  data_status data_status not null default 'SIMULATED',
  created_at timestamptz not null default now()
);

create table provenance (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  data_status data_status not null,
  source text not null,
  version text,
  confidence text,
  recorded_at timestamptz not null default now()
);
create index provenance_entity_idx on provenance (entity_type, entity_id);

-- ---------------------------------------------------------------- public read model
-- What citizens may see: the report content and state, no creator ids, claim hashes or staff data.
-- These views run with the owner's rights (no security_invoker) so they can expose exactly
-- these columns while the underlying tables stay staff-only.
create view public_report_view as
  select id, state, segment_id, st_y(location) as lat, st_x(location) as lng, damage_type, severity,
         description, estimated_depth_cm, estimated_area_m2, photo_object_key, data_status, created_at, updated_at
  from report_cases;

create view public_report_timeline as
  select entity_id as report_id, at, to_state as state, public_note as note
  from audit_logs where entity_type = 'REPORT_CASE' and public_note is not null;

-- ---------------------------------------------------------------- row level security
alter table profiles enable row level security;
alter table road_segments enable row level security;
alter table pavement_baselines enable row level security;
alter table traffic_observations enable row level security;
alter table wim_observations enable row level security;
alter table weather_observations enable row level security;
alter table report_cases enable row level security;
alter table damage_detections enable row level security;
alter table inspection_assignments enable row level security;
alter table inspections enable row level security;
alter table pinn_predictions enable row level security;
alter table maintenance_recommendations enable row level security;
alter table approvals enable row level security;
alter table work_orders enable row level security;
alter table audit_logs enable row level security;
alter table simulations enable row level security;
alter table provenance enable row level security;

create policy "own profile" on profiles for select using (id = auth.uid());

-- Public reference data.
create policy "road segments are public" on road_segments for select using (true);
create policy "baselines are public" on pavement_baselines for select using (true);
create policy "weather is public" on weather_observations for select using (true);
create policy "traffic is public" on traffic_observations for select using (true);
create policy "predictions are public" on pinn_predictions for select using (true);
create policy "provenance is public" on provenance for select using (true);

-- Full report rows (creator ids, claim hashes) are staff-only; citizens read the public views.
create policy "staff read report cases" on report_cases for select using (is_official());

-- Staff-only evidence and decisions.
create policy "staff read detections" on damage_detections for select using (is_official());
create policy "staff read assignments" on inspection_assignments for select using (is_official());
create policy "staff read inspections" on inspections for select using (is_official());
create policy "staff read recommendations" on maintenance_recommendations for select using (is_official());
create policy "staff read approvals" on approvals for select using (is_official());
create policy "staff read work orders" on work_orders for select using (is_official());
create policy "staff read wim" on wim_observations for select using (is_official());
create policy "staff read simulations" on simulations for select using (is_official());
create policy "staff read audit" on audit_logs for select using (is_official());

-- No INSERT/UPDATE/DELETE policies for anon/authenticated: all writes go through the API
-- (service role), which enforces the state machine, ownership and audit in one transaction.
revoke insert, update, delete on all tables in schema public from anon, authenticated;
grant select on public_report_view, public_report_timeline to anon, authenticated;
