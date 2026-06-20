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
      <h2 className="font-semibold text-slate-900">설정</h2>

      <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
        <p className="font-medium text-slate-900">{profile?.display_name}님의 이모지</p>
        <p className="text-xs text-slate-400">완료 표시에 쓸 이모지를 직접 입력해주세요. (예: 👩 👨 🐱 🦁)</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="이모지 입력"
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-2xl text-center outline-none focus:border-teal-500"
          />
          <button
            disabled={saving || !emoji.trim()}
            onClick={handleSave}
            className="rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white px-4 font-medium"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
