import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'error';
  onClose: () => void;
}

export default function Toast({ message, type = 'success', onClose }: ToastProps) {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce">
      <div className={`px-5 py-3 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 font-black text-sm ${
        type === 'success' ? 'bg-[#22c55e] text-white' : 'bg-[#e52521] text-white'
      }`}>
        {type === 'success' ? <CheckCircle2 className="w-5 h-5 stroke-[3]" /> : <AlertCircle className="w-5 h-5 stroke-[3]" />}
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 p-1 hover:bg-black/20 rounded-lg transition-colors">
          <X className="w-4 h-4 stroke-[3]" />
        </button>
      </div>
    </div>
  );
}