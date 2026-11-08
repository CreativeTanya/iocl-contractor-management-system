import { useEffect, useState } from 'react'

export default function Login() {
  const [email, setEmail] = useState('')
  const invitationToken = new URLSearchParams(window.location.search).get('invite')
const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
const [invitationEmail, setInvitationEmail] = useState('')
  useEffect(() => {
  if (!invitationToken) return

  const API_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

  fetch(`${API_URL}/auth/invitation/${invitationToken}`)
    .then(async (response) => {
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Invalid invitation.')
      }

      setInvitationEmail(result.email)
      setEmail(result.email)
    })
    .catch((err) => setError(err.message))
}, [])
const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const API_URL =
        import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.message ||
            result.error ||
            'Login failed. Please check your email and password.'
        )
      }

      if (!result.token || !result.user) {
        throw new Error('Invalid login response received from the server.')
      }

      sessionStorage.setItem('token', result.token)
      sessionStorage.setItem('user', JSON.stringify(result.user))

      window.location.reload()
    } catch (err) {
      setError(
        err.message || 'Unable to connect to the server. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }
const handleRegister = async (e) => {
  e.preventDefault()
  setError('')
  setLoading(true)

  try {
    const API_URL =
      import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: invitationToken,
        name: name.trim(),
        password,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Registration failed.')
    }

    window.history.replaceState({}, '', window.location.pathname)
    alert('Account created successfully. Please sign in.')
    window.location.reload()
  } catch (err) {
    setError(err.message || 'Unable to create account.')
  } finally {
    setLoading(false)
  }
}
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl md:grid-cols-2">
        {/* Left panel */}
        <div className="hidden flex-col justify-between bg-slate-900 p-10 text-white md:flex">
          <div>
            <div className="mb-12 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-2xl font-bold">
                C
              </div>

              <div>
                <h1 className="text-xl font-bold">ContractCare</h1>
                <p className="text-xs text-slate-300">
                  Contractor Management System
                </p>
              </div>
            </div>

            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-orange-400">
              One platform. Better control.
            </p>

            <h2 className="text-4xl font-bold leading-tight">
              Manage contracts.
              <br />
              Track commitments.
              <br />
              Stay informed.
            </h2>

            <p className="mt-6 max-w-sm leading-7 text-slate-300">
              Manage contractor records, purchase orders, contract validity,
              payment status and email reminders from one place.
            </p>
          </div>

          <p className="text-sm text-slate-400">
            Secure access · Simplified management
          </p>
        </div>

        {/* Login panel */}
        <div className="flex items-center p-6 sm:p-10">
          <div className="w-full">
            <div className="mb-8 md:hidden">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-xl font-bold text-white">
                C
              </div>

              <h1 className="text-xl font-bold text-slate-900">
                ContractCare
              </h1>

              <p className="text-sm text-slate-500">
                Contractor Management System
              </p>
            </div>

           <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-orange-600">
  {invitationToken ? 'You are invited' : 'Welcome back'}
</p>

<h2 className="text-3xl font-bold text-slate-900">
  {invitationToken ? 'Create your account' : 'Sign in to your account'}
</h2>

<p className="mt-2 text-sm text-slate-500">
  {invitationToken
    ? 'Complete your details to accept the invitation.'
    : 'Enter your credentials to access your workspace.'}
</p>

           <form
  onSubmit={invitationToken ? handleRegister : handleLogin}
  className="mt-8 space-y-5"
>
  {invitationToken && (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        Full name
      </label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your full name"
        required
        disabled={loading}
        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
      />
    </div>
  )}

  <div>
    <label
      htmlFor="email"
      className="mb-2 block text-sm font-medium text-slate-700"
    >
      Email address
    </label>

    <input
      id="email"
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder="you@company.com"
      autoComplete="email"
      required
      disabled={loading || Boolean(invitationToken)}
      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
    />
  </div>

  <div>
    <label
      htmlFor="password"
      className="mb-2 block text-sm font-medium text-slate-700"
    >
      Password
    </label>

    <div className="flex overflow-hidden rounded-lg border border-slate-300 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100">
      <input
        id="password"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        autoComplete={invitationToken ? 'new-password' : 'current-password'}
        required
        minLength={invitationToken ? 8 : undefined}
        disabled={loading}
        className="min-w-0 flex-1 px-4 py-3 text-slate-900 outline-none disabled:bg-slate-100"
      />

      <button
        type="button"
        onClick={() => setShowPassword((current) => !current)}
        className="px-4 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        {showPassword ? 'Hide' : 'Show'}
      </button>
    </div>
  </div>

  {error && (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
    >
      {error}
    </div>
  )}

  <button
    type="submit"
    disabled={loading}
    className="w-full rounded-lg bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {loading
      ? invitationToken ? 'Creating account...' : 'Signing in...'
      : invitationToken ? 'Create Account' : 'Sign In'}
  </button>
</form>

            <div className="mt-8 border-t border-slate-200 pt-5">
              <p className="text-center text-xs leading-5 text-slate-500">
                Authorised users only. Access is protected by account
                authentication.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}