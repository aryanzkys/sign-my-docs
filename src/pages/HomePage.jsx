import { useState } from 'react'
import { supabase } from '../config/supabase'
import { generateToken, generateQRCode } from '../utils/qrCode'
import '../App.css'

const HomePage = () => {
  const [email, setEmail] = useState('')
  const [file, setFile] = useState(null)
  const [signatureType, setSignatureType] = useState('e-ttd')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
      setMessage('')
    } else {
      setMessage('Please select a valid PDF file')
      setFile(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email || !file) {
      setMessage('Please fill in all fields')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const token = generateToken()
      let qrCodeUrl = null

      if (signatureType === 'e-ttd') {
        qrCodeUrl = await generateQRCode(token)
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      const { error: insertError } = await supabase
        .from('signature_requests')
        .insert([
          {
            email: email,
            document_name: file.name,
            document_url: urlData.publicUrl,
            signature_type: signatureType,
            validation_token: token,
            qr_code_url: qrCodeUrl,
            status: 'pending',
          },
        ])

      if (insertError) {
        throw insertError
      }

      setMessage('Document uploaded successfully! You can check the status at /check')
      setEmail('')
      setFile(null)
      setSignatureType('e-ttd')
    } catch (error) {
      console.error('Error uploading document:', error)
      setMessage('Error uploading document. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '600px', margin: '3rem auto' }}>
        <h1 style={{ marginBottom: '1rem', textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Sign My Docs
        </h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Upload your PDF document and request a signature from Aryan
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="email">
              Your Email
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

          <div className="form-group">
            <label className="label" htmlFor="file">
              PDF Document
            </label>
            <input
              id="file"
              type="file"
              className="input"
              accept=".pdf"
              onChange={handleFileChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Signature Type</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="e-ttd"
                  checked={signatureType === 'e-ttd'}
                  onChange={(e) => setSignatureType(e.target.value)}
                  style={{ marginRight: '0.5rem' }}
                />
                <div>
                  <strong>E-Signature with QR Code (E-TTD)</strong>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                    QR code validation for digital authenticity
                  </p>
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="tdd-digital"
                  checked={signatureType === 'tdd-digital'}
                  onChange={(e) => setSignatureType(e.target.value)}
                  style={{ marginRight: '0.5rem' }}
                />
                <div>
                  <strong>Digital Signature (TDD Digital)</strong>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                    Scanned signature image placement
                  </p>
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="ttd-basah"
                  checked={signatureType === 'ttd-basah'}
                  onChange={(e) => setSignatureType(e.target.value)}
                  style={{ marginRight: '0.5rem' }}
                />
                <div>
                  <strong>Wet Ink Signature (TTD Basah)</strong>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                    Physical signature on printed document
                  </p>
                </div>
              </label>
            </div>
          </div>

          <button type="submit" className="btn" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? 'Uploading...' : 'Submit Request'}
          </button>
        </form>

        {message && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            borderRadius: '8px',
            background: message.includes('success') ? '#d1fae5' : '#fed7d7',
            color: message.includes('success') ? '#065f46' : '#742a2a',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <a href="/check" style={{ color: '#667eea', textDecoration: 'none', fontWeight: '500' }}>
            Check Status
          </a>
          {' | '}
          <a href="/admintte" style={{ color: '#667eea', textDecoration: 'none', fontWeight: '500' }}>
            Admin
          </a>
        </div>
      </div>
    </div>
  )
}

export default HomePage
