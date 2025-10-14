import QRCode from 'qrcode'

export const generateQRCode = async (token) => {
  try {
    const url = `https://signme-aryan.netlify.app/validate/${token}`
    const qrCodeDataURL = await QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
    return qrCodeDataURL
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw error
  }
}

export const generateToken = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
