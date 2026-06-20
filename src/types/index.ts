export interface Profile {
  id: string
  display_name: string
  created_at: string
}

export interface Chore {
  id: string
  name: string
  period_days: number | null
  due_date: string | null
  archived: boolean
  created_at: string
}

export interface ChoreLog {
  id: string
  chore_id: string
  done_by: string
  done_date: string
  memo: string | null
  created_at: string
}

export interface ChoreWithStatus extends Chore {
  last_done_date: string | null
  last_done_by: string | null
  next_due_date: string | null
}
