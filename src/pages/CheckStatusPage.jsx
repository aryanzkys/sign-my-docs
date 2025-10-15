import { useState } from 'react'
import { supabase } from '../config/supabase'
import '../App.css'

const CheckStatusPage = () => {
  const [email, setEmail] = useState('')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleCheck = async (e) => {
    e.preventDefault()
    
    if (!email) {
      setMessage('Please enter your email')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const { data, error } = await supabase
        .from('signature_requests')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      if (data.length === 0) {
        setMessage('No requests found for this email')
      }

      setRequests(data)
    } catch (error) {
      console.error('Error fetching requests:', error)
      setMessage('Error fetching requests. Please try again.')
    } finally {
      setLoading(false)
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
    const statusClasses = {
      pending: 'status-badge status-pending',
      signed: 'status-badge status-signed',
      validated: 'status-badge status-validated',
    }
    return statusClasses[status] || 'status-badge'
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '800px', margin: '3rem auto' }}>
        <h1 style={{ marginBottom: '1rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Check Document Status
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Enter your email to view all your signature requests
        </p>
        <div style={{ 
          padding: '1rem', 
          marginBottom: '2rem', 
          borderRadius: '8px', 
          background: 'rgba(102, 126, 234, 0.1)', 
          border: '1px solid rgba(102, 126, 234, 0.3)' 
        }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0 }}>
            💡 <strong>How it works:</strong> After admin approval, download your QR code and manually embed it into your PDF document. Use the verify link to confirm authenticity.
          </p>
        </div>

        <form onSubmit={handleCheck}>
          <div className="form-group">
            <label className="label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <button type="submit" className="btn" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Checking...' : 'Check Status'}
          </button>
        </form>

        {message && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            borderRadius: '8px',
            background: '#fed7d7',
            color: '#742a2a',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        {requests.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              Your Requests
            </h2>
            {requests.map((request) => (
              <div key={request.id} className="card" style={{ marginBottom: '1rem', background: 'rgba(102, 126, 234, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                      {request.document_name}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Type: {request.signature_type.toUpperCase()}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Submitted: {new Date(request.created_at).toLocaleDateString()}
                    </p>
                    <span className={getStatusBadge(request.status)}>
                      {request.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {request.document_url && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleDownload(request.document_url, request.document_name)}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      >
                        📄 Download Original
                      </button>
                    )}
                    {request.qr_code_url && (request.status === 'validated' || request.status === 'signed') && (
                      <button
                        className="btn btn-success"
                        onClick={() => handleDownload(request.qr_code_url, `QR_${request.document_name.replace('.pdf', '')}.png`)}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      >
                        📥 Download QR Code
                      </button>
                    )}
                    {request.signed_document_url && (
                      <button
                        className="btn btn-success"
                        onClick={() => handleDownload(request.signed_document_url, `signed_${request.document_name}`)}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      >
                        📥 Download Signed
                      </button>
                    )}
                    {request.validation_token && (
                      <a
                        href={`/validate/${request.validation_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', textDecoration: 'none' }}
                      >
                        🔍 Verify QR Code
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
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

export default CheckStatusPage
