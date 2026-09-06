import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Download, Trash2, Loader2, Star, Edit2, Check, X, LayoutGrid, List, Eye, AlertCircle, FolderInput } from 'lucide-react';

interface FileItem {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  telegram_file_id: string;
  message_id?: number | null;
  folder_id: string | null;
  created_at: string;
  deleted_at?: string | null;
}

interface FolderOption {
  id: string;
  name: string;
}

interface FileListProps {
  currentFolderId: string | null;
  searchQuery: string;
  refreshKey: number;
  onRefresh: () => void;
}

export default function FileList({ currentFolderId, searchQuery, refreshKey, onRefresh }: FileListProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [moveFile, setMoveFile] = useState<FileItem | null>(null);
  const [availableFolders, setAvailableFolders] = useState<FolderOption[]>([]);
  const [selectedDestFolder, setSelectedDestFolder] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchFiles = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('files')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (searchQuery.trim()) {
        query = query.ilike('name', `%${searchQuery.trim()}%`);
      } else {
        if (currentFolderId === null) {
          query = query.is('folder_id', null);
        } else {
          query = query.eq('folder_id', currentFolderId);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setFiles(data || []);
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [currentFolderId, searchQuery, refreshKey]);

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('files')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deleteId);

      if (error) throw error;
      
      setFiles(files.filter((file) => file.id !== deleteId));
      onRefresh();
      showToast('File moved to trash bin! 🗑️', 'success');
    } catch (err: any) {
      showToast('Failed to move file to trash: ' + err.message, 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const handleOpenMoveModal = async (file: FileItem) => {
    setMoveFile(file);
    setSelectedDestFolder(null);
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('id, name')
        .is('deleted_at', null)
        .order('name', { ascending: true });
      if (error) throw error;
      setAvailableFolders((data || []).filter(f => f.id !== file.folder_id));
    } catch (err) {
      console.error('Error fetching folders for move:', err);
    }
  };

  const handleExecuteMove = async () => {
    if (!moveFile) return;

    try {
      const { error } = await supabase
        .from('files')
        .update({ folder_id: selectedDestFolder })
        .eq('id', moveFile.id);

      if (error) throw error;

      setMoveFile(null);
      fetchFiles();
      onRefresh();
      showToast('File transported through warp pipe! 🚀', 'success');
    } catch (err: any) {
      showToast('Failed to move file: ' + err.message, 'error');
    }
  };

  const handleDownload = async (telegramFileId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('telegram-download', {
        body: { fileId: telegramFileId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
        showToast('Downloading power-up file...', 'success');
      }
    } catch (err: any) {
      showToast('Failed to download: ' + err.message, 'error');
    }
  };

  const handleOpenPreview = async (file: FileItem) => {
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke('telegram-download', {
        body: { fileId: file.telegram_file_id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.downloadUrl) {
        setPreviewUrl(data.downloadUrl);
      }
    } catch (err: any) {
      showToast('Failed to load preview', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveRename = async (id: string) => {
    if (!editName.trim()) return;

    try {
      const { error } = await supabase
        .from('files')
        .update({ name: editName.trim() })
        .eq('id', id);

      if (error) throw error;

      setFiles(files.map((file) => (file.id === id ? { ...file, name: editName.trim() } : file)));
      setEditingId(null);
      showToast('Power-up renamed successfully!', 'success');
    } catch (err: any) {
      showToast('Failed to rename: ' + err.message, 'error');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 text-yellow-300 animate-spin stroke-[3]" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mt-6 overflow-hidden relative">
      <div className="px-6 py-4 border-b-4 border-black bg-yellow-300 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-red-600 fill-red-600" />
          <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">Inventory Files</h3>
          <span className="text-xs font-black bg-white px-2.5 py-1 border-2 border-black rounded-lg ml-2">
            {files.length} ITEMS
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white p-1.5 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-2 border-black rounded-lg font-black text-xs transition-all ${
              viewMode === 'list' ? 'bg-[#e52521] text-white shadow-none' : 'bg-yellow-100 text-black hover:bg-yellow-200'
            }`}
          >
            <List className="w-4 h-4 stroke-[3]" /> LIST
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-2 border-black rounded-lg font-black text-xs transition-all ${
              viewMode === 'grid' ? 'bg-[#e52521] text-white shadow-none' : 'bg-yellow-100 text-black hover:bg-yellow-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4 stroke-[3]" /> GRID
          </button>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="text-5xl mb-3 animate-bounce">🍄</div>
          <h4 className="text-sm font-black text-slate-800 uppercase">A Wild Goomba Blocked Your Path!</h4>
          <p className="text-xs font-bold text-slate-400 mt-1">No power-ups found here. Drop a file to clear the stage!</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="divide-y-2 divide-black">
          {files.map((file) => (
            <div
              key={file.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'file', id: file.id }));
              }}
              className="px-6 py-4 flex items-center justify-between hover:bg-yellow-50/80 transition-colors cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1 mr-4 cursor-pointer" onClick={() => handleOpenPreview(file)}>
                <div className="p-2.5 bg-red-500 text-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <FileText className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0 flex-1">
                  {editingId === file.id ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2 py-1 text-sm font-bold border-2 border-black rounded-lg bg-yellow-50 focus:outline-none flex-1"
                        autoFocus
                      />
                      <button onClick={() => handleSaveRename(file.id)} className="p-1.5 bg-emerald-500 text-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-200 text-black border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <X className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-black text-slate-900 truncate hover:text-red-600 transition-colors">{file.name}</p>
                      <p className="text-xs font-bold text-slate-500">
                        {formatFileSize(file.size)} • {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {editingId !== file.id && (
                  <>
                    <button onClick={() => handleOpenPreview(file)} className="p-2.5 bg-emerald-400 text-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" title="Preview">
                      <Eye className="w-4 h-4 stroke-[3]" />
                    </button>
                    <button onClick={() => handleOpenMoveModal(file)} className="p-2.5 bg-purple-500 text-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" title="Move File">
                      <FolderInput className="w-4 h-4 stroke-[3]" />
                    </button>
                    <button onClick={() => { setEditingId(file.id); setEditName(file.name); }} className="p-2.5 bg-blue-400 text-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" title="Rename">
                      <Edit2 className="w-4 h-4 stroke-[3]" />
                    </button>
                  </>
                )}
                <button onClick={() => handleDownload(file.telegram_file_id)} className="p-2.5 bg-yellow-400 text-black border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" title="Download">
                  <Download className="w-4 h-4 stroke-[3]" />
                </button>
                <button onClick={() => setDeleteId(file.id)} className="p-2.5 bg-red-500 text-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" title="Move to Trash">
                  <Trash2 className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'file', id: file.id }));
              }}
              className="p-4 bg-yellow-50/50 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between cursor-grab active:cursor-grabbing"
            >
              <div className="cursor-pointer" onClick={() => handleOpenPreview(file)}>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-red-500 text-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <FileText className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] font-black bg-yellow-300 px-2 py-0.5 border-2 border-black rounded">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <p className="text-sm font-black text-slate-900 truncate mb-1 hover:text-red-600">{file.name}</p>
                <p className="text-[10px] font-bold text-slate-400 mb-4">{new Date(file.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-black/10">
                <button onClick={() => handleOpenPreview(file)} className="p-2 bg-emerald-400 text-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Eye className="w-3.5 h-3.5 stroke-[3]" />
                </button>
                <button onClick={() => handleOpenMoveModal(file)} className="p-2 bg-purple-500 text-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" title="Move">
                  <FolderInput className="w-3.5 h-3.5 stroke-[3]" />
                </button>
                <button onClick={() => { setEditingId(file.id); setEditName(file.name); }} className="p-2 bg-blue-400 text-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Edit2 className="w-3.5 h-3.5 stroke-[3]" />
                </button>
                <button onClick={() => handleDownload(file.telegram_file_id)} className="p-2 bg-yellow-400 text-black border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Download className="w-3.5 h-3.5 stroke-[3]" />
                </button>
                <button onClick={() => setDeleteId(file.id)} className="p-2 bg-red-500 text-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" title="Move to Trash">
                  <Trash2 className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {moveFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#fff3d1] border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full p-6">
            <h3 className="text-base font-black text-slate-900 uppercase mb-3">MOVE POWER-UP</h3>
            <p className="text-xs font-bold text-slate-600 mb-4 truncate">Select destination for: <span className="text-black font-black">{moveFile.name}</span></p>
            
            <div className="mb-6">
              <label className="block text-xs font-black uppercase text-slate-700 mb-2">Destination Folder:</label>
              <select
                value={selectedDestFolder || ''}
                onChange={(e) => setSelectedDestFolder(e.target.value ? e.target.value : null)}
                className="w-full px-3 py-2.5 bg-white border-2 border-black rounded-xl text-sm font-bold focus:outline-none"
              >
                <option value="">World 1-1 (Root Drive)</option>
                {availableFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={handleExecuteMove} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm">
                MOVE HERE
              </button>
              <button onClick={() => setMoveFile(null)} className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-black font-black border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#fff3d1] border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3 stroke-[2.5]" />
            <h3 className="text-base font-black text-slate-900 uppercase mb-2">MOVE POWER-UP TO TRASH?</h3>
            <p className="text-xs font-bold text-slate-600 mb-6">Are you sure you want to send this file to the trash bin?</p>
            <div className="flex justify-center gap-3">
              <button onClick={confirmDelete} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-black border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm">
                YES, TRASH IT
              </button>
              <button onClick={() => setDeleteId(null)} className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-black font-black border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {previewFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#fff3d1] border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-2xl w-full p-6 relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b-4 border-black mb-4">
              <h3 className="text-base font-black text-slate-900 uppercase truncate pr-4">
                🍄 PREVIEW: {previewFile.name}
              </h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-2 bg-red-500 text-white border-2 border-black rounded-xl hover:bg-red-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <X className="w-5 h-5 stroke-[3]" />
              </button>
            </div>

            <div className="min-h-[250px] max-h-[60vh] overflow-auto flex items-center justify-center bg-white border-4 border-black rounded-xl p-4 mb-6 shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.1)]">
              {previewLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-red-600 animate-spin stroke-[3]" />
                  <span className="text-xs font-black uppercase text-slate-700">Loading Power-Up Stream...</span>
                </div>
              ) : previewUrl ? (
                previewFile.mime_type.startsWith('image/') ? (
                  <img src={previewUrl} alt={previewFile.name} className="max-h-[50vh] object-contain rounded-lg border-2 border-black" />
                ) : (
                  <div className="text-center p-6">
                    <FileText className="w-16 h-16 text-red-500 mx-auto mb-2 stroke-[2]" />
                    <p className="text-sm font-black text-slate-800">Preview not available for this file type.</p>
                    <p className="text-xs font-bold text-slate-500 mt-1.5">Click download below to access the file.</p>
                  </div>
                )
              ) : (
                <p className="text-sm font-black text-red-600">Failed to retrieve preview stream.</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              {previewUrl && (
                <button
                  onClick={() => window.open(previewUrl, '_blank')}
                  className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-black border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4 stroke-[3]" /> DOWNLOAD
                </button>
              )}
              <button
                onClick={() => setPreviewFile(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-black font-black border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`px-5 py-3 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 font-black text-sm text-white ${
            toast.type === 'success' ? 'bg-[#22c55e]' : 'bg-[#e52521]'
          }`}>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 p-1 hover:bg-black/20 rounded-lg">
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}