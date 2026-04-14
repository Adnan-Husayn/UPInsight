
interface DropzoneProps {
  isDragging: boolean
  setIsDragging: (status: boolean) => void
  handleFiles: (files: FileList | null) => void
  maxFiles: number
}

export function Dropzone({ isDragging, setIsDragging, handleFiles, maxFiles }: DropzoneProps) {
  return (
    <div
      className={`dropzone ${isDragging ? 'dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragging(false)
        handleFiles(event.dataTransfer.files)
      }}
    >
      <div className="dropzone-card">
        <p className="dropzone-title">Drop multiple PDF statements here</p>
        <p className="dropzone-subtitle">
          Analyze PhonePe and Google Pay statements together in one local batch. Maximum {maxFiles} PDFs per upload. Your files never leave this device.
        </p>
        <div className="feature-list">
          <div className="feature-item">
            <strong>Local parsing</strong>
            <span>No server round-trips</span>
          </div>
          <div className="feature-item">
            <strong>Unified batch analysis</strong>
            <span>Merge GPay and PhonePe PDFs into one ledger</span>
          </div>
          <div className="feature-item">
            <strong>Upload limit</strong>
            <span>Up to {maxFiles} PDFs per run</span>
          </div>
        </div>
      </div>
    </div>
  )
}
