import { addDays, format } from 'date-fns'
import { supabase } from './supabase'
import type { Chore, ChoreLog, ChoreNote, ChoreWithStatus, HouseNote, Profile } from '../types/index'

export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export async function ensureProfile(userId: string, displayName: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: displayName }, { onConflict: 'id' })
  if (error) throw error
}

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function updateMyEmoji(userId: string, emoji: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ emoji }).eq('id', userId)
  if (error) throw error
}

export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at')
  if (error) throw error
  return data ?? []
}

export async function getChoresWithStatus(includeArchived = false): Promise<ChoreWithStatus[]> {
  const choresQuery = supabase.from('chores').select('*').order('created_at')
  const { data: chores, error: choresError } = includeArchived
    ? await choresQuery
    : await choresQuery.eq('archived', false)
  if (choresError) throw choresError

  const { data: logs, error: logsError } = await supabase
    .from('chore_logs')
    .select('*')
    .order('done_date', { ascending: false })
  if (logsError) throw logsError

  const latestLogByChore = new Map<string, ChoreLog>()
  for (const log of logs ?? []) {
    if (!latestLogByChore.has(log.chore_id)) latestLogByChore.set(log.chore_id, log)
  }

  return (chores ?? []).map((chore: Chore) => {
    const lastLog = latestLogByChore.get(chore.id) ?? null
    let nextDueDate: string | null

    if (chore.period_days === null) {
      nextDueDate = lastLog ? null : chore.due_date ?? format(new Date(chore.created_at), 'yyyy-MM-dd')
    } else if (lastLog) {
      nextDueDate = format(addDays(new Date(lastLog.done_date), chore.period_days), 'yyyy-MM-dd')
    } else {
      nextDueDate = format(new Date(chore.created_at), 'yyyy-MM-dd')
    }

    return {
      ...chore,
      last_done_date: lastLog?.done_date ?? null,
      last_done_by: lastLog?.done_by ?? null,
      last_log_id: lastLog?.id ?? null,
      next_due_date: nextDueDate,
    }
  })
}

export async function createChore(name: string, periodDays: number | null, dueDate: string | null): Promise<void> {
  const { error } = await supabase
    .from('chores')
    .insert({ name, period_days: periodDays, due_date: periodDays === null ? dueDate : null })
  if (error) throw error
}

export async function updateChore(
  id: string,
  name: string,
  periodDays: number | null,
  dueDate: string | null
): Promise<void> {
  const { error } = await supabase
    .from('chores')
    .update({ name, period_days: periodDays, due_date: periodDays === null ? dueDate : null })
    .eq('id', id)
  if (error) throw error
}

export async function archiveChore(id: string): Promise<void> {
  const { error } = await supabase.from('chores').update({ archived: true }).eq('id', id)
  if (error) throw error
}

export async function logChoreDone(
  choreId: string,
  doneBy: string,
  doneDate: string,
  memo: string | null
): Promise<void> {
  const { error } = await supabase
    .from('chore_logs')
    .insert({ chore_id: choreId, done_by: doneBy, done_date: doneDate, memo })
  if (error) throw error
}

export async function getLogsForChore(choreId: string): Promise<ChoreLog[]> {
  const { data, error } = await supabase
    .from('chore_logs')
    .select('*')
    .eq('chore_id', choreId)
    .order('done_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getAllLogs(): Promise<ChoreLog[]> {
  const { data, error } = await supabase
    .from('chore_logs')
    .select('*')
    .order('done_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updateLogMemo(id: string, memo: string | null): Promise<void> {
  const { error } = await supabase.from('chore_logs').update({ memo }).eq('id', id)
  if (error) throw error
}

export async function deleteLog(id: string): Promise<void> {
  const { error } = await supabase.from('chore_logs').delete().eq('id', id)
  if (error) throw error
}

export async function getAllNotes(): Promise<ChoreNote[]> {
  const { data, error } = await supabase.from('chore_notes').select('*')
  if (error) throw error
  return data ?? []
}

export async function setNote(choreId: string, author: string, message: string): Promise<void> {
  const { error } = await supabase
    .from('chore_notes')
    .upsert({ chore_id: choreId, author, message, updated_at: new Date().toISOString() }, { onConflict: 'chore_id' })
  if (error) throw error
}

export async function clearNote(choreId: string): Promise<void> {
  const { error } = await supabase.from('chore_notes').delete().eq('chore_id', choreId)
  if (error) throw error
}

export async function getHouseNote(): Promise<HouseNote | null> {
  const { data, error } = await supabase.from('house_notes').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  return data
}

export async function setHouseNote(author: string, message: string): Promise<void> {
  const { error } = await supabase
    .from('house_notes')
    .upsert({ id: 1, author, message, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) throw error
}

export async function clearHouseNote(): Promise<void> {
  const { error } = await supabase.from('house_notes').delete().eq('id', 1)
  if (error) throw error
}
