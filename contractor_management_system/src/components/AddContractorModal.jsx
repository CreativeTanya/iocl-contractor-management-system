import { useState } from 'react'

const newPO = () => ({
nameOfWork: '',
poNumber: '',
startDate: '',
expiryDate: '',
amount: '',
amountPaid: '0',
dueDate: '',
})

const input =
'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

function Field({ label, children }) {
return (
<label className="block text-sm font-medium text-slate-700">
{label}
{children}
</label>
)
}

export default function AddContractorModal({ onClose, onSave }) {
const [form, setForm] = useState({
name: '',
email: '',
phone: '',
})

const [pos, setPos] = useState([newPO()])
const [error, setError] = useState('')
const [saving, setSaving] = useState(false)

const update = (event) => {
const { name, value } = event.target

setForm((current) => ({
  ...current,
  [name]: value,
}))

}

const updatePO = (index, key, value) => {
setPos((current) =>
current.map((po, i) =>
i === index ? { ...po, [key]: value } : po
)
)
}

async function save(event) {
  event.preventDefault()
  setError('')

  if (!form.name.trim()) {
    setError('Enter contractor name.')
    return
  }

  if (!pos.length) {
    setError('Add at least one purchase order.')
    return
  }

  for (let i = 0; i < pos.length; i++) {
    const po = pos[i]
    const amount = Number(po.amount)
    const paid = Number(po.amountPaid)

    if (
      
      !po.nameOfWork.trim() ||
      !po.poNumber.trim() ||
      !po.startDate ||
      !po.expiryDate ||
      !po.dueDate ||
      po.amount.trim() === '' ||
      po.amountPaid.trim() === ''
    ) {
      setError(`Complete all required fields in PO ${i + 1}.`)
      return
    }

    if (
      !Number.isFinite(amount) ||
      !Number.isFinite(paid) ||
      amount <= 0 ||
      paid < 0 ||
      paid > amount
    ) {
      setError(`Check the PO value and amount paid in PO ${i + 1}.`)
      return
    }

    if (po.expiryDate < po.startDate) {
      setError(
        `Validity End cannot be earlier than Contract Start in PO ${i + 1}.`
      )
      return
    }
  }

  setSaving(true)

  try {
    const record = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      purchaseOrders: pos.map((po) => ({
        
        nameOfWork: po.nameOfWork.trim(),
        poNumber: po.poNumber.trim(),
        startDate: po.startDate,
        expiryDate: po.expiryDate,
        amount: Number(po.amount),
        amountPaid: Number(po.amountPaid),
        dueDate: po.dueDate,
      })),
    }

    const success = await onSave(record)

    if (!success) {
      setSaving(false)
    }
  } catch {
    setError('Unable to save contractor. Please try again.')
    setSaving(false)
  }
}

return (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-6">
<div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
{/* Header */}
<div className="flex items-center justify-between bg-slate-900 px-6 py-5 text-white">
<div>
<h2 className="text-xl font-bold">Add Contractor</h2>
<p className="mt-1 text-sm text-slate-300">
Enter contractor details and purchase orders
</p>
</div>

      <button
        type="button"
        onClick={onClose}
        className="rounded-lg px-3 py-1 text-2xl hover:bg-white/10"
        aria-label="Close"
      >
        ×
      </button>
    </div>

    {/* Form */}
    <form onSubmit={save} className="overflow-y-auto p-5 sm:p-6">
      <h3 className="mb-4 font-semibold text-slate-800">
        Contractor Information
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vendor Details / Contractor Name *">
          <input
            className={input}
            name="name"
            type="text"
            value={form.name}
            onChange={update}
            required
          />
        </Field>

        <Field label="Email Address">
          <input
            className={input}
            name="email"
            type="email"
            value={form.email}
            onChange={update}
          />
        </Field>

        <Field label="Phone Number">
          <input
            className={input}
            name="phone"
            type="tel"
            value={form.phone}
            onChange={update}
            maxLength={10}
            inputMode="numeric"
          />
        </Field>
      </div>

      {/* Purchase Orders */}
      <div className="mb-4 mt-8 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-800">
          Purchase Orders
        </h3>

        <button
          type="button"
          onClick={() => setPos((current) => [...current, newPO()])}
          className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
        >
          + Add PO
        </button>
      </div>

      <div className="space-y-4">
        {pos.map((po, i) => (
          <section
            key={i}
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
          >
            <div className="mb-4 flex items-center justify-between">
              <h4 className="font-semibold text-slate-700">
                Purchase Order {i + 1}
              </h4>

              {pos.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setPos((current) =>
                      current.filter((_, index) => index !== i)
                    )
                  }
                  className="text-sm font-medium text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              

              <Field label="Name of Work *">
                <input
                  className={input}
                  type="text"
                  value={po.nameOfWork}
                  onChange={(event) =>
                    updatePO(i, 'nameOfWork', event.target.value)
                  }
                  required
                />
              </Field>

              <Field label="PO Number *">
                <input
                  className={input}
                  type="text"
                  value={po.poNumber}
                  onChange={(event) =>
                    updatePO(i, 'poNumber', event.target.value)
                  }
                  required
                />
              </Field>

              <Field label="PO Value (Excl. Tax) (₹) *">
                <input
                  className={input}
                  type="number"
                  min="0.01"
                  step="any"
                  value={po.amount}
                  onChange={(event) =>
                    updatePO(i, 'amount', event.target.value)
                  }
                  required
                />
              </Field>

              <Field label="Contract Start *">
                <input
                  className={input}
                  type="date"
                  value={po.startDate}
                  onChange={(event) =>
                    updatePO(i, 'startDate', event.target.value)
                  }
                  required
                />
              </Field>

              <Field label="Validity End *">
                <input
                  className={input}
                  type="date"
                  value={po.expiryDate}
                  min={po.startDate || undefined}
                  onChange={(event) =>
                    updatePO(i, 'expiryDate', event.target.value)
                  }
                  required
                />
              </Field>

              <Field label="Amount Paid (₹) *">
                <input
                  className={input}
                  type="number"
                  min="0"
                  step="any"
                  value={po.amountPaid}
                  onChange={(event) =>
                    updatePO(i, 'amountPaid', event.target.value)
                  }
                  required
                />
              </Field>

              <Field label="Payment Due Date *">
                <input
                  className={input}
                  type="date"
                  value={po.dueDate}
                  onChange={(event) =>
                    updatePO(i, 'dueDate', event.target.value)
                  }
                  required
                />
              </Field>

              <div className="rounded-lg border border-slate-200 bg-white p-3 sm:col-span-2">
                <p className="text-sm text-slate-500">
                  Remaining Amount
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  ₹
                  {Math.max(
                    0,
                    Number(po.amount || 0) -
                      Number(po.amountPaid || 0)
                  ).toLocaleString('en-IN', {
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Payment status will be calculated from the outstanding
                  amount and payment due date.
                </p>
              </div>
            </div>
          </section>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {/* Footer */}
      <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Contractor'}
        </button>
      </div>
    </form>
  </div>
</div>

)
}