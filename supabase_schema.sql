-- 집안일 공유 앱 스키마. 새 Supabase 프로젝트에서 SQL Editor로 한 번 실행하면 된다.
-- 모든 문장이 idempotent(if not exists)하게 작성되어 있어 다시 실행해도 안전하다.
-- 부부 단둘이 쓰는 앱이라 가구(household) 단위 분리 없이, 로그인한 모든 사용자가
-- 서로의 데이터를 보고 쓸 수 있게 설계했다.

create extension if not exists "pgcrypto";

-- ── 사용자 표시 이름 ──────────────────────────────────────────────────

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  emoji text,
  created_at timestamptz not null default now()
);

alter table profiles add column if not exists emoji text;

alter table profiles enable row level security;

drop policy if exists "profiles_select_all" on profiles;
create policy "profiles_select_all" on profiles for select to authenticated using (true);

drop policy if exists "profiles_upsert_own" on profiles;
create policy "profiles_upsert_own" on profiles for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update to authenticated using (id = auth.uid());

-- ── 집안일 ────────────────────────────────────────────────────────────
-- period_days가 null이면 반복 없는 1회성 작업.
-- due_date는 1회성 작업을 원하는 날짜에 할 일로 띄우기 위한 날짜(반복 작업은 사용하지 않음).

create table if not exists chores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  period_days integer check (period_days is null or period_days > 0),
  due_date date,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

alter table chores add column if not exists due_date date;

alter table chores enable row level security;

drop policy if exists "chores_all_authenticated" on chores;
create policy "chores_all_authenticated" on chores for all to authenticated using (true) with check (true);

-- ── 처리 이력 ─────────────────────────────────────────────────────────
-- 집안일의 "마지막으로 한 날"은 이 테이블에서 chore_id별 최신 done_date로 계산한다.

create table if not exists chore_logs (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references chores(id) on delete cascade,
  done_by uuid not null references profiles(id),
  done_date date not null default current_date,
  memo text,
  created_at timestamptz not null default now()
);

alter table chore_logs enable row level security;

drop policy if exists "chore_logs_all_authenticated" on chore_logs;
create policy "chore_logs_all_authenticated" on chore_logs for all to authenticated using (true) with check (true);

create index if not exists chore_logs_chore_id_idx on chore_logs(chore_id, done_date desc);

-- ── 처리 전 메모 ──────────────────────────────────────────────────────
-- 집안일을 처리하기 전에 상대방에게 남기는 한 줄 메모(예: "오늘 바빠서 못 했어, 내일 부탁해").
-- 집안일 하나당 메모 하나만 유지된다(다시 쓰면 덮어씀).

create table if not exists chore_notes (
  chore_id uuid primary key references chores(id) on delete cascade,
  author uuid not null references profiles(id),
  message text not null,
  updated_at timestamptz not null default now()
);

alter table chore_notes enable row level security;

drop policy if exists "chore_notes_all_authenticated" on chore_notes;
create policy "chore_notes_all_authenticated" on chore_notes for all to authenticated using (true) with check (true);

-- ── 긴급 메모 ─────────────────────────────────────────────────────────
-- 특정 집안일이 아니라 홈 화면 전체에 띄우는 공지/긴급 메모. 항상 1개의 행만 존재한다(싱글톤).

create table if not exists house_notes (
  id smallint primary key default 1 check (id = 1),
  author uuid not null references profiles(id),
  message text not null,
  updated_at timestamptz not null default now()
);

alter table house_notes enable row level security;

drop policy if exists "house_notes_all_authenticated" on house_notes;
create policy "house_notes_all_authenticated" on house_notes for all to authenticated using (true) with check (true);
