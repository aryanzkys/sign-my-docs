import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../config/supabase'
import '../App.css'

const ValidatePage = () => {
  const { token } = useParams()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const validateToken = async () => {
      try {
        const { data, error } = await supabase
          .from('signature_requests')
          .select('*')
          .eq('validation_token', token)
          .single()

        if (error) {
          throw error
        }

        if (!data) {
          setError('Invalid or expired validation token')
          return
        }

        setRequest(data)

        if (data.status !== 'validated') {
          await supabase
            .from('signature_requests')
            .update({ status: 'validated' })
            .eq('id', data.id)
        }
      } catch (error) {
        console.error('Error validating token:', error)
        setError('Error validating document. Token may be invalid or expired.')
      } finally {
        setLoading(false)
      }
    }

    validateToken()
  }, [token])

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
          <h2>Validating...</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Please wait while we verify the document</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="card" style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
          <h2 style={{ color: 'var(--error-color)', marginBottom: '1rem' }}>Validation Failed</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <a href="/" style={{ display: 'inline-block', marginTop: '2rem', color: '#667eea', textDecoration: 'none', fontWeight: '500' }}>
            ← Back to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
        <h1 style={{ marginBottom: '1rem', color: 'var(--success-color)' }}>
          Document Validated
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          This document has been verified as authentic
        </p>

        <div style={{ background: 'rgba(102, 126, 234, 0.05)', borderRadius: '8px', padding: '1.5rem', textAlign: 'left', marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Document Name:</strong>
            <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>{request.document_name}</p>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Signature Type:</strong>
            <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>{request.signature_type.toUpperCase()}</p>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Status:</strong>
            <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
              <span className="status-badge status-validated">{request.status.toUpperCase()}</span>
            </p>
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Submitted:</strong>
            <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
              {new Date(request.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          <p>This QR code validates that the document was signed by Aryan through the Sign My Docs system.</p>
          <p style={{ marginTop: '0.5rem' }}>Validation Token: <code style={{ background: '#f7fafc', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>{token}</code></p>
        </div>

        <a href="/" style={{ display: 'inline-block', color: '#667eea', textDecoration: 'none', fontWeight: '500' }}>
          ← Back to Home
        </a>
      </div>
    </div>
  )
}

export default ValidatePage
