'use client';

import { useEffect, useState } from 'react';
import { createSciphiClient } from '@/lib/sciphi-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const client = createSciphiClient();
        const response = await client.getDocuments();
        setDocuments(response.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch documents');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Uploaded Documents</h1>
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
                  {new Date(doc.metadata.upload_timestamp).toLocaleString()}
                </div>
                <div className="text-sm">
                  <span className="font-medium">User ID:</span>{' '}
                  {doc.metadata.uploaded_by_user_id}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Source:</span>{' '}
                  {doc.metadata.source}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {documents.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          No documents found. Upload some files to get started!
        </div>
      )}
    </div>
  );
} 