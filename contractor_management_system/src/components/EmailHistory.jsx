function EmailHistory({ emailLogs, loading, error }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="whitespace-nowrap px-4 py-4">Contractor</th>
              <th className="whitespace-nowrap px-4 py-4">PO Number</th>
              <th className="whitespace-nowrap px-4 py-4">Reminder Type</th>
              <th className="whitespace-nowrap px-4 py-4">Recipient</th>
              <th className="whitespace-nowrap px-4 py-4">Date & Time</th>
              <th className="whitespace-nowrap px-4 py-4">Status</th>
              <th className="whitespace-nowrap px-4 py-4">Message</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  Loading email history...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-red-600">
                  {error}
                </td>
              </tr>
            ) : emailLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  No email reminders have been logged yet.
                </td>
              </tr>
            ) : (
              emailLogs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-800">
                    {log.contractorName || '—'}
                  </td>

                  <td className="whitespace-nowrap px-4 py-4">
                    {log.poNumber || '—'}
                  </td>

                  <td className="whitespace-nowrap px-4 py-4">
                    {log.reminderType || '—'}
                  </td>

                  <td className="whitespace-nowrap px-4 py-4">
                    {log.recipientEmail || '—'}
                  </td>

                  <td className="whitespace-nowrap px-4 py-4">
                    {log.sentAt
                      ? new Date(log.sentAt).toLocaleString('en-IN')
                      : '—'}
                  </td>

                  <td className="whitespace-nowrap px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        log.status === 'Sent'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {log.status || 'Unknown'}
                    </span>
                  </td>

                  <td className="min-w-48 px-4 py-4 text-slate-600">
                    {log.message || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
        {emailLogs.length} email log(s)
      </div>
    </div>
  )
}

export default EmailHistory