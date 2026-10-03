-- Additive data model for the three-entry Autumn Tarot Night flow.
-- Existing event_tarot_draws/readings remain intact for backwards compatibility.

create table if not exists public.event_attendee_drink_preferences (
  event_id text not null references public.events(event_id) on delete cascade,
  attendee_id uuid not null,
  flavor_tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, attendee_id),
  foreign key (event_id, attendee_id) references public.event_attendees(event_id, id) on delete cascade
);

create table if not exists public.event_drink_catalog (
  event_id text not null references public.events(event_id) on delete cascade,
  drink_id uuid not null references public.drinks(id) on delete restrict,
  sort_order integer not null default 0,
  primary key (event_id, drink_id)
);

create table if not exists public.event_attendee_tasks (
  event_id text not null references public.events(event_id) on delete cascade,
  attendee_id uuid not null,
  task_key text not null,
  tasks jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, attendee_id),
  foreign key (event_id, attendee_id) references public.event_attendees(event_id, id) on delete cascade
);

create table if not exists public.event_tarot_rounds (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(event_id) on delete cascade,
  attendee_id uuid not null,
  round text not null check (round in ('first', 'second')),
  card_id text not null,
  orientation text not null check (orientation in ('upright', 'reversed')),
  question text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, attendee_id, round),
  unique (event_id, id),
  foreign key (event_id, attendee_id) references public.event_attendees(event_id, id) on delete cascade
);

create table if not exists public.event_tarot_round_readings (
  event_id text not null references public.events(event_id) on delete cascade,
  round_id uuid not null,
  attendee_id uuid not null,
  title text not null,
  body text not null,
  reflection text not null,
  provider text not null,
  question_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, round_id),
  foreign key (event_id, round_id) references public.event_tarot_rounds(event_id, id) on delete cascade,
  foreign key (event_id, attendee_id) references public.event_attendees(event_id, id) on delete cascade
);

create table if not exists public.event_drink_recommendations (
  event_id text not null references public.events(event_id) on delete cascade,
  attendee_id uuid not null,
  round text not null check (round in ('first', 'second')),
  drink_id uuid not null references public.drinks(id) on delete restrict,
  matched_flavor_tags text[] not null default '{}',
  drink_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  primary key (event_id, attendee_id, round),
  unique (event_id, attendee_id, drink_id),
  foreign key (event_id, attendee_id) references public.event_attendees(event_id, id) on delete cascade
);

alter table public.event_attendee_drink_preferences enable row level security;
alter table public.event_drink_catalog enable row level security;
alter table public.event_attendee_tasks enable row level security;
alter table public.event_tarot_rounds enable row level security;
alter table public.event_tarot_round_readings enable row level security;
alter table public.event_drink_recommendations enable row level security;

revoke all on public.event_attendee_drink_preferences from anon, authenticated;
revoke all on public.event_drink_catalog from anon, authenticated;
revoke all on public.event_attendee_tasks from anon, authenticated;
revoke all on public.event_tarot_rounds from anon, authenticated;
revoke all on public.event_tarot_round_readings from anon, authenticated;
revoke all on public.event_drink_recommendations from anon, authenticated;
