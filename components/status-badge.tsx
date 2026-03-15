interface StatusBadgeProps {
  status: 'open' | 'customer_reply' | 'replied'
}

const statusConfig = {
  open: {
    label: 'Open',
    className: 'bg-blue-100 text-blue-700 ring-blue-200',
  },
  customer_reply: {
    label: 'Customer Reply',
    className: 'bg-amber-100 text-amber-700 ring-amber-200',
  },
  replied: {
    label: 'Replied',
    className: 'bg-green-100 text-green-700 ring-green-200',
  },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.open

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${config.className}`}
    >
      {config.label}
    </span>
  )
}
