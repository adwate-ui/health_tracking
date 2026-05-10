import { useEffect, useRef, useState } from 'react';
import { IconX, IconCamera } from '@tabler/icons-react';
import { Button } from './Button';

// Global declaration for BarcodeDetector API (which is a web standard, but not in all TS libs yet)
declare global {
  class BarcodeDetector {
    constructor(options?: { formats: string[] });
    detect(image: ImageBitmapSource): Promise<Array<{ rawValue: string; format: string }>>;
    static getSupportedFormats(): Promise<string[]>;
  }
  interface Window {
    BarcodeDetector: typeof BarcodeDetector;
  }
}

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onCancel: () => void;
}

export function BarcodeScanner({ onDetected, onCancel }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;
    let detector: BarcodeDetector | null = null;

    if (!('BarcodeDetector' in window)) {
      setError('Barcode scanning is not supported by your browser.');
      return;
    }

    detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for video to be ready before scanning
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            scan();
          };
        }
      } catch (err) {
        console.error('Camera access denied or unavailable', err);
        setError('Camera access denied or unavailable.');
      }
    }

    async function scan() {
      if (!videoRef.current || !detector) return;
      
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0 && barcodes[0]) {
          // Detected! Stop scanning and stream.
          onDetected(barcodes[0].rawValue);
          return;
        }
      } catch (err) {
        // Ignore frame errors
      }
      
      // Continue scanning
      animationFrameId = requestAnimationFrame(scan);
    }

    startCamera();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onDetected]);

  return (
    <div className="flex flex-col h-full absolute inset-0 z-10 bg-surface-base">
      <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-surface-raised relative z-20">
        <h3 className="text-h3 flex items-center gap-2">
          <IconCamera size={20} className="text-action-accent" /> Scan Barcode
        </h3>
        <button onClick={onCancel} className="p-1 text-text-tertiary hover:text-text-primary transition-colors">
          <IconX size={20} />
        </button>
      </div>
      
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="p-6 text-center">
            <p className="text-action-danger mb-4">{error}</p>
            <Button variant="secondary" onClick={onCancel}>Go back</Button>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              className="absolute inset-0 w-full h-full object-cover"
              playsInline 
              muted 
            />
            {/* Scanner overlay UI */}
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-64 h-48 border-2 border-action-accent/50 rounded-lg relative">
                <div className="absolute inset-x-0 top-1/2 h-[2px] bg-action-accent shadow-[0_0_8px_2px_rgba(192,72,40,0.5)] opacity-80 animate-pulse"></div>
              </div>
              <p className="mt-6 text-white text-small bg-black/50 px-3 py-1 rounded-full">
                Align barcode within frame
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
