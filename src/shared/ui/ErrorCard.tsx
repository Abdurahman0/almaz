import { RefreshCw } from 'lucide-react';
import { Button } from './Button';
import type { ApiError } from '@/shared/api/client';

interface ErrorCardProps {
  error: unknown;
  onRetry?: () => void;
}

function messageOf(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as ApiError).message);
  }
  return "Noma'lum xatolik";
}

export function ErrorCard({ error, onRetry }: ErrorCardProps) {
  return (
    <div className="card-velvet flex flex-col items-center gap-4 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <RefreshCw className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-md font-semibold text-text">Xatolik yuz berdi</p>
        <p className="mt-1 text-sm text-muted">{messageOf(error)}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Qayta urinish
        </Button>
      )}
    </div>
  );
}
