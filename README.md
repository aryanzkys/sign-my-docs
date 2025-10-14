# Sign My Docs

A modern web-based document signature request system that allows users to upload PDF documents and request signatures from Aryan. The system supports three signature modes: E-Signature with QR Code (E-TTD), Digital Signature (TDD Digital), and Wet Ink Signature (TTD Basah).

## Features

### User Features
- **Upload PDF documents** with email for signature requests
- **Three signature modes:**
  - **E-TTD**: E-Signature with QR Code validation
  - **TDD Digital**: Digital signature with scanned image
  - **TTD Basah**: Wet ink signature (physical)
- **Check document status** at `/check`
- **QR Code validation** at `/validate/:token`
- Clean, minimalist UI with smooth gradients
- Fully responsive design for desktop and mobile

### Admin Features
- **Admin panel** at `/admintte` for managing requests
- **Drag-and-drop signature placement** directly on PDFs
- **View all requests** with status tracking
- **Process signatures** with QR codes or signature images
- Download original and signed documents

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Supabase (PostgreSQL + Storage)
- **Routing**: React Router
- **PDF Handling**: pdf-lib
- **QR Code**: qrcode library
- **Styling**: Custom CSS with modern gradients

## Setup Instructions

### Prerequisites
- Node.js 16+ and npm
- Supabase account

### 1. Clone the Repository
```bash
git clone https://github.com/aryanzkys/sign-my-docs.git
cd sign-my-docs
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Supabase Setup

#### Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and anon key

#### Set Up Database
1. Go to the SQL Editor in your Supabase dashboard
2. Copy the contents of `supabase-schema.sql`
3. Run the SQL to create the table and policies

#### Create Storage Bucket
1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `documents`
3. Make it public
4. Set file size limit to 50MB
5. Set allowed MIME types: `application/pdf`, `image/png`, `image/jpeg`

### 4. Environment Configuration
1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Run the Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 6. Build for Production
```bash
npm run build
```

The production build will be in the `dist` folder.

## Deployment

### Deploy to Netlify

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Login to Netlify:
```bash
netlify login
```

3. Deploy:
```bash
netlify deploy --prod
```

4. Set environment variables in Netlify dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Routes

- `/` - Home page for uploading documents
- `/check` - Check document status
- `/admintte` - Admin panel (for Aryan)
- `/validate/:token` - Validate E-TTD signatures

## How It Works

### User Flow
1. User visits the home page
2. Enters email and uploads a PDF document
3. Selects signature type (E-TTD, TDD Digital, or TTD Basah)
4. Submits the request
5. Can check status at `/check` page

### Admin Flow (E-TTD & TDD Digital)
1. Admin logs in at `/admintte`
2. Views pending signature requests
3. Selects a request to process
4. For E-TTD: QR code is automatically generated and ready to place
5. For TDD Digital: Uploads a signature image
6. Drags and drops the signature/QR code onto the PDF
7. Applies the signature to create a signed document
8. Signed document is saved and available for download

### Validation Flow (E-TTD)
1. User scans the QR code on the signed document
2. QR code redirects to `/validate/:token`
3. System validates the token and displays document details
4. Document status is updated to "validated"

## Database Schema

### signature_requests
- `id` - UUID (Primary Key)
- `email` - User's email address
- `document_name` - Original document filename
- `document_url` - URL to uploaded document
- `signed_document_url` - URL to signed document
- `signature_type` - Type of signature (e-ttd, tdd-digital, ttd-basah)
- `validation_token` - Unique token for E-TTD validation
- `qr_code_url` - Data URL of QR code (for E-TTD)
- `status` - Request status (pending, signed, validated)
- `created_at` - Timestamp of creation
- `updated_at` - Timestamp of last update

## License

MIT License - see LICENSE file for details

## Author

Aryan Zaky Prayogo
