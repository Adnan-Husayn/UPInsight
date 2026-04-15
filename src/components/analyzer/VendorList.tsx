import { formatCurrency } from '../../lib/analyzer'

interface VendorListProps {
  vendors: Array<{ vendor: string; amount: number; ratio: number }>
  onVendorSelect?: (vendor: string) => void
}

const tilePalette = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export function VendorList({ vendors, onVendorSelect }: VendorListProps) {
  return (
    <div className="panel vendor-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Merchant footprint</p>
          <h2>Top vendors</h2>
        </div>
      </div>
      <div className="vendor-grid">
        {vendors.length === 0 ? (
          <div className="empty-state-block">
            <p className="empty-text">Top vendors appear after import.</p>
            <div className="empty-preview-list">
              <span>Swiggy</span>
              <span>Amazon</span>
            </div>
          </div>
        ) : (
          vendors.map((vendor, index) => (
            <button
              type="button"
              key={vendor.vendor}
              className="vendor-tile interactive-list-item"
              style={{
                flexBasis: `${Math.max(vendor.ratio * 100, 24)}%`,
                borderColor: tilePalette[index % tilePalette.length],
                boxShadow: `inset 4px 0 0 ${tilePalette[index % tilePalette.length]}`,
              }}
              onClick={() => onVendorSelect?.(vendor.vendor)}
              aria-label={`${vendor.vendor}, ${formatCurrency(vendor.amount)}. Opens matching ledger rows.`}
            >
              <div className="vendor-tile-copy">
                <span>{vendor.vendor}</span>
                <strong>{formatCurrency(vendor.amount)}</strong>
              </div>
              <span className="drilldown-hint">Open ledger</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
