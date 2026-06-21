import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../components/Toast'
import { updateMyDisplayName, updateMyEmoji } from '../lib/data'

export default function Settings() {
  const { session, profile, refreshProfile } = useAuth()
  const showToast = useToast()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [emoji, setEmoji] = useState(profile?.emoji ?? '')
  const [savingName, setSavingName] = useState(false)
  const [savingEmoji, setSavingEmoji] = useState(false)

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

  return (
    <div className="space-y-6 pt-4">
      <h2 className="text-lg font-semibold text-slate-900 tracking-tight">설정</h2>

      <div className="space-y-2">
        <p className="text-xs text-slate-400">이름</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="이름 입력"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-900"
          />
          <button
            disabled={savingName || !displayName.trim()}
            onClick={handleSaveName}
            className="rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2 font-medium shrink-0"
          >
            저장
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-400">완료 표시에 쓸 이모지 (예: 👩 👨 🐱 🦁)</p>
        <div className="flex items-center gap-2">
          <p className="font-medium text-slate-900 shrink-0">{profile?.display_name}님의 이모지</p>
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="이모지"
            className="w-16 rounded-lg border border-slate-200 px-2 py-2 text-xl text-center outline-none focus:border-slate-900"
          />
          <button
            disabled={savingEmoji || !emoji.trim()}
            onClick={handleSaveEmoji}
            className="rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2 font-medium shrink-0"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
