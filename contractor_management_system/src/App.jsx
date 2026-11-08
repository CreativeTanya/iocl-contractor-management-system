import InviteUser from './components/InviteUser'
import Login from './components/Login'
import { useEffect, useState } from 'react'
import AddContractorModal from './components/AddContractorModal'
import EmailHistory from './components/EmailHistory'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function App() {
  const [activePage, setActivePage] = useState('All Contractors')
  const [showAddContractor, setShowAddContractor] = useState(false)
  const [contractors, setContractors] = useState([])
  const [emailLogs, setEmailLogs] = useState([])
const [emailHistoryLoading, setEmailHistoryLoading] = useState(false)
const [emailHistoryError, setEmailHistoryError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingPO, setEditingPO] = useState(null)
  const [savingPO, setSavingPO] = useState(false)

  const [token, setToken] = useState(
    () => sessionStorage.getItem('token') || ''
  )

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  })

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    async function loadContractors() {
      if (!token) {
        setContractors([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')

        const response = await fetch(`${API_URL}/contractors`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to load contractors')
        }

        setContractors(
          Array.isArray(result.data) ? result.data : []
        )
      } catch (err) {
        setError(err.message || 'Unable to connect to the backend')
      } finally {
        setLoading(false)
      }
    }

    loadContractors()
  }, [token])
  useEffect(() => {
    async function loadEmailHistory() {
      if (!token  || activePage !== 'Email History') {
        return
      }

      try {
        setEmailHistoryLoading(true)
        setEmailHistoryError('')

        const response = await fetch(`${API_URL}/email-history`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to load email history')
        }

        setEmailLogs(Array.isArray(result.data) ? result.data : [])
      } catch (err) {
        setEmailHistoryError(
          err.message || 'Unable to load email history'
        )
      } finally {
        setEmailHistoryLoading(false)
      }
    }

    loadEmailHistory()
  }, [token, user, activePage])
const navigation = [
    { name: 'All Contractors', icon: '▤' },
    { name: 'Contract Validity', icon: '◷' },
    { name: 'Overdue Payments', icon: '₹' },
    { name: 'Email History', icon: '✉' },
];

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function parseDate(value) {
    if (!value) return null

    const text = String(value).slice(0, 10)
    const parsed = new Date(`${text}T00:00:00`)

    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  function getValidityStatus(expiryDate) {
    const expiry = parseDate(expiryDate)

    if (!expiry) {
      return { label: 'Date Missing', days: null }
    }

    const days = Math.round(
      (expiry.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
    )

    if (days < 0) {
      return { label: 'Expired', days }
    }

    if (days <= 30) {
      return { label: 'Expiring Soon', days }
    }

    return { label: 'Active', days }
  }

  function getPaymentStatus(po) {
    const amount = Number(po.amount || 0)
    const paid = Number(po.amountPaid || 0)
    const remaining = Math.max(0, amount - paid)

    if (remaining <= 0) {
      return 'Paid'
    }

    const dueDate = parseDate(po.dueDate)

    if (dueDate && dueDate < today) {
      return 'Overdue'
    }

    // Preserve an existing Overdue status when the backend
    // has already classified the payment as overdue.
    if (po.paymentStatus === 'Overdue') {
      return 'Overdue'
    }

    return 'Pending'
  }

  function getRemainingAmount(po) {
    const amount = Number(po.amount || 0)
    const paid = Number(po.amountPaid || 0)

    return Math.max(0, amount - paid)
  }

  const allPOs = contractors.flatMap((contractor) =>
    (contractor.purchaseOrders || []).map((po) => ({
      ...po,
      contractorId: contractor._id,
      contractorName: contractor.name,
    }))
  )

  const query = searchTerm.trim().toLowerCase()

  const visiblePOs = allPOs.filter((po) => {
    const matchesSearch = !query || [
      po.contractorName,
      po.nameOfWork,
      po.poNumber,
      po.slNo,
    ].some((value) =>
      String(value ?? '').toLowerCase().includes(query)
    )

    if (!matchesSearch) return false

    if (activePage === 'Overdue Payments') {
      return (
        getPaymentStatus(po) === 'Overdue' &&
        getRemainingAmount(po) > 0
      )
    }

    return true
  })

  async function handleLogin(event) {
    event.preventDefault()

    if (loginLoading) return

    try {
      setLoginLoading(true)
      setError('')

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Login failed')
      }

      sessionStorage.setItem('token', result.token)
      sessionStorage.setItem('user', JSON.stringify(result.user))

      setToken(result.token)
      setUser(result.user)
      setLoginPassword('')
      setError('')
    } catch (err) {
      setError(err.message || 'Unable to log in')
    } finally {
      setLoginLoading(false)
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')

    setToken('')
    setUser(null)
    setContractors([])
    setEditingPO(null)
    setShowAddContractor(false)
    setSearchTerm('')
    setError('')
    setActivePage('All Contractors')
  }

  async function handleSaveContractor(record) {
  try {
    setError('')

    const response = await fetch(`${API_URL}/contractors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(record),
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to save contractor')
    }

    setContractors((previous) => [
      result.data,
      ...previous,
    ])

    setShowAddContractor(false)
    return true
  } catch (err) {
    setError(err.message || 'Unable to save contractor')
    return false
  }
}
  async function handleDeletePO(contractorId, poId) {
    if (!poId) {
      setError('This purchase order has no ID and cannot be deleted.')
      return
    }

    const confirmed = window.confirm(
      'Delete this purchase order? This action cannot be undone.'
    )

    if (!confirmed) return

    try {
      setError('')

      const response = await fetch(
        `${API_URL}/contractors/${contractorId}/purchase-orders/${poId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete purchase order')
      }

      setContractors((previous) =>
        previous.map((contractor) =>
          contractor._id === contractorId
            ? {
                ...contractor,
                purchaseOrders: (
                  contractor.purchaseOrders || []
                ).filter((po) => po._id !== poId),
              }
            : contractor
        )
      )
    } catch (err) {
      setError(err.message || 'Unable to delete purchase order')
    }
  }

  function handleEditPO(contractor, po) {
    setError('')

    setEditingPO({
      contractorId: contractor._id,
      poId: po._id,
      slNo: po.slNo ?? '',
      nameOfWork: po.nameOfWork || '',
      poNumber: po.poNumber || '',
      poDate: po.poDate ? String(po.poDate).slice(0, 10) : '',
      amount: String(po.amount ?? 0),
      validity: po.validity || '',
      startDate: po.startDate ? String(po.startDate).slice(0, 10) : '',
      expiryDate: po.expiryDate
        ? String(po.expiryDate).slice(0, 10)
        : '',
      dueDate: po.dueDate ? String(po.dueDate).slice(0, 10) : '',
      amountPaid: String(po.amountPaid ?? 0),
    })
  }

  async function handleUpdatePO() {
    if (!editingPO || savingPO) return

    const amount = Number(editingPO.amount)
    const amountPaid = Number(editingPO.amountPaid)

    if (!editingPO.poNumber.trim()) {
      setError('PO number is required.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('PO value must be greater than zero.')
      return
    }

    if (
      !Number.isFinite(amountPaid) ||
      amountPaid < 0 ||
      amountPaid > amount
    ) {
      setError('Amount paid must be between zero and the PO value.')
      return
    }

    if (
      editingPO.startDate &&
      editingPO.expiryDate &&
      editingPO.expiryDate < editingPO.startDate
    ) {
      setError('Contract end date cannot be earlier than its start date.')
      return
    }

    try {
      setSavingPO(true)
      setError('')

      const response = await fetch(
        `${API_URL}/contractors/${editingPO.contractorId}/purchase-orders/${editingPO.poId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            slNo: editingPO.slNo === ''
              ? null
              : Number(editingPO.slNo),
            nameOfWork: editingPO.nameOfWork.trim(),
            poNumber: editingPO.poNumber.trim(),
            poDate: editingPO.poDate,
            validity: editingPO.validity.trim(),
            startDate: editingPO.startDate,
            expiryDate: editingPO.expiryDate,
            dueDate: editingPO.dueDate,
            amount,
            amountPaid,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update purchase order')
      }

      setContractors((previous) =>
        previous.map((contractor) => {
          if (contractor._id !== editingPO.contractorId) {
            return contractor
          }

          // Some endpoints return the whole contractor;
          // others return only the updated PO.
          if (result.data?.purchaseOrders) {
            return result.data
          }

          return {
            ...contractor,
            purchaseOrders: (
              contractor.purchaseOrders || []
            ).map((po) =>
              po._id === editingPO.poId
                ? {
                    ...po,
                    ...(result.data || {}),
                    slNo: editingPO.slNo,
                    nameOfWork: editingPO.nameOfWork.trim(),
                    poNumber: editingPO.poNumber.trim(),
                    poDate: editingPO.poDate,
                    validity: editingPO.validity.trim(),
                    startDate: editingPO.startDate,
                    expiryDate: editingPO.expiryDate,
                    dueDate: editingPO.dueDate,
                    amount,
                    amountPaid,
                    remainingAmount: amount - amountPaid,
                    paymentStatus:
                      amount - amountPaid <= 0
                        ? 'Paid'
                        : getPaymentStatus({
                            ...po,
                            amount,
                            amountPaid,
                          }),
                  }
                : po
            ),
          }
        })
      )

      setEditingPO(null)
    } catch (err) {
      setError(err.message || 'Unable to update purchase order')
    } finally {
      setSavingPO(false)
    }
  }


  function formatDate(value) {
    const date = parseDate(value)

    if (!date) return '—'

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  function formatAmount(value) {
    return `₹${Number(value || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    })}`
  }

  function getStatusClasses(label) {
    if (label === 'Expired' || label === 'Overdue') {
      return 'bg-red-100 text-red-700'
    }

    if (label === 'Expiring Soon' || label === 'Pending') {
      return 'bg-amber-100 text-amber-700'
    }

    if (label === 'Paid' || label === 'Active') {
      return 'bg-green-100 text-green-700'
    }

    return 'bg-slate-100 text-slate-600'
  }
  if (!token) {
  return <Login />
}
  const columnCount =
    activePage === 'All Contractors'
      ? 9
      : activePage === 'Contract Validity'
        ? 7
        : 8

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <aside className="w-full bg-slate-900 p-4 text-white md:min-h-screen md:w-64 md:shrink-0">
        <h1 className="mb-6 text-xl font-bold">
          Contractor Management
        </h1>

        <nav className="flex flex-wrap gap-2 md:flex-col">
          {navigation.map((page) => (
            <button
              key={page.name}
              onClick={() => setActivePage(page.name)}
              className={`rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                activePage === page.name
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <span>{page.icon}</span>
                <span>{page.name}</span>
              </span>
            </button>
          ))}
        </nav>

        {user?.role === 'Admin' && (
          <button
            onClick={() => setActivePage('Invite User')}
            className={`mt-2 w-full rounded-lg px-4 py-3 text-left text-sm font-medium ${
              activePage === 'Invite User'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            ✉️ Invite User
          </button>
        )}
        
        <div className="mt-6 border-t border-slate-700 pt-4">
          <p className="mb-1 text-sm text-slate-300">Signed in as</p>

          <p className="mb-4 break-words text-sm font-medium">
            {user?.email || user?.name || 'User'}
          </p>

          <button
            onClick={handleLogout}
            className="w-full rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {activePage}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
  {activePage === 'All Contractors'
    ? 'Contractor and purchase order records.'
    : activePage === 'Contract Validity'
      ? 'Review contract expiry dates and validity status.'
      : activePage === 'Overdue Payments'
        ? 'Review outstanding payments that are overdue.'
        : activePage === 'Email History'
  ? 'View automatic contract expiry and overdue payment email reminders.'
  : 'Invite authorised members to access ContractCare.'}
</p>
          </div>

          {user?.role === 'Admin' && (
            <div className="flex flex-wrap gap-2">
            

              <button
                onClick={() => setShowAddContractor(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                + Add Contractor
              </button>
            </div>
          )}
        </div>

      {error && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <span className="whitespace-pre-line">{error}</span>
            <button
              onClick={() => setError('')}
              className="font-bold"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}
{activePage === 'Invite User' && user?.role === 'Admin' && (
          <InviteUser />
        )}
        {activePage === 'Email History' && (
 <div className="space-y-4">
    <EmailHistory
      emailLogs={emailLogs}
      loading={emailHistoryLoading}
      error={emailHistoryError}
    />
  </div>
)}
        <div className={`${['Email History', 'Invite User'].includes(activePage) ? 'hidden' : ''} mb-4 rounded-xl bg-white p-4 shadow-sm`}>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search vendor, work name, or PO number..."
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

      <div className={`${['Email History', 'Invite User'].includes(activePage) ? 'hidden' : ''} overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  {activePage === 'All Contractors' && (
                    <>
                      <th className="whitespace-nowrap px-4 py-4">SL No.</th>
<th className="whitespace-nowrap px-4 py-4">Vendor Details</th>
<th className="whitespace-nowrap px-4 py-4">Name of Work</th>
<th className="whitespace-nowrap px-4 py-4">PO No.</th>
<th className="whitespace-nowrap px-4 py-4">PO Date</th>
<th className="whitespace-nowrap px-4 py-4">PO Value (Excl. Tax)</th>
<th className="whitespace-nowrap px-4 py-4">Contract Start</th>
<th className="whitespace-nowrap px-4 py-4">Validity End</th>
{user?.role === 'Admin' && (
  <th className="whitespace-nowrap px-4 py-4">Actions</th>
)}
                    </>
                  )}
                  {activePage === 'Contract Validity' && (
                    <>
                      <th className="whitespace-nowrap px-4 py-4">Vendor Details</th>
                      <th className="whitespace-nowrap px-4 py-4">Name of Work</th>
                      <th className="whitespace-nowrap px-4 py-4">PO No.</th>
                      <th className="whitespace-nowrap px-4 py-4">Contract Start</th>
                      <th className="whitespace-nowrap px-4 py-4">Contract End</th>
                      <th className="whitespace-nowrap px-4 py-4">Days Remaining</th>
                      <th className="whitespace-nowrap px-4 py-4">Validity Status</th>
                    </>
                  )}

                  {activePage === 'Overdue Payments' && (
                    <>
                      <th className="whitespace-nowrap px-4 py-4">Vendor Details</th>
                      <th className="whitespace-nowrap px-4 py-4">PO No.</th>
                      <th className="whitespace-nowrap px-4 py-4">PO Value</th>
                      <th className="whitespace-nowrap px-4 py-4">Amount Paid</th>
                      <th className="whitespace-nowrap px-4 py-4">Remaining Amount</th>
                      <th className="whitespace-nowrap px-4 py-4">Payment Due Date</th>
                      <th className="whitespace-nowrap px-4 py-4">Payment Status</th>
                      <th className="whitespace-nowrap px-4 py-4">Name of Work</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={columnCount}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Loading records...
                    </td>
                  </tr>
                ) : visiblePOs.filter((po) => {
                    if (activePage === 'Contract Validity') {
                      return true
                    }

                    return true
                  }).length === 0 ? (
                  <tr>
                    <td
                      colSpan={columnCount}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      {activePage === 'Overdue Payments'
                        ? 'No overdue payments found.'
                        : 'No records found.'}
                    </td>
                  </tr>
                ) : (
                  visiblePOs.map((po, index) => {
                    const contractor = contractors.find(
                      (item) => item._id === po.contractorId
                    )

                    const validityStatus = getValidityStatus(po.expiryDate)
                    const paymentStatus = getPaymentStatus(po)
                    const remainingAmount = getRemainingAmount(po)

                    return (
                      <tr
                        key={`${po.contractorId}-${po._id || index}`}
                        className="transition hover:bg-slate-50"
                      >
                        {activePage === 'All Contractors' && (
  <>
    <td className="whitespace-nowrap px-4 py-4 text-slate-600">
      {index + 1}
    </td>

    <td className="min-w-48 px-4 py-4 font-medium text-slate-800">
      {po.contractorName || '—'}
    </td>

    <td className="min-w-48 px-4 py-4">
      {po.nameOfWork || '—'}
    </td>

    <td className="whitespace-nowrap px-4 py-4 font-medium">
      {po.poNumber || '—'}
    </td>

    <td className="whitespace-nowrap px-4 py-4">
      {formatDate(po.startDate)}
    </td>

    <td className="whitespace-nowrap px-4 py-4">
      {formatAmount(po.amount)}
    </td>

    <td className="whitespace-nowrap px-4 py-4">
      {formatDate(po.startDate)}
    </td>

    <td className="whitespace-nowrap px-4 py-4">
      {formatDate(po.expiryDate)}
    </td>

    <td className="whitespace-nowrap px-4 py-4">
      {user?.role === 'Admin' && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (contractor) handleEditPO(contractor, po)
            }}
            className="font-medium text-blue-600 hover:text-blue-800"
          >
            Edit
          </button>

          <button
            onClick={() =>
              handleDeletePO(po.contractorId, po._id)
            }
            className="font-medium text-red-600 hover:text-red-800"
          >
            Delete
          </button>
        </div>
      )}
    </td>
  </>
)}
                        {activePage === 'Contract Validity' && (
                          <>
                            <td className="min-w-48 px-4 py-4 font-medium text-slate-800">
                              {po.contractorName || '—'}
                            </td>

                            <td className="min-w-48 px-4 py-4">
                              {po.nameOfWork || '—'}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4">
                              {po.poNumber || '—'}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4">
                              {formatDate(po.startDate)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4">
                              {formatDate(po.expiryDate)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4">
                              {validityStatus.days === null
                                ? '—'
                                : validityStatus.days < 0
                                  ? `${Math.abs(validityStatus.days)} days overdue`
                                  : `${validityStatus.days} days`}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(validityStatus.label)}`}
                              >
                                {validityStatus.label}
                              </span>
                            </td>
                          </>
                        )}

                        {activePage === 'Overdue Payments' && (
                          <>
                            <td className="min-w-48 px-4 py-4 font-medium text-slate-800">
                              {po.contractorName || '—'}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4">
                              {po.poNumber || '—'}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4">
                              {formatAmount(po.amount)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4">
                              {formatAmount(po.amountPaid)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 font-semibold text-red-600">
                              {formatAmount(remainingAmount)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4">
                              {formatDate(po.dueDate)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(paymentStatus)}`}>
                                {paymentStatus}
                              </span>
                            </td>

                            <td className="min-w-48 px-4 py-4">
                              {po.nameOfWork || '—'}
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

     <p className={`${activePage === 'Email History' ? 'hidden' : ''} mt-3 text-xs text-slate-500`}>
  {visiblePOs.length} purchase order(s)
  {activePage === 'Overdue Payments' ? ' with overdue payments' : ''}
</p>

        {editingPO && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">
                  Edit Purchase Order
                </h3>

                <button
                  type="button"
                  onClick={() => setEditingPO(null)}
                  className="text-2xl text-slate-500 hover:text-slate-800"
                  aria-label="Close edit form"
                >
                  &times;
                </button>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  handleUpdatePO()
                }}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
                {[
                 
                  ['nameOfWork', 'Name of Work', 'text'],
                  ['poNumber', 'PO Number', 'text'],
                  ['poDate', 'PO Date', 'date'],
                  ['amount', 'PO Value (Excluding Tax)', 'number'],
                  
                  ['startDate', 'Contract Period – Start', 'date'],
                  ['expiryDate', 'Contract Period – End', 'date'],
                  ['dueDate', 'Payment Due Date', 'date'],
                  ['amountPaid', 'Amount Paid', 'number'],
                ].map(([field, label, type]) => (
                  <div key={field}>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {label}
                    </label>

                    <input
                      type={type}
                      value={editingPO[field] ?? ''}
                      onChange={(event) =>
                        setEditingPO((current) => ({
                          ...current,
                          [field]: event.target.value,
                        }))
                      }
                      required={['poNumber', 'amount'].includes(field)}
                      min={type === 'number' ? '0' : undefined}
                      step={type === 'number' ? '0.01' : undefined}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                    />
                  </div>
                ))}

                <div className="sm:col-span-2">
                  <p className="mb-4 text-xs text-slate-500">
                    Remaining amount and payment status are derived from
                    the PO value, amount paid, and payment due date.
                  </p>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingPO(null)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={savingPO}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {savingPO ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddContractor && (
          <AddContractorModal
            onClose={() => setShowAddContractor(false)}
            onSave={handleSaveContractor}
          />
        )}
      </main>
    </div>
  )
}

export default App