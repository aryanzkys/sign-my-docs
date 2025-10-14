-- Create signature_requests table
CREATE TABLE IF NOT EXISTS signature_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  signed_document_url TEXT,
  signature_type TEXT NOT NULL CHECK (signature_type IN ('e-ttd', 'tdd-digital', 'ttd-basah')),
  validation_token TEXT UNIQUE NOT NULL,
  qr_code_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'validated')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_signature_requests_email ON signature_requests(email);
CREATE INDEX IF NOT EXISTS idx_signature_requests_token ON signature_requests(validation_token);
CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON signature_requests(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_signature_requests_updated_at
  BEFORE UPDATE ON signature_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for production)
CREATE POLICY "Allow public read" ON signature_requests
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON signature_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON signature_requests
  FOR UPDATE USING (true);

-- Create storage bucket for documents
-- Note: This should be created in Supabase dashboard
-- Bucket name: documents
-- Public: true
-- File size limit: 50MB
-- Allowed MIME types: application/pdf, image/png, image/jpeg
