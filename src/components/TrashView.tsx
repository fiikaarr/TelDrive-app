import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, RotateCcw, Folder, FileText, Loader2, AlertCircle } from 'lucide-react';

interface TrashItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  telegram_file_id?: string;
  message_id?: number | null;
  deleted_at: string;
}

interface TrashViewProps {
  onRestore: () => void;
}

export default function TrashView({ onRestore }: TrashViewProps) {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [permanentDeleteId, setPermanentDeleteId] = useState<TrashItem | null>(null);

  const fetchTrashItems = async () => {
    setLoading(true);
    try {
      const [filesRes, foldersRes] = await Promise.all([
        supabase.from('files').select('*').not('deleted_at', 'is', null),
        supabase.from('folders').select('*').not('deleted_at', 'is', null)
      ]);

      if (filesRes.error) throw filesRes.error;
      if (foldersRes.error) throw foldersRes.error;

      const mappedFiles: TrashItem[] = (filesRes.data || []).map(f => ({ ...f, type: 'file' }));
      const mappedFolders: TrashItem[] = (foldersRes.data || []).map(f => ({ ...f, type: 'folder' }));

      setItems([...mappedFiles, ...mappedFolders]);
    } catch (err) {
      console.error('Error fetching trash items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrashItems();
  }, []);

  const handleRestore = async (item: TrashItem) => {
    try {
      const table = item.type === 'file' ? 'files' : 'folders';
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: null })
        .eq('id', item.id);

      if (error) throw error;
      setItems(items.filter(i => i.id !== item.id));
      onRestore();
    } catch (err: any) {
      alert('Failed to restore item: ' + err.message);
    }
  };

  const confirmPermanentDelete = async () => {
    if (!permanentDeleteId) return;

    try {
      if (permanentDeleteId.type === 'file') {
        if (permanentDeleteId.message_id) {
          await supabase.functions.invoke('telegram-delete', {
            body: { messageId: permanentDeleteId.message_id },
          });
        }
        const { error } = await supabase.from('files').delete().eq('id', permanentDeleteId.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('folders').delete().eq('id', permanentDeleteId.id);
        if (error) throw error;
      }

      setItems(items.filter(i => i.id !== permanentDeleteId.id));
      onRestore();
    } catch (err: any) {
      alert('Failed to delete permanently: ' + err.message);
    } finally {
      setPermanentDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 text-yellow-300 animate-spin stroke-[3]" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mt-6 overflow-hidden">
      <div className="px-6 py-4 border-b-4 border-black bg-red-500 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 stroke-[2.5]" />
          <h3 className="text-base font-black uppercase tracking-wide">Trash Can (Bowser's Dungeon)</h3>
        </div>
        <span className="text-xs font-black bg-white text-black px-2.5 py-1 border-2 border-black rounded-lg">
          {items.length} ITEMS
        </span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="text-5xl mb-3 animate-bounce">🍄</div>
          <h4 className="text-sm font-black text-slate-800 uppercase">Trash Can is Empty!</h4>
          <p className="text-xs font-bold text-slate-400 mt-1">No deleted power-ups found here.</p>
        </div>
      ) : (
        <div className="divide-y-2 divide-black">
          {items.map((item) => (
            <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-red-50/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                <div className={`p-2.5 text-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${item.type === 'folder' ? 'bg-[#22c55e]' : 'bg-red-500'}`}>
                  {item.type === 'folder' ? <Folder className="w-5 h-5 stroke-[2.5]" /> : <FileText className="w-5 h-5 stroke-[2.5]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900 truncate">{item.name}</p>
                  <p className="text-xs font-bold text-slate-500">
                    Deleted on: {new Date(item.deleted_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRestore(item)}
                  className="px-3 py-2 bg-emerald-400 hover:bg-emerald-500 text-black font-black text-xs border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5"
                  title="Restore"
                >
                  <RotateCcw className="w-3.5 h-3.5 stroke-[3]" /> RESTORE
                </button>
                <button
                  onClick={() => setPermanentDeleteId(item)}
                  className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white font-black text-xs border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5"
                  title="Delete Permanently"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[3]" /> PURGE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {permanentDeleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#fff3d1] border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3 stroke-[2.5]" />
            <h3 className="text-base font-black text-slate-900 uppercase mb-2">PURGE PERMANENTLY?</h3>
            <p className="text-xs font-bold text-slate-600 mb-6">This item will be wiped completely from Telegram servers and database. Cannot be undone!</p>
            <div className="flex justify-center gap-3">
              <button onClick={confirmPermanentDelete} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-black border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm">
                YES, PURGE
              </button>
              <button onClick={() => setPermanentDeleteId(null)} className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-black font-black border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}