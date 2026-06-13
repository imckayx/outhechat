-- Group Trip Planner — initial schema
-- Tables: trips, members, availability
-- Per TECH_SPEC.md "Data model"

create table if not exists trips (
  id                    text         primary key,
  admin_token           text         not null,
  name                  text         not null check (length(name) between 1 and 100),
  destination           text,
  trip_length_days      integer      not null check (trip_length_days >= 1),
  search_window_start   date         not null,
  search_window_end     date         not null,
  allowed_days_of_week  integer[]    not null default array[0,1,2,3,4,5,6],
  expected_group_size   integer      not null check (expected_group_size >= 1),
  context               text,
  status                text         not null default 'open'
                                     check (status in ('open', 'locked', 'cancelled')),
  created_at            timestamptz  not null default now(),

  constraint trips_window_valid
    check (search_window_end >= search_window_start),
  constraint trips_trip_length_fits_window
    check (trip_length_days <= (search_window_end - search_window_start + 1)),
  constraint trips_allowed_days_nonempty
    check (array_length(allowed_days_of_week, 1) >= 1),
  constraint trips_allowed_days_in_range
    check (
      (select bool_and(d between 0 and 6)
         from unnest(allowed_days_of_week) as d)
    )
);

create table if not exists members (
  id            text         primary key,
  trip_id       text         not null references trips(id) on delete cascade,
  name          text         not null check (length(name) between 1 and 50),
  member_token  text         not null,
  created_at    timestamptz  not null default now()
);

create index if not exists members_trip_id_idx on members (trip_id);

create table if not exists availability (
  id         bigserial primary key,
  member_id  text      not null references members(id) on delete cascade,
  date       date      not null,
  status     text      not null default 'unavailable'
                       check (status in ('unavailable')),

  constraint availability_member_date_unique unique (member_id, date)
);

create index if not exists availability_member_id_idx on availability (member_id);

-- RLS: lock down all three tables. The server uses the service-role key,
-- which bypasses RLS, so no policies are needed. The anon key, if ever
-- used client-side, will be denied — preventing direct table access.
alter table trips        enable row level security;
alter table members      enable row level security;
alter table availability enable row level security;
