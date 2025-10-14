import QRCode from 'qrcode'

export const generateQRCode = async (token) => {
  try {
    const url = `https://signme-aryan.netlify.app/validate/${token}`
    console.log('Generating QR code for validation URL:', url)
    
    const qrCodeDataURL = await QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
    
    console.log('QR code generated successfully, data URL length:', qrCodeDataURL.length)
    return qrCodeDataURL
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw error
  }
}

export const generateToken = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
