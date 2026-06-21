import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { updateMyDisplayName, updateMyEmoji } from '../lib/data'

function AccordionSection({
  label,
  open,
  onToggle,
  children,
}: {
  label: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-slate-100 pb-6">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-base font-semibold text-slate-900"
      >
        <span>{label}</span>
        <span className={`text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

const ghostButton =
  'rounded-lg border border-slate-300 hover:bg-slate-50 hover:border-slate-900 disabled:opacity-50 text-slate-700 text-sm px-4 py-2 font-medium'

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
  const [emojiOpen, setEmojiOpen] = useState(false)

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
    <div className="space-y-12 pt-4 pb-10">
      <h2 className="text-[28px] font-bold text-slate-900 tracking-tight leading-snug">설정</h2>

      <div className="space-y-8">
        <AccordionSection label="닉네임" open={nicknameOpen} onToggle={() => setNicknameOpen((o) => !o)}>
          <div className="space-y-3">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="닉네임 입력"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-900"
            />
            <div className="flex justify-end">
              <button
                disabled={savingName || !displayName.trim()}
                onClick={handleSaveName}
                className={ghostButton}
              >
                저장
              </button>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection label="이모지" open={emojiOpen} onToggle={() => setEmojiOpen((o) => !o)}>
          <div className="space-y-3">
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="이모지"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xl text-center outline-none focus:border-slate-900"
            />
            <div className="flex justify-end">
              <button disabled={savingEmoji || !emoji.trim()} onClick={handleSaveEmoji} className={ghostButton}>
                저장
              </button>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection label="비밀번호" open={passwordOpen} onToggle={() => setPasswordOpen((o) => !o)}>
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
            <div className="flex justify-end">
              <button
                disabled={savingPassword || !newPassword || !confirmPassword}
                onClick={handleSavePassword}
                className={ghostButton}
              >
                {savingPassword ? '변경 중...' : '비밀번호 변경'}
              </button>
            </div>
          </div>
        </AccordionSection>
      </div>
    </div>
  )
}
