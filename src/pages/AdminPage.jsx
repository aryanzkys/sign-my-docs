import { useState, useEffect, useRef } from 'react'
import { supabase } from '../config/supabase'
import { addImageToPDF } from '../utils/pdfUtils'
import * as pdfjsLib from 'pdfjs-dist'
import 'pdfjs-dist/web/pdf_viewer.css'
import '../App.css'

// Configure PDF.js worker for version 5.x - use esm.sh CDN for proper ES module support
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
  console.log('PDF.js version:', pdfjsLib.version)
  console.log('WorkerSrc:', pdfjsLib.GlobalWorkerOptions.workerSrc)
}

const AdminPage = () => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [signatureImage, setSignatureImage] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [setPdfDoc] = useState(null)
  const [pdfPageDimensions, setPdfPageDimensions] = useState({ width: 595, height: 842 }) // A4 default
  const [signaturePosition, setSignaturePosition] = useState({ x: 100, y: 100 })
  const [signatureSize, setSignatureSize] = useState({ width: 100, height: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [showSignatureUpload, setShowSignatureUpload] = useState(false)
  const canvasRef = useRef(null)
  const signatureRef = useRef(null)
  const resizeHandleRef = useRef(null)

  useEffect(() => {
    fetchRequests()
  }, [])

  // Render PDF on canvas when URL changes
  useEffect(() => {
    if (pdfUrl && canvasRef.current) {
      renderPDF(pdfUrl)
    }
  }, [pdfUrl])

  const renderPDF = async (url) => {
    try {
      console.log('Loading PDF for canvas rendering:', url)
      console.log('PDF.js version:', pdfjsLib.version)
      console.log('WorkerSrc:', pdfjsLib.GlobalWorkerOptions.workerSrc)
      
      if (!canvasRef.current) {
        console.error('Canvas ref is not available')
        return
      }
      
      const loadingTask = pdfjsLib.getDocument({
        url: url,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
      })
      
      const pdf = await loadingTask.promise
      console.log('PDF loaded with', pdf.numPages, 'pages')
      setPdfDoc(pdf)
      
      // Get first page
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 1.0 })
      
      console.log('PDF page dimensions:', { width: viewport.width, height: viewport.height })
      
      // Store actual PDF dimensions
      setPdfPageDimensions({
        width: viewport.width,
        height: viewport.height
      })
      
      // Set canvas size to match PDF
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      // Set canvas internal dimensions
      canvas.width = viewport.width
      canvas.height = viewport.height
      
      console.log('Canvas dimensions set:', { width: canvas.width, height: canvas.height })
      
      // Render PDF page
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }
      
      await page.render(renderContext)
      console.log('✅ Page rendered successfully')
      console.log('Canvas size:', canvas.width, 'x', canvas.height)
      console.log('Canvas style:', canvas.style.width, 'x', canvas.style.height)
    } catch (error) {
      console.error('❌ Error loading PDF:', error)
      console.error('Error details:', error.message, error.stack)
      alert(`Error loading PDF: ${error.message}`)
    }
  }

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
    if (resizeHandleRef.current && resizeHandleRef.current.contains(e.target)) {
      setIsResizing(true)
      e.stopPropagation()
    } else if (signatureRef.current && signatureRef.current.contains(e.target)) {
      setIsDragging(true)
    }
  }

  const handleMouseMove = (e) => {
    if (!canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    if (isDragging) {
      // Dragging - move the QR code
      const newX = Math.max(0, Math.min(mouseX - signatureSize.width / 2, pdfPageDimensions.width - signatureSize.width))
      const newY = Math.max(0, Math.min(mouseY - signatureSize.height / 2, pdfPageDimensions.height - signatureSize.height))
      setSignaturePosition({ x: newX, y: newY })
    } else if (isResizing) {
      // Resizing - adjust size
      const newWidth = Math.max(50, Math.min(mouseX - signaturePosition.x, pdfPageDimensions.width - signaturePosition.x))
      const newHeight = Math.max(50, Math.min(mouseY - signaturePosition.y, pdfPageDimensions.height - signaturePosition.y))
      setSignatureSize({ width: newWidth, height: newHeight })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsResizing(false)
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

      // Use exact PDF coordinates - no scaling needed since canvas matches PDF dimensions
      console.log('PDF page dimensions:', pdfPageDimensions)
      console.log('QR code position (PDF points):', signaturePosition)
      console.log('QR code size (PDF points):', signatureSize)
      
      const modifiedPdfBytes = await addImageToPDF(
        pdfBytes,
        signatureImage,
        signaturePosition.x,
        signaturePosition.y,
        signatureSize.width,
        signatureSize.height
      )
      console.log('Modified PDF created, size:', modifiedPdfBytes.byteLength, 'bytes')
      
      // Log size comparison (PDF libraries can optimize/compress, so size may vary)
      const sizeDiff = modifiedPdfBytes.byteLength - pdfBytes.byteLength
      if (sizeDiff > 0) {
        console.log('✓ Modified PDF is larger than original by', sizeDiff, 'bytes')
      } else if (sizeDiff < 0) {
        console.log('ℹ Modified PDF is smaller by', Math.abs(sizeDiff), 'bytes (likely due to PDF optimization)')
      } else {
        console.log('ℹ Modified PDF has same size as original (PDF was likely re-compressed)')
      }
      console.log('✓ QR code embedding completed successfully')

      // CRITICAL: Download the modified PDF locally to verify QR code is embedded
      console.log('Creating local download for verification...')
      const verifyBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' })
      const verifyUrl = URL.createObjectURL(verifyBlob)
      const verifyLink = document.createElement('a')
      verifyLink.href = verifyUrl
      verifyLink.download = `VERIFY_signed_${selectedRequest.document_name}`
      verifyLink.click()
      URL.revokeObjectURL(verifyUrl)
      console.log('✓ Verification PDF downloaded - please check if QR code is present!')
      
      // Ask user to verify before uploading
      const shouldUpload = confirm(
        'PDF with QR code has been downloaded for verification.\n\n' +
        'Please open the downloaded file and verify the QR code is visible.\n\n' +
        'Click OK to continue uploading to storage.\n' +
        'Click Cancel to abort.'
      )
      
      if (!shouldUpload) {
        console.log('Upload cancelled by user')
        alert('Upload cancelled. The modified PDF was not uploaded.')
        return
      }
      
      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' })
      const fileName = `signed_${Date.now()}.pdf`
      
      console.log('Uploading signed PDF to storage...')
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, blob)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      console.log('Signed PDF uploaded, URL:', urlData.publicUrl)
      
      // Verify the upload by fetching the file back
      console.log('Verifying uploaded file...')
      const verifyResponse = await fetch(urlData.publicUrl)
      const verifyBytes = await verifyResponse.arrayBuffer()
      console.log('Verified uploaded file size:', verifyBytes.byteLength, 'bytes')
      
      if (verifyBytes.byteLength !== modifiedPdfBytes.byteLength) {
        console.error('ERROR: Uploaded file size does not match modified PDF!')
        console.error('Expected:', modifiedPdfBytes.byteLength, 'Got:', verifyBytes.byteLength)
        alert('Warning: There may be an issue with the uploaded file. File sizes do not match!')
      } else {
        console.log('✓ Upload verification successful - file sizes match')
      }
      
      const { error: updateError } = await supabase
        .from('signature_requests')
        .update({
          signed_document_url: urlData.publicUrl,
          status: 'signed',
        })
        .eq('id', selectedRequest.id)

      if (updateError) throw updateError

      console.log('Database updated successfully')
      console.log('=== SIGNATURE APPLICATION COMPLETE ===')
      console.log('Signed document URL:', urlData.publicUrl)
      console.log('User can now download from /check page')
      
      alert(`Document signed successfully!\n\nSigned PDF URL: ${urlData.publicUrl}\n\nYou can verify the QR code is embedded by opening this URL.`)
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

            {selectedRequest.signature_type === 'e-ttd' && signatureImage && (
              <div style={{ 
                marginBottom: '1rem', 
                padding: '1rem', 
                background: 'rgba(102, 126, 234, 0.1)', 
                borderRadius: '8px',
                border: '1px solid rgba(102, 126, 234, 0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>✓</span>
                  <strong style={{ color: 'var(--text-primary)' }}>QR Code Ready</strong>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.5rem 0' }}>
                  The E-TTD QR code has been generated and is ready to place on the document.
                  Drag it to the desired position and click "Apply Signature" to embed it permanently.
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
                  <strong>Validation URL:</strong> <code style={{ background: 'rgba(255,255,255,0.5)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                    https://signme-aryan.netlify.app/validate/{selectedRequest.validation_token}
                  </code>
                </p>
              </div>
            )}

            {pdfUrl && (
              <div
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                style={{
                  position: 'relative',
                  border: '2px solid var(--border-color)',
                  borderRadius: '8px',
                  overflow: 'auto',
                  background: '#f7fafc',
                  marginBottom: '1rem',
                  display: 'block',
                  width: 'fit-content',
                  maxWidth: '100%',
                }}
              >
                <canvas
                  ref={canvasRef}
                  style={{ 
                    display: 'block',
                    border: '1px solid #ccc',
                    backgroundColor: 'white',
                  }}
                />
                {signatureImage && (
                  <div
                    ref={signatureRef}
                    onMouseDown={handleMouseDown}
                    style={{
                      position: 'absolute',
                      left: `${signaturePosition.x}px`,
                      top: `${signaturePosition.y}px`,
                      width: `${signatureSize.width}px`,
                      height: `${signatureSize.height}px`,
                      cursor: isDragging ? 'grabbing' : 'grab',
                      border: selectedRequest?.signature_type === 'e-ttd' 
                        ? '3px dashed #667eea' 
                        : '2px dashed #667eea',
                      padding: '4px',
                      background: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '4px',
                      boxShadow: isDragging 
                        ? '0 8px 16px rgba(102, 126, 234, 0.3)' 
                        : '0 2px 8px rgba(0, 0, 0, 0.15)',
                      transition: 'box-shadow 0.2s ease',
                    }}
                  >
                    <img
                      src={signatureImage}
                      alt={selectedRequest?.signature_type === 'e-ttd' ? 'QR Code' : 'Signature'}
                      style={{ width: '100%', height: '100%', pointerEvents: 'none', display: 'block', objectFit: 'contain' }}
                    />
                    {selectedRequest?.signature_type === 'e-ttd' && (
                      <div style={{
                        position: 'absolute',
                        top: '-24px',
                        left: '0',
                        right: '0',
                        textAlign: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        color: '#667eea',
                        background: 'rgba(255, 255, 255, 0.95)',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        border: '1px solid #667eea',
                      }}>
                        QR CODE
                      </div>
                    )}
                    {/* Resize handle */}
                    <div
                      ref={resizeHandleRef}
                      onMouseDown={handleMouseDown}
                      style={{
                        position: 'absolute',
                        right: '0',
                        bottom: '0',
                        width: '16px',
                        height: '16px',
                        background: '#667eea',
                        cursor: 'nwse-resize',
                        borderRadius: '0 0 4px 0',
                      }}
                    />
                  </div>
                )}
                {/* Display precise coordinates */}
                {signatureImage && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    border: '1px solid #667eea',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  }}>
                    <div><strong>Position (PDF points):</strong></div>
                    <div>X: {Math.round(signaturePosition.x)}, Y: {Math.round(signaturePosition.y)}</div>
                    <div><strong>Size (PDF points):</strong></div>
                    <div>W: {Math.round(signatureSize.width)}, H: {Math.round(signatureSize.height)}</div>
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
