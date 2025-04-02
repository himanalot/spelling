import { NextRequest, NextResponse } from 'next/server';
import { createSciphiClient } from '@/lib/sciphi-client';

export async function POST(request: NextRequest) {
  if (!process.env.NEXT_SCIPHI_API_KEY) {
    return NextResponse.json(
      { error: 'SciPhi API key not configured' },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'No valid file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer and get file info
    const buffer = await file.arrayBuffer();
    const fileName = 'name' in file ? file.name : 'unnamed-file';
    const fileType = 'type' in file ? file.type : 'application/octet-stream';

    // Get SciPhi client and upload
    const sciphi = createSciphiClient();
    const response = await sciphi.uploadDocument({
      name: fileName,
      content: buffer,
      type: fileType
    });

    return NextResponse.json({
      success: true,
      documentId: response.id,
      message: `Successfully uploaded ${fileName}`
    });

  } catch (error) {
    console.error('Upload error details:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to upload file',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 