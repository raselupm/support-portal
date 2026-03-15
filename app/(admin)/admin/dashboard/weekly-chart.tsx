'use client'

interface ChartDay {
  day: string
  date: string
  count: number
}

interface WeeklyChartProps {
  data: ChartDay[]
}

export default function WeeklyChart({ data }: WeeklyChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="flex items-end gap-2 h-32 w-full justify-between px-2">
      {data.map((item) => {
        const pct = (item.count / maxCount) * 100
        return (
          <div key={item.date} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-xs text-gray-600 font-medium">{item.count > 0 ? item.count : ''}</span>
            <div className="w-full flex items-end" style={{ height: '80px' }}>
              <div
                className="w-full bg-blue-500 rounded-t transition-all duration-300"
                style={{ height: `${Math.max(pct, item.count > 0 ? 4 : 0)}%` }}
                title={`${item.date}: ${item.count} ticket${item.count !== 1 ? 's' : ''}`}
              />
            </div>
            <span className="text-xs text-gray-500">{item.day}</span>
          </div>
        )
      })}
    </div>
  )
}
