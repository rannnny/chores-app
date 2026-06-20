import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../components/Toast'
import { updateMyGender } from '../lib/data'

export default function Settings() {
  const { session, profile, refreshProfile } = useAuth()
  const showToast = useToast()
  const [saving, setSaving] = useState(false)

  async function handlePick(gender: 'female' | 'male') {
    if (!session) return
    setSaving(true)
    await updateMyGender(session.user.id, gender)
    await refreshProfile()
    setSaving(false)
    showToast('저장했어요')
  }

  return (
    <div className="space-y-4 pt-4">
      <h2 className="font-semibold text-slate-900">설정</h2>

      <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
        <p className="font-medium text-slate-900">{profile?.display_name}님의 이모지</p>
        <p className="text-xs text-slate-400">완료 표시에 쓸 이모지를 골라주세요.</p>
        <div className="flex gap-2">
          <button
            disabled={saving}
            onClick={() => handlePick('female')}
            className={`flex-1 rounded-xl py-3 text-2xl ${
              profile?.gender === 'female' ? 'bg-teal-600' : 'bg-slate-100'
            }`}
          >
            👩
          </button>
          <button
            disabled={saving}
            onClick={() => handlePick('male')}
            className={`flex-1 rounded-xl py-3 text-2xl ${
              profile?.gender === 'male' ? 'bg-teal-600' : 'bg-slate-100'
            }`}
          >
            👨
          </button>
        </div>
      </div>
    </div>
  )
}
