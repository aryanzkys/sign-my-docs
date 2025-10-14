import { PDFDocument } from 'pdf-lib'

export const addImageToPDF = async (pdfBytes, imageDataUrl, x, y, width, height, pageNumber = 0) => {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    const targetPage = pages[pageNumber] || pages[0]
    const pageHeight = targetPage.getHeight()
    const pageWidth = targetPage.getWidth()
    
    console.log('PDF page dimensions:', { width: pageWidth, height: pageHeight })
    console.log('Adding image at position (before transform):', { x, y, width, height })

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

    // In PDF coordinate system, (0,0) is bottom-left
    // The y coordinate passed in is from top, so we need to transform it
    const pdfY = pageHeight - y - height
    
    console.log('Final PDF coordinates:', { x, y: pdfY, width, height })
    
    targetPage.drawImage(image, {
      x: x,
      y: pdfY,
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

export const getPDFDimensions = async (pdfBytes) => {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    const firstPage = pages[0]
    return {
      width: firstPage.getWidth(),
      height: firstPage.getHeight(),
      pageCount: pages.length
    }
  } catch (error) {
    console.error('Error getting PDF dimensions:', error)
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
