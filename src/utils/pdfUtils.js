import { PDFDocument } from 'pdf-lib'

export const addImageToPDF = async (pdfBytes, imageDataUrl, x, y, width, height, pageNumber = 0) => {
  try {
    console.log('=== Starting PDF Image Embedding ===')
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    
    if (pages.length === 0) {
      throw new Error('PDF has no pages')
    }
    
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
      if (!base64Data) {
        throw new Error('Invalid data URL: no base64 data found')
      }
      console.log('Base64 data length:', base64Data.length)
      
      // Decode base64 to binary string
      const binaryString = atob(base64Data)
      console.log('Binary string length:', binaryString.length)
      
      // Convert binary string to Uint8Array
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      imageBytes = bytes
      console.log('Image bytes created, length:', imageBytes.length)
    } else {
      // If it's a URL, fetch it
      console.log('Fetching image from URL:', imageDataUrl)
      imageBytes = await fetch(imageDataUrl).then((res) => res.arrayBuffer())
      console.log('Fetched image bytes, length:', imageBytes.byteLength)
    }
    
    let image
    if (imageDataUrl.startsWith('data:image/png') || imageDataUrl.includes('.png')) {
      console.log('Embedding as PNG...')
      image = await pdfDoc.embedPng(imageBytes)
    } else if (imageDataUrl.startsWith('data:image/jp') || imageDataUrl.includes('.jpg') || imageDataUrl.includes('.jpeg')) {
      console.log('Embedding as JPEG...')
      image = await pdfDoc.embedJpg(imageBytes)
    } else {
      // Default to PNG for data URLs
      console.log('Unknown format, trying PNG...')
      try {
        image = await pdfDoc.embedPng(imageBytes)
      } catch (pngError) {
        console.log('PNG failed, trying JPEG...', pngError.message)
        image = await pdfDoc.embedJpg(imageBytes)
      }
    }
    
    console.log('Image embedded successfully, dimensions:', image.width, 'x', image.height)

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
    
    console.log('Image drawn on page successfully')

    // Save with options to preserve content
    const pdfBytesModified = await pdfDoc.save({
      useObjectStreams: false,  // Disable object streams for compatibility
      addDefaultPage: false,     // Don't add extra pages
      objectsPerTick: 50,        // Process in chunks to avoid memory issues
    })
    console.log('PDF saved, new size:', pdfBytesModified.byteLength, 'bytes')
    console.log('=== PDF Image Embedding Complete ===')
    
    return pdfBytesModified
  } catch (error) {
    console.error('!!! Error adding image to PDF !!!')
    console.error('Error details:', error)
    console.error('Stack trace:', error.stack)
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
