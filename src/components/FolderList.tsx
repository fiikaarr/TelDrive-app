import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Folder, Trash2, AlertCircle, Edit2, Check, X } from 'lucide-react';

interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
  deleted_at?: string | null;
}

interface FolderListProps {
  currentFolderId: string | null;
  onFolderClick: (id: string, name: string) => void;
  refreshKey: number;
  onRefresh: () => void;
  onDropItem: (e: React.DragEvent, targetFolderId: string | null) => void;
}

export default function FolderList({ currentFolderId, onFolderClick, refreshKey, onRefresh, onDropItem }: FolderListProps) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('folders')
        .select('*')
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (currentFolderId === null) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', currentFolderId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFolders(data || []);
    } catch (err) {
      console.error('Error fetching folders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, [currentFolderId, refreshKey]);

  const confirmDeleteFolder = async () => {
    if (!deleteFolderId) return;
    try {
      const { error } = await supabase
        .from('folders')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deleteFolderId);
        
      if (error) throw error;
      setFolders(folders.filter(f => f.id !== deleteFolderId));
      onRefresh();
    } catch (err: any) {
      alert('Failed to move folder to trash: ' + err.message);
    } finally {
      setDeleteFolderId(null);
    }
  };

  const handleSaveRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      const { error } = await supabase.from('folders').update({ name: editName.trim() }).eq('id', id);
      if (error) throw error;
      setFolders(folders.map(f => f.id === id ? { ...f, name: editName.trim() } : f));
      setEditingId(null);
      onRefresh();
    } catch (err: any) {
      alert('Failed to rename folder: ' + err.message);
    }
  };

  if (loading || folders.length === 0) return null;

  return (
    <div className="mb-6">
      <h4 className="text-xs font-black text-yellow-300 uppercase tracking-wider mb-3 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">
        🟢 Warp Pipe Folders
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {folders.map((folder) => (
          <div
            key={folder.id}
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'folder', id: folder.id }));
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverFolderId(folder.id);
            }}
            onDragLeave={() => setDragOverFolderId(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverFolderId(null);
              onDropItem(e, folder.id);
            }}
            onClick={() => onFolderClick(folder.id, folder.name)}
            className={`p-4 bg-white rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between cursor-pointer transition-all ${
              dragOverFolderId === folder.id ? 'bg-emerald-200 scale-105 border-emerald-700' : 'hover:bg-yellow-50'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
              <div className="p-2 bg-[#22c55e] text-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Folder className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1" onClick={(e) => editingId === folder.id && e.stopPropagation()}>
                {editingId === folder.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="px-2 py-1 text-xs font-bold border-2 border-black rounded bg-yellow-50 focus:outline-none w-full"
                      autoFocus
                    />
                    <button onClick={() => handleSaveRename(folder.id)} className="p-1 bg-emerald-500 text-white border border-black rounded">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 bg-slate-200 text-black border border-black rounded">
                      <X className="w-3 h-3 stroke-[3]" />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-black text-slate-900 truncate hover:text-[#22c55e]">{folder.name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {editingId !== folder.id && (
                <button
                  onClick={() => { setEditingId(folder.id); setEditName(folder.name); }}
                  className="p-2 bg-blue-400 text-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-500"
                  title="Rename"
                >
                  <Edit2 className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              )}
              <button
                onClick={() => setDeleteFolderId(folder.id)}
                className="p-2 bg-red-500 text-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-600"
                title="Move to Trash"
              >
                <Trash2 className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {deleteFolderId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#fff3d1] border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3 stroke-[2.5]" />
            <h3 className="text-base font-black text-slate-900 uppercase mb-2">MOVE PIPE FOLDER TO TRASH?</h3>
            <p className="text-xs font-bold text-slate-600 mb-6">Are you sure you want to send this folder to the trash bin?</p>
            <div className="flex justify-center gap-3">
              <button onClick={confirmDeleteFolder} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-black border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm">
                YES, TRASH IT
              </button>
              <button onClick={() => setDeleteFolderId(null)} className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-black font-black border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}