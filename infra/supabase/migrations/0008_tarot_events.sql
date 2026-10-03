-- Private event data is owned by Vibetail and intentionally separate from venue
-- merchant data. Child rows carry event_id so one event can be archived without
-- coupling this experience to a venue merchant.
create table if not exists public.events (
  event_id text primary key,
  owner_slug text not null,
  venue_label text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('draft', 'active', 'ended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(event_id) on delete cascade,
  email_normalized text not null,
  display_name text not null,
  zodiac text not null,
  element text not null check (element in ('火', '风', '水', '土')),
  task text not null,
  marketing_opt_in boolean not null default false,
  consent_source text,
  consent_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, email_normalized),
  unique (event_id, id)
);

create table if not exists public.event_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(event_id) on delete cascade,
  attendee_id uuid not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (event_id, attendee_id)
    references public.event_attendees(event_id, id) on delete cascade
);

create table if not exists public.event_tarot_draws (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(event_id) on delete cascade,
  attendee_id uuid not null,
  card_id text not null,
  orientation text not null check (orientation in ('upright', 'reversed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, attendee_id),
  unique (event_id, id),
  foreign key (event_id, attendee_id)
    references public.event_attendees(event_id, id) on delete cascade
);

create table if not exists public.event_tarot_readings (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(event_id) on delete cascade,
  attendee_id uuid not null,
  draw_id uuid not null,
  title text not null,
  body text not null,
  reflection text not null,
  provider text not null,
  model text,
  question_hash text,
  created_at timestamptz not null default now(),
  unique (event_id, attendee_id, draw_id),
  foreign key (event_id, draw_id)
    references public.event_tarot_draws(event_id, id) on delete cascade,
  foreign key (event_id, attendee_id)
    references public.event_attendees(event_id, id) on delete cascade
);

alter table public.events enable row level security;
alter table public.event_attendees enable row level security;
alter table public.event_sessions enable row level security;
alter table public.event_tarot_draws enable row level security;
alter table public.event_tarot_readings enable row level security;

revoke all on public.events from anon, authenticated;
revoke all on public.event_attendees from anon, authenticated;
revoke all on public.event_sessions from anon, authenticated;
revoke all on public.event_tarot_draws from anon, authenticated;
revoke all on public.event_tarot_readings from anon, authenticated;
