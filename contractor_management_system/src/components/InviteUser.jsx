import { useState } from 'react'

export default function InviteUser() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('User')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleInvite = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)

    try {
      const API_URL =
        import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

      const response = await fetch(`${API_URL}/auth/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`,
        },
        body: JSON.stringify({ email: email.trim(), role }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Unable to send invitation.')
      }

      setMessage('Invitation sent successfully.')
      setEmail('')
      setRole('User')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-bold text-slate-800">
        Invite a New Member
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Send an invitation to grant access to ContractCare.
      </p>

      <form onSubmit={handleInvite} className="mt-6 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Email Address
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="person@company.com"
            required
            disabled={loading}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Assign Role
          </label>

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-orange-500"
          >
            <option value="User">User</option>
            <option value="Admin">Admin</option>
          </select>
        </div>

        {message && (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {message}
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
        >
          {loading ? 'Sending...' : 'Send Invitation'}
        </button>
      </form>
    </div>
  )
}