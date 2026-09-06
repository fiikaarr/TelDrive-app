import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, HelpCircle, Loader2 } from 'lucide-react';

interface UploadBoxProps {
  currentFolderId: string | null;
  onUploadSuccess: () => void;
  onError: (message: string) => void;
}

export default function UploadBox({ currentFolderId, onUploadSuccess, onError }: UploadBoxProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('file', file);

      const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/functions/v1/telegram-upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();
      console.log("🔍 Telegram Upload Response Payload:", result);

      const telegramFileId = 
        result.fileId || 
        result.file_id || 
        result.telegram_file_id || 
        result.id ||
        result.result?.file_id || 
        result.result?.document?.file_id ||
        result.result?.video?.file_id ||
        result.result?.audio?.file_id ||
        result.result?.voice?.file_id ||
        (result.result?.photo && result.result.photo[result.result.photo.length - 1]?.file_id);

      if (!telegramFileId) {
        throw new Error(`Invalid payload structure. Keys received: ${Object.keys(result).join(', ')}`);
      }

      // Mengambil messageId dari respons Edge Function atau langsung dari result Telegram
      const telegramMessageId = 
        result.messageId || 
        result.message_id || 
        result.result?.message_id;

      const { error: dbError } = await supabase.from('files').insert({
        name: file.name,
        size: file.size,
        mime_type: file.type || 'application/octet-stream',
        telegram_file_id: telegramFileId,
        message_id: telegramMessageId, // <--- Menyimpan message_id untuk hapus fisik di Telegram
        user_id: session.user.id,
        folder_id: currentFolderId,
      });

      if (dbError) throw dbError;
      onUploadSuccess();
    } catch (err: any) {
      onError('Failed to upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`mb-6 max-w-3xl mx-auto p-4 bg-white rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer flex items-center justify-between gap-4 transition-all ${
        dragOver ? 'bg-yellow-100 scale-[1.01]' : 'hover:bg-yellow-50/50'
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
        className="hidden"
      />

      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-yellow-300 text-black border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex-shrink-0">
          <HelpCircle className="w-5 h-5 stroke-[3]" />
        </div>
        <div>
          <h4 className="text-xs font-black text-slate-900 uppercase">MYSTERY ITEM UPLOADER</h4>
          <p className="text-[11px] font-bold text-slate-500">Click or drag & drop files here for Telegram Cloud storage</p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex-shrink-0">
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin stroke-[3]" />
            <span>UPLOADING...</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 stroke-[3]" />
            <span>UPLOAD FILE</span>
          </>
        )}
      </div>
    </div>
  );
}