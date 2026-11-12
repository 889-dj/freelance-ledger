create table if not exists users (
  id serial primary key,
  name text not null,
  email text unique not null,
  key_hash text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists clients (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  name text not null,
  email text,
  company text,
  created_at timestamptz not null default now()
);

create table if not exists proposals (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  client_id int not null references clients(id) on delete cascade,
  title text not null,
  scope_text text not null default '',
  status text not null default 'draft' check (status in ('draft','sent','accepted')),
  share_token text unique not null default replace(gen_random_uuid()::text,'-',''),
  created_at timestamptz not null default now()
);

create table if not exists milestones (
  id serial primary key,
  proposal_id int not null references proposals(id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null,
  due_date date,
  position int not null default 0
);

create table if not exists invoices (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  client_id int not null references clients(id) on delete cascade,
  proposal_id int references proposals(id) on delete set null,
  milestone_id int references milestones(id) on delete set null,
  number text not null,
  amount numeric(12,2) not null,
  due_date date,
  status text not null default 'unpaid' check (status in ('unpaid','paid')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, number)
);

create index if not exists clients_user on clients(user_id);
create index if not exists proposals_user on proposals(user_id);
create index if not exists invoices_user on invoices(user_id);
