'use client';

import { useEffect, useState, useCallback } from 'react';
import { createSciphiClient } from '@/lib/sciphi-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDropzone } from 'react-dropzone';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

interface Document {
  id: string;
  metadata: {
    source: string;
    original_name: string;
    uploaded_by_user_id: string;
    uploaded_by_email: string;
    upload_timestamp: string;
  };
  ingestion_status: string;
  created_at: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const { user } = useAuth();
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    fetchDocuments()
      .then(() => setLoading(false))
      .catch(() => setLoading(false));
  }, [user, router]);

  const fetchDocuments = async () => {
    if (!user) return [];
    
    try {
      const client = createSciphiClient();
      const response = await client.getDocuments();
      setDocuments(response.results || []);
      return response.results;
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
      return [];
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      toast.error('Please sign in to upload documents');
      return;
    }

    try {
      setIsUploading(true);
      const client = createSciphiClient();

      for (const file of acceptedFiles) {
        const arrayBuffer = await file.arrayBuffer();
        await client.uploadDocument(
          {
            name: file.name,
            content: arrayBuffer,
            type: file.type
          },
          user.id,
          user.email || ''
        );
        toast.success(`Successfully uploaded ${file.name}`);
      }
      
      // Refresh the documents list
      fetchDocuments();
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  }, [user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading || !user
  });

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-lg">Loading documents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 max-w-xl text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => fetchDocuments()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-3xl font-bold">Document Management</h1>
          <Card className="p-4">
            <CardContent className="p-0">
              <div className="text-sm space-y-1">
                <div>
                  <span className="font-medium">Current User ID:</span>{' '}
                  <span className="font-mono">{user.id}</span>
                </div>
                <div>
                  <span className="font-medium">Email:</span>{' '}
                  {user.email || 'No email'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upload Documents</CardTitle>
            <CardDescription>
              Drag and drop files or click to select files to upload.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300'}
                ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}`}
            >
              <input {...getInputProps()} />
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p>Uploading...</p>
                </div>
              ) : isDragActive ? (
                <p>Drop the files here...</p>
              ) : (
                <p>Drag and drop files here, or click to select files</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <h2 className="text-2xl font-semibold mb-4">Uploaded Documents</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{doc.metadata.original_name}</CardTitle>
                <CardDescription>
                  Uploaded by: {doc.metadata.uploaded_by_email}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge variant={doc.ingestion_status === 'success' ? 'default' : 'secondary'}>
                      {doc.ingestion_status}
                    </Badge>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Uploaded:</span>{' '}
                    {new Date(doc.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
} 