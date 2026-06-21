import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { updateMyDisplayName, updateMyEmoji } from '../lib/data'

export default function Settings() {
  const { session, profile, refreshProfile } = useAuth()
  const showToast = useToast()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [emoji, setEmoji] = useState(profile?.emoji ?? '')
  const [savingName, setSavingName] = useState(false)
  const [savingEmoji, setSavingEmoji] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [nicknameOpen, setNicknameOpen] = useState(false)

  async function handleSaveName() {
    if (!session || !displayName.trim()) return
    setSavingName(true)
    await updateMyDisplayName(session.user.id, displayName.trim())
    await refreshProfile()
    setSavingName(false)
    showToast('저장했어요')
  }

  async function handleSaveEmoji() {
    if (!session || !emoji.trim()) return
    setSavingEmoji(true)
    await updateMyEmoji(session.user.id, emoji.trim())
    await refreshProfile()
    setSavingEmoji(false)
    showToast('저장했어요')
  }

  async function handleSavePassword() {
    setPasswordError(null)
    if (newPassword.length < 6) {
      setPasswordError('비밀번호는 6자 이상이어야 해요.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('비밀번호가 일치하지 않아요.')
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) {
      setPasswordError(error.message)
      return
    }
    setNewPassword('')
    setConfirmPassword('')
    showToast('비밀번호를 변경했어요')
  }

  return (
    <div className="space-y-10 pt-4">
      <h2 className="text-[28px] font-bold text-slate-900 tracking-tight leading-snug">설정</h2>

      <div>
        <button
          type="button"
          onClick={() => setNicknameOpen((o) => !o)}
          className="w-full flex items-center justify-between text-sm font-semibold text-[#4a4a4a]"
        >
          <span>닉네임 변경</span>
          <span className={`text-slate-400 transition-transform duration-300 ${nicknameOpen ? 'rotate-180' : ''}`}>
            ⌄
          </span>
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            nicknameOpen ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="닉네임 입력"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-900"
            />
            <button
              disabled={savingName || !displayName.trim()}
              onClick={handleSaveName}
              className="rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-5 py-2.5 font-medium shrink-0"
            >
              저장
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-[#4a4a4a]">이모지</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="이모지"
            className="w-16 rounded-lg border border-slate-200 px-2 py-2.5 text-xl text-center outline-none focus:border-slate-900"
          />
          <button
            disabled={savingEmoji || !emoji.trim()}
            onClick={handleSaveEmoji}
            className="rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-5 py-2.5 font-medium shrink-0"
          >
            저장
          </button>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setPasswordOpen((o) => !o)}
          className="w-full flex items-center justify-between text-sm font-semibold text-[#4a4a4a]"
        >
          <span>비밀번호 변경</span>
          <span className={`text-slate-400 transition-transform duration-300 ${passwordOpen ? 'rotate-180' : ''}`}>
            ⌄
          </span>
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            passwordOpen ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="space-y-3">
            <input
              type="password"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="새 비밀번호"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-900"
            />
            <input
              type="password"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="새 비밀번호 확인"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-900"
            />
            {passwordError && <p className="text-sm text-rose-500">{passwordError}</p>}
            <button
              disabled={savingPassword || !newPassword || !confirmPassword}
              onClick={handleSavePassword}
              className="w-full sm:w-auto rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 px-5 py-2.5 font-medium"
            >
              {savingPassword ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
