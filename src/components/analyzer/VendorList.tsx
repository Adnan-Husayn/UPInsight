import { formatCurrency } from '../../lib/analyzer'

interface VendorListProps {
  vendors: Array<{ vendor: string; amount: number; ratio: number }>
  totalExpense: number
  onVendorSelect?: (vendor: string) => void
}

export function VendorList({ vendors, totalExpense, onVendorSelect }: VendorListProps) {
  return (
    <div className="panel vendor-panel full-width">
      <div className="panel-header">
        <h3>Top merchants</h3>
      </div>
      <div className="vendor-table">
        {vendors.length === 0 ? (
          <p className="empty-text">No merchants found.</p>
        ) : (
          <table className="compact-table">
            <thead>
              <tr>
                <th>Merchant</th>
                <th>Share of spend</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {vendors.slice(0, 5).map((vendor) => {
                const realShare = totalExpense > 0 ? (vendor.amount / totalExpense) * 100 : 0
                const barWidth = Math.max(Math.min(vendor.ratio * 100, 100), 2)
                return (
                  <tr 
                    key={vendor.vendor} 
                    onClick={() => onVendorSelect?.(vendor.vendor)}
                    className="interactive-row"
                  >
                    <td className="vendor-name-cell">
                      <strong>{vendor.vendor}</strong>
                    </td>
                    <td className="vendor-share-cell">
                      <div className="vendor-share-track">
                        <div 
                          className="vendor-share-fill" 
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="mono muted text-xs">{realShare.toFixed(1)}%</span>
                    </td>
                    <td className="text-right mono font-medium">
                      {formatCurrency(vendor.amount)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
