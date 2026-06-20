import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../components/Toast'
import { updateMyEmoji } from '../lib/data'

export default function Settings() {
  const { session, profile, refreshProfile } = useAuth()
  const showToast = useToast()
  const [emoji, setEmoji] = useState(profile?.emoji ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!session || !emoji.trim()) return
    setSaving(true)
    await updateMyEmoji(session.user.id, emoji.trim())
    await refreshProfile()
    setSaving(false)
    showToast('저장했어요')
  }

  return (
    <div className="space-y-4 pt-4">
      <h2 className="text-lg font-semibold text-slate-900 tracking-tight">설정</h2>

      <div className="space-y-3 pt-2">
        <p className="font-medium text-slate-900">{profile?.display_name}님의 이모지</p>
        <p className="text-xs text-slate-400">완료 표시에 쓸 이모지를 직접 입력해주세요. (예: 👩 👨 🐱 🦁)</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="이모지 입력"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-2xl text-center outline-none focus:border-slate-900"
          />
          <button
            disabled={saving || !emoji.trim()}
            onClick={handleSave}
            className="rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-4 font-medium"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
