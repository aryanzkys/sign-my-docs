import { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { generateQRCode, generateToken } from '../utils/qrCode'
import '../App.css'

const AdminPage = () => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

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
      alert('Error fetching requests. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveRequest = async (request) => {
    if (!confirm(`Approve signature request from ${request.email}?`)) {
      return
    }

    setProcessing(true)
    try {
      console.log('Approving request:', request.id)
      
      // Generate QR code only for E-TTD requests
      let qrCodeUrl = null
      let validationToken = null

      if (request.signature_type === 'e-ttd') {
        console.log('Generating QR code for E-TTD request')
        
        // Generate unique validation token
        validationToken = generateToken()
        console.log('Validation token generated:', validationToken)
        
        // Generate QR code that points to validation URL
        qrCodeUrl = await generateQRCode(validationToken)
        console.log('QR code generated, data URL length:', qrCodeUrl.length)
      }

      // Update request with approval and QR code (for E-TTD)
      const { error: updateError } = await supabase
        .from('signature_requests')
        .update({ 
          status: 'approved',
          qr_code_url: qrCodeUrl,
          validation_token: validationToken,
          approved_at: new Date().toISOString()
        })
        .eq('id', request.id)

      if (updateError) throw updateError

      console.log('✅ Request approved successfully')
      alert('Request approved! User can now download their QR code from the Check Status page.')
      
      // Refresh requests
      await fetchRequests()
    } catch (error) {
      console.error('Error approving request:', error)
      alert('Error approving request. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleRejectRequest = async (request) => {
    const reason = prompt(`Enter rejection reason for ${request.email}:`)
    if (!reason) return

    setProcessing(true)
    try {
      const { error } = await supabase
        .from('signature_requests')
        .update({ 
          status: 'rejected',
          rejection_reason: reason,
          rejected_at: new Date().toISOString()
        })
        .eq('id', request.id)

      if (error) throw error

      alert('Request rejected.')
      await fetchRequests()
    } catch (error) {
      console.error('Error rejecting request:', error)
      alert('Error rejecting request. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      a.click()
      URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'status-pending', label: 'PENDING REVIEW' },
      approved: { class: 'status-validated', label: 'APPROVED' },
      rejected: { class: 'status-badge', label: 'REJECTED' },
      signed: { class: 'status-signed', label: 'SIGNED' },
    }
    const badge = badges[status] || { class: 'status-badge', label: status.toUpperCase() }
    return (
      <span className={`status-badge ${badge.class}`}>
        {badge.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading requests...</p>
        </div>
      </div>
    )
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const approvedRequests = requests.filter(r => r.status === 'approved')
  const otherRequests = requests.filter(r => !['pending', 'approved'].includes(r.status))

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '1200px', margin: '2rem auto' }}>
        <h1 style={{ 
          marginBottom: '0.5rem', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent' 
        }}>
          Admin Panel
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Review and approve signature requests. Users will download QR codes from the Check Status page.
        </p>

        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              Pending Requests ({pendingRequests.length})
            </h2>
            {pendingRequests.map((request) => (
              <div key={request.id} className="card" style={{ marginBottom: '1rem', background: 'rgba(255, 215, 0, 0.1)', borderLeft: '4px solid #ffa500' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    {request.document_name}
                  </h3>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <p><strong>Email:</strong> {request.email}</p>
                    <p><strong>Type:</strong> {request.signature_type.toUpperCase()}</p>
                    <p><strong>Submitted:</strong> {new Date(request.created_at).toLocaleString()}</p>
                    {request.message && <p><strong>Message:</strong> {request.message}</p>}
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    {getStatusBadge(request.status)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn"
                    onClick={() => handleDownload(request.document_url, request.document_name)}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    📄 View Document
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={() => handleApproveRequest(request)}
                    disabled={processing}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    ✅ Approve
                  </button>
                  <button
                    className="btn"
                    onClick={() => handleRejectRequest(request)}
                    disabled={processing}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', background: '#e53e3e', borderColor: '#e53e3e' }}
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Approved Requests Section */}
        {approvedRequests.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              Approved Requests ({approvedRequests.length})
            </h2>
            {approvedRequests.map((request) => (
              <div key={request.id} className="card" style={{ marginBottom: '1rem', background: 'rgba(72, 187, 120, 0.1)', borderLeft: '4px solid #48bb78' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    {request.document_name}
                  </h3>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <p><strong>Email:</strong> {request.email}</p>
                    <p><strong>Type:</strong> {request.signature_type.toUpperCase()}</p>
                    <p><strong>Approved:</strong> {new Date(request.approved_at).toLocaleString()}</p>
                    {request.signature_type === 'e-ttd' && request.validation_token && (
                      <p><strong>Validation Token:</strong> <code>{request.validation_token}</code></p>
                    )}
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    {getStatusBadge(request.status)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleDownload(request.document_url, request.document_name)}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    📄 View Document
                  </button>
                  {request.validation_token && (
                    <a
                      href={`/validate/${request.validation_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', textDecoration: 'none' }}
                    >
                      🔍 Validation Page
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Other Requests Section */}
        {otherRequests.length > 0 && (
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              Other Requests ({otherRequests.length})
            </h2>
            {otherRequests.map((request) => (
              <div key={request.id} className="card" style={{ marginBottom: '1rem', background: 'rgba(102, 126, 234, 0.05)' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    {request.document_name}
                  </h3>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <p><strong>Email:</strong> {request.email}</p>
                    <p><strong>Type:</strong> {request.signature_type.toUpperCase()}</p>
                    <p><strong>Date:</strong> {new Date(request.created_at).toLocaleString()}</p>
                    {request.rejection_reason && <p><strong>Rejection Reason:</strong> {request.rejection_reason}</p>}
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    {getStatusBadge(request.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {requests.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            <p>No signature requests yet.</p>
          </div>
        )}

        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <p><strong>Note:</strong> Approved users can download their QR codes from the <a href="/check" style={{ color: '#667eea' }}>Check Status</a> page.</p>
          <p style={{ marginTop: '0.5rem' }}>QR codes can be validated at <code>/validate/:token</code> pages.</p>
        </div>
      </div>
    </div>
  )
}

export default AdminPage
