import { PDFDocument } from 'pdf-lib'

export const addImageToPDF = async (pdfBytes, imageDataUrl, x, y, width, height) => {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    const firstPage = pages[0]

    // Extract base64 data from data URL and convert to bytes
    let imageBytes
    if (imageDataUrl.startsWith('data:')) {
      // Extract the base64 part from the data URL
      const base64Data = imageDataUrl.split(',')[1]
      // Decode base64 to binary string
      const binaryString = atob(base64Data)
      // Convert binary string to Uint8Array
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      imageBytes = bytes
    } else {
      // If it's a URL, fetch it
      imageBytes = await fetch(imageDataUrl).then((res) => res.arrayBuffer())
    }
    
    let image
    if (imageDataUrl.startsWith('data:image/png') || imageDataUrl.includes('.png')) {
      image = await pdfDoc.embedPng(imageBytes)
    } else {
      image = await pdfDoc.embedJpg(imageBytes)
    }

    firstPage.drawImage(image, {
      x: x,
      y: y,
      width: width,
      height: height,
    })

    const pdfBytesModified = await pdfDoc.save()
    return pdfBytesModified
  } catch (error) {
    console.error('Error adding image to PDF:', error)
    throw error
  }
}

export const pdfToDataUrl = (pdfBytes) => {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  return URL.createObjectURL(blob)
}

export const downloadPDF = (pdfBytes, filename) => {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
