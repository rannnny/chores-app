import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ensureProfile } from '../lib/data'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (error) setError(error.message)
      return
    }

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setLoading(false)
      setError(error.message)
      return
    }
    if (data.user) {
      await ensureProfile(data.user.id, displayName || email.split('@')[0]).catch(() => {})
    }
    setLoading(false)
    if (!data.session) {
      setError('가입 확인 메일을 확인해주세요. (이메일 확인이 꺼져 있다면 바로 로그인됩니다)')
    }
  }

  return (
    <div className="min-h-dvh flex items-start justify-center px-5 pt-24 overflow-y-auto bg-white">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">집안일 공유</h1>
          <p className="text-sm text-slate-400">{mode === 'signin' ? '로그인' : '계정 만들기'}</p>
        </div>

        <div className="space-y-3">
          {mode === 'signup' && (
            <input
              type="text"
              required
              placeholder="이름 (예: 아란)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:border-[#8b5e3c]"
            />
          )}
          <input
            type="email"
            required
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:border-[#8b5e3c]"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-white border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:border-[#8b5e3c]"
          />
        </div>

        {error && <p className="text-sm text-rose-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#8b5e3c] hover:bg-[#74492d] disabled:opacity-50 py-2.5 font-medium text-white transition"
        >
          {loading ? '처리 중...' : mode === 'signin' ? '로그인' : '가입하기'}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="w-full text-sm text-slate-400 hover:text-slate-700"
        >
          {mode === 'signin' ? '계정이 없나요? 가입하기' : '이미 계정이 있나요? 로그인'}
        </button>
      </form>
    </div>
  )
}
