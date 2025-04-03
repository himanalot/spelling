const SCIPHI_API_URL = 'https://api.sciphi.ai/v3';

export class SciphiClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('SciPhi API key is required');
    }
    this.apiKey = apiKey;
  }

  async getDocuments() {
    try {
      const response = await fetch(`${SCIPHI_API_URL}/documents`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Fetch documents error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`Failed to fetch documents: ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      return response.json();
    } catch (error) {
      console.error('Fetch documents error:', error);
      throw error;
    }
  }

  async getProfiles() {
    try {
      const response = await fetch(`${SCIPHI_API_URL}/profiles`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Fetch profiles error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`Failed to fetch profiles: ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      return response.json();
    } catch (error) {
      console.error('Fetch profiles error:', error);
      throw error;
    }
  }

  async uploadDocument(file: {
    name: string;
    content: ArrayBuffer;
    type: string;
  }, userId?: string, userEmail?: string) {
    try {
      const uploadUrl = `${SCIPHI_API_URL}/documents`;
      console.log('Uploading to:', uploadUrl); // Debug log
      
      const formData = new FormData();
      const blob = new Blob([file.content], { type: file.type });
      formData.append('file', blob, file.name);
      
      // Add metadata as a JSON string
      formData.append('metadata', JSON.stringify({
        source: 'web_upload',
        original_name: file.name,
        uploaded_by_user_id: userId || 'anonymous',
        uploaded_by_email: userEmail || 'anonymous',
        upload_timestamp: new Date().toISOString()
      }));
      
      // Add ingestion mode
      formData.append('ingestion_mode', 'hi-res');

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Upload error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`Upload failed: ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      return response.json();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }
}

export const createSciphiClient = () => {
  const apiKey = process.env.NEXT_PUBLIC_SCIPHI_API_KEY;
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_SCIPHI_API_KEY is not defined');
  }
  return new SciphiClient(apiKey);
}; 