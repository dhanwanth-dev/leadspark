-- LeadSpark (48h single-client version)
-- Run this in Supabase SQL Editor once per client project.
-- Product: LeadSpark

create extension if not exists "pgcrypto";

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  whatsapp_number text,
  company_name text,
  created_at timestamptz not null default now()
);

create table if not exists properties (
  id text primary key,
  agent_id uuid references agents(id) on delete set null,
  title text not null,
  locality text not null,
  city text not null,
  bhk int not null,
  listing_type text not null check (listing_type in ('sale', 'rent')),
  price_amount bigint not null,
  furnishing text,
  amenities text[] default '{}',
  rera_number text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  property_id text references properties(id) on delete set null,
  agent_id uuid references agents(id) on delete set null,
  name text,
  phone text,
  budget_min bigint,
  budget_max bigint,
  locality_pref text,
  timeline text,
  purpose text default 'unknown',
  bhk_preference text,
  lead_score text not null default 'cold' check (lead_score in ('hot', 'warm', 'cold')),
  notes text,
  conversation_transcript jsonb not null default '[]'::jsonb,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists leads_score_created_idx on leads (lead_score, created_at desc);
create index if not exists leads_property_idx on leads (property_id);

-- Optional seed matching the built-in demo property id
insert into properties (
  id, title, locality, city, bhk, listing_type, price_amount, furnishing, amenities, rera_number, description
) values (
  'demo-whitefield',
  '3 BHK Premium Apartment in Whitefield',
  'Whitefield',
  'Bengaluru',
  3,
  'sale',
  12500000,
  'Semi-furnished',
  array['Clubhouse', 'Swimming pool', 'Gym', 'Covered parking', '24x7 security'],
  'PRM/KA/RERA/1251/446/PR/171015/000123',
  'Spacious 3 BHK near ITPL, ready to move.'
) on conflict (id) do nothing;

-- Single-client note:
-- This 48h version authenticates the dashboard with DASHBOARD_PASSWORD
-- and writes leads via the service role. Full multi-tenant RLS can be
-- added later when you productize beyond one agent per deployment.
