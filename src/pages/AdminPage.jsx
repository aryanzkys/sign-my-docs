import { useState, useEffect, useRef } from 'react'
import { supabase } from '../config/supabase'
import { addImageToPDF } from '../utils/pdfUtils'
import '../App.css'

const AdminPage = () => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [signatureImage, setSignatureImage] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [signaturePosition, setSignaturePosition] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [showSignatureUpload, setShowSignatureUpload] = useState(false)
  const pdfViewerRef = useRef(null)
  const signatureRef = useRef(null)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('signature_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRequests(data)
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestSelect = async (request) => {
    setSelectedRequest(request)
    setPdfUrl(request.document_url)
    
    if (request.signature_type === 'e-ttd' && request.qr_code_url) {
      console.log('E-TTD request selected, loading QR code from URL')
      console.log('Validation token:', request.validation_token)
      console.log('QR code URL length:', request.qr_code_url?.length)
      setSignatureImage(request.qr_code_url)
      setShowSignatureUpload(false)
    } else {
      setSignatureImage(null)
      setShowSignatureUpload(true)
    }
  }

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSignatureImage(reader.result)
        setShowSignatureUpload(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleMouseDown = (e) => {
    if (signatureRef.current && signatureRef.current.contains(e.target)) {
      setIsDragging(true)
    }
  }

  const handleMouseMove = (e) => {
    if (isDragging && pdfViewerRef.current) {
      const rect = pdfViewerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - 50
      const y = e.clientY - rect.top - 50
      setSignaturePosition({ x, y })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleApplySignature = async () => {
    if (!selectedRequest || !signatureImage) return

    try {
      console.log('Starting signature application process...')
      console.log('Request type:', selectedRequest.signature_type)
      console.log('Signature image type:', signatureImage.substring(0, 30))
      
      const response = await fetch(selectedRequest.document_url)
      const pdfBytes = await response.arrayBuffer()
      console.log('Original PDF loaded, size:', pdfBytes.byteLength, 'bytes')

      const pdfViewerHeight = pdfViewerRef.current.offsetHeight
      const pdfActualY = pdfViewerHeight - signaturePosition.y - 100

      console.log('Embedding signature/QR at position:', { x: signaturePosition.x, y: pdfActualY })
      const modifiedPdfBytes = await addImageToPDF(
        pdfBytes,
        signatureImage,
        signaturePosition.x,
        pdfActualY,
        100,
        100
      )
      console.log('Modified PDF created, size:', modifiedPdfBytes.byteLength, 'bytes')

      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' })
      const fileName = `signed_${Date.now()}.pdf`
      
      console.log('Uploading signed PDF to storage...')
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, blob)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      console.log('Signed PDF uploaded, URL:', urlData.publicUrl)
      
      const { error: updateError } = await supabase
        .from('signature_requests')
        .update({
          signed_document_url: urlData.publicUrl,
          status: 'signed',
        })
        .eq('id', selectedRequest.id)

      if (updateError) throw updateError

      console.log('Database updated successfully')
      alert('Document signed successfully!')
      fetchRequests()
      setSelectedRequest(null)
      setPdfUrl(null)
      setSignatureImage(null)
    } catch (error) {
      console.error('Error applying signature:', error)
      alert('Error applying signature. Please try again.')
    }
  }

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'status-badge status-pending',
      signed: 'status-badge status-signed',
      validated: 'status-badge status-validated',
    }
    return statusClasses[status] || 'status-badge'
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', margin: '3rem auto' }}>
          <h2>Loading requests...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card" style={{ margin: '2rem auto' }}>
        <h1 style={{ marginBottom: '1rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Admin Panel
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Manage signature requests
        </p>

        {!selectedRequest ? (
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              Pending Requests ({requests.filter(r => r.status === 'pending').length})
            </h2>
            {requests.filter(r => r.status === 'pending').length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                No pending requests
              </p>
            ) : (
              requests.filter(r => r.status === 'pending').map((request) => (
                <div key={request.id} className="card" style={{ marginBottom: '1rem', background: 'rgba(102, 126, 234, 0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{request.document_name}</h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Email: {request.email}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Type: {request.signature_type.toUpperCase()}
                      </p>
                      <span className={getStatusBadge(request.status)}>{request.status.toUpperCase()}</span>
                    </div>
                    <button
                      className="btn"
                      onClick={() => handleRequestSelect(request)}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                      Process
                    </button>
                  </div>
                </div>
              ))
            )}

            <h2 style={{ fontSize: '1.25rem', marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              All Requests
            </h2>
            {requests.map((request) => (
              <div key={request.id} className="card" style={{ marginBottom: '1rem', background: 'rgba(102, 126, 234, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{request.document_name}</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Email: {request.email}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Type: {request.signature_type.toUpperCase()}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Submitted: {new Date(request.created_at).toLocaleDateString()}
                    </p>
                    <span className={getStatusBadge(request.status)}>{request.status.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSelectedRequest(null)
                setPdfUrl(null)
                setSignatureImage(null)
              }}
              style={{ marginBottom: '1rem' }}
            >
              ← Back to List
            </button>

            <div className="card" style={{ background: 'rgba(102, 126, 234, 0.05)', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>{selectedRequest.document_name}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Email: {selectedRequest.email}
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Type: {selectedRequest.signature_type.toUpperCase()}
              </p>
            </div>

            {showSignatureUpload && (
              <div className="card" style={{ marginBottom: '1rem' }}>
                <label className="label">Upload Signature Image</label>
                <input
                  type="file"
                  className="input"
                  accept="image/*"
                  onChange={handleSignatureUpload}
                />
              </div>
            )}

            {pdfUrl && (
              <div
                ref={pdfViewerRef}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                style={{
                  position: 'relative',
                  border: '2px solid var(--border-color)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  minHeight: '600px',
                  background: '#f7fafc',
                  marginBottom: '1rem',
                }}
              >
                <iframe
                  src={pdfUrl}
                  style={{ width: '100%', height: '600px', border: 'none' }}
                  title="PDF Viewer"
                />
                {signatureImage && (
                  <div
                    ref={signatureRef}
                    onMouseDown={handleMouseDown}
                    style={{
                      position: 'absolute',
                      left: `${signaturePosition.x}px`,
                      top: `${signaturePosition.y}px`,
                      cursor: isDragging ? 'grabbing' : 'grab',
                      border: '2px dashed #667eea',
                      padding: '4px',
                      background: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: '4px',
                    }}
                  >
                    <img
                      src={signatureImage}
                      alt="Signature"
                      style={{ width: '100px', height: '100px', pointerEvents: 'none' }}
                    />
                  </div>
                )}
              </div>
            )}

            {signatureImage && (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  className="btn btn-success"
                  onClick={handleApplySignature}
                  style={{ flex: 1 }}
                >
                  Apply Signature
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowSignatureUpload(true)}
                  style={{ flex: 1 }}
                >
                  Change Signature
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <a href="/" style={{ color: '#667eea', textDecoration: 'none', fontWeight: '500' }}>
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}

export default AdminPage
