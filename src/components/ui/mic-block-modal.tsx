import { useState } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, RotateCcw, Eye } from 'lucide-react';

interface MicBlockModalProps {
  isOpen: boolean;
  onRetry: () => Promise<void>;
  onSpectate: () => void;
  onCancel: () => void;
}

export const MicBlockModal = ({ isOpen, onRetry, onSpectate, onCancel }: MicBlockModalProps) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <MicOff className="w-12 h-12 text-destructive" />
          </div>
          <AlertDialogTitle>Microphone Access Required</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Voice recognition is required to cast spells in this match. 
              Please allow microphone access to continue.
            </p>
            
            <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-sm font-medium mb-2">Troubleshooting:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Check browser permissions</li>
                <li>• Ensure microphone is connected</li>
                <li>• Try refreshing the page</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex gap-2 sm:gap-2 sm:flex-row">
          <Button 
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex items-center gap-2"
          >
            {isRetrying ? (
              <RotateCcw className="w-4 h-4 animate-spin" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
            {isRetrying ? 'Retrying...' : 'Retry Permission'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onSpectate}
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Spectate Mode
          </Button>
          
          <AlertDialogCancel onClick={onCancel}>
            Exit Match
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};