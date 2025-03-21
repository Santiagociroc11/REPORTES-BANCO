import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { createWorker } from 'tesseract.js';
import { Upload, Loader } from 'lucide-react';

interface ReceiptScannerProps {
  onScanComplete: (text: string) => void;
}

export function ReceiptScanner({ onScanComplete }: ReceiptScannerProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const processImage = async (file: File) => {
    setLoading(true);
    setProgress(0);

    try {
      const worker = await createWorker({
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(parseInt(m.progress.toString()) * 100);
          }
        },
      });

      await worker.loadLanguage('spa');
      await worker.initialize('spa');
      
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      
      onScanComplete(text);
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processImage(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-600 hover:border-gray-500'
        }`}
      >
        <input {...getInputProps()} />
        {loading ? (
          <div className="space-y-4">
            <Loader className="h-8 w-8 animate-spin mx-auto text-blue-500" />
            <p className="text-gray-400">Procesando imagen... {progress}%</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="h-8 w-8 mx-auto text-gray-400" />
            <p className="text-gray-400">
              {isDragActive
                ? 'Suelta la imagen aquí'
                : 'Arrastra una imagen o haz clic para seleccionar'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}