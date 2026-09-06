import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import UploadBox from './components/UploadBox';
import FileList from './components/FileList';
import FolderList from './components/FolderList';
import TrashView from './components/TrashView';
import { Cloud, LogOut, ChevronRight, ChevronDown, HardDrive, Search, Plus, Sparkles, Folder, X, Trash2 } from 'lucide-react';

interface FolderNode {
  id: string;
  name: string;
  children?: FolderNode[];
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'World 1-1 (My Drive)' },
  ]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [totalStorage, setTotalStorage] = useState(0);
  const [sidebarFolders, setSidebarFolders] = useState<FolderNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<{ [key: string]: boolean }>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchStorageUsage();
        fetchNestedFolders();
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchStorageUsage();
        fetchNestedFolders();
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshKey]);

  const fetchStorageUsage = async () => {
    try {
      const { data, error } = await supabase.from('files').select('size').is('deleted_at', null);
      if (error) throw error;
      const total = (data || []).reduce((acc, file) => acc + (file.size || 0), 0);
      setTotalStorage(total);
    } catch (err) {
      console.error('Error fetching storage:', err);
    }
  };

  const fetchNestedFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('id, name, parent_id')
        .is('deleted_at', null)
        .order('name', { ascending: true });
      
      if (error) throw error;

      const folderMap: { [key: string]: FolderNode & { children: FolderNode[] } } = {};
      const roots: FolderNode[] = [];

      (data || []).forEach((f: any) => {
        folderMap[f.id] = { id: f.id, name: f.name, children: [] };
      });

      (data || []).forEach((f: any) => {
        if (f.parent_id === null) {
          roots.push(folderMap[f.id]);
        } else if (folderMap[f.parent_id]) {
          folderMap[f.parent_id].children.push(folderMap[f.id]);
        }
      });

      setSidebarFolders(roots);
    } catch (err) {
      console.error('Error fetching nested folders:', err);
    }
  };

  const toggleExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || currentFolderId === 'trash') return;

    try {
      const { error } = await supabase.from('folders').insert({
        name: newFolderName.trim(),
        user_id: session.user.id,
        parent_id: currentFolderId,
      });

      if (error) throw error;
      setNewFolderName('');
      setIsCreatingFolder(false);
      setRefreshKey(prev => prev + 1);
      fetchNestedFolders();
      showToast('Princess Peach unlocked a new Warp Pipe! 🟢', 'success');
    } catch (err: any) {
      showToast('Failed to create folder: ' + err.message, 'error');
    }
  };

  const navigateToFolder = (id: string | null, name: string) => {
    setCurrentFolderId(id);
    if (id === null) {
      setFolderPath([{ id: null, name: 'World 1-1 (My Drive)' }]);
    } else if (id === 'trash') {
      setFolderPath([{ id: null, name: 'World 1-1 (My Drive)' }, { id: 'trash', name: 'Trash Can' }]);
    } else {
      const index = folderPath.findIndex(f => f.id === id);
      if (index !== -1) {
        setFolderPath(folderPath.slice(0, index + 1));
      } else {
        setFolderPath([...folderPath, { id, name }]);
      }
    }
  };

  const handleDropItem = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    if (targetFolderId === 'trash') return;
    const rawData = e.dataTransfer.getData('text/plain');
    if (!rawData) return;

    try {
      const data = JSON.parse(rawData);
      if (data.type === 'file') {
        const { error } = await supabase
          .from('files')
          .update({ folder_id: targetFolderId })
          .eq('id', data.id);
        if (error) throw error;
        setRefreshKey(prev => prev + 1);
        showToast('Power-up moved successfully! 🚀', 'success');
      } else if (data.type === 'folder') {
        if (data.id === targetFolderId) return;
        const { error } = await supabase
          .from('folders')
          .update({ parent_id: targetFolderId })
          .eq('id', data.id);
        if (error) throw error;
        setRefreshKey(prev => prev + 1);
        fetchNestedFolders();
        showToast('Warp pipe re-routed successfully! 🟢', 'success');
      }
    } catch (err: any) {
      showToast('Failed to move item: ' + err.message, 'error');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderFolderTree = (nodes: FolderNode[], level = 1) => {
    return nodes.map((folder) => {
      const hasChildren = folder.children && folder.children.length > 0;
      const isExpanded = expandedFolders[folder.id];

      return (
        <div key={folder.id} className="space-y-1">
          <div
            onClick={() => navigateToFolder(folder.id, folder.name)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.stopPropagation();
              handleDropItem(e, folder.id);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-black text-xs border-2 border-black transition-all cursor-pointer ${
              currentFolderId === folder.id 
                ? 'bg-yellow-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                : 'bg-white text-slate-700 hover:bg-emerald-50'
            }`}
            style={{ marginLeft: `${level * 8}px`, width: `calc(100% - ${level * 8}px)` }}
          >
            <div className="flex items-center gap-2 truncate">
              <Folder className="w-4 h-4 text-[#22c55e] fill-emerald-100 flex-shrink-0" />
              <span className="truncate">{folder.name}</span>
            </div>
            {hasChildren && (
              <button onClick={(e) => toggleExpand(folder.id, e)} className="p-0.5 hover:bg-black/10 rounded">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 stroke-[3]" /> : <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            )}
          </div>
          {hasChildren && isExpanded && (
            <div className="space-y-1 border-l-2 border-black/30 ml-3 pl-2">
              {renderFolderTree(folder.children!, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#5c94fc]">
        <div className="text-white font-black text-2xl animate-bounce">LOADING WORLD... 🍄</div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen flex bg-[#5c94fc] text-slate-900 font-sans select-none relative overflow-hidden">
      <aside className="w-72 bg-[#fff3d1] border-r-4 border-black hidden md:flex flex-col justify-between shadow-[4px_0px_0px_0px_rgba(0,0,0,1)] z-10 h-screen sticky top-0">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 border-b-4 border-black bg-[#e52521] relative overflow-hidden flex items-center gap-3 text-white flex-shrink-0">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
              <Cloud className="w-28 h-28 fill-white text-white" />
            </div>
            <svg viewBox="0 0 64 64" className="w-14 h-14 drop-shadow-[3px_3px_0px_rgba(0,0,0,1)] z-10 flex-shrink-0">
              <path d="M12 46 C4 46 1 39 1 31 C1 22 8 16 15 16 C17 9 24 4 33 4 C42 4 49 9 51 16 C58 16 63 22 63 31 C63 39 58 46 50 46 Z" fill="#ffffff" stroke="#000000" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round"/>
              <g transform="translate(13, 13) scale(0.85)">
                <path d="M16 28 C14 28 12 26 12 22 L12 16 C12 14 14 12 16 12 L32 12 C34 12 36 14 36 16 L36 22 C36 26 34 28 32 28 Z" fill="#ffebcd" stroke="#000000" strokeWidth="5" strokeLinejoin="round"/>
                <path d="M8 14 C8 6 16 2 24 2 C32 2 40 6 40 14 C40 18 36 20 32 20 L16 20 C12 20 8 18 8 14 Z" fill="#e52521" stroke="#000000" strokeWidth="5" strokeLinejoin="round"/>
                <circle cx="17" cy="10" r="4.5" fill="#ffffff"/>
                <circle cx="31" cy="10" r="4.5" fill="#ffffff"/>
              </g>
            </svg>
            <div className="z-10">
              <h1 className="text-xl font-black tracking-wider uppercase text-white drop-shadow-[3px_3px_0px_rgba(0,0,0,1)]">TELDRIVE</h1>
              <span className="text-xs font-bold text-yellow-200">🍄 Super Cloud Bros</span>
            </div>
          </div>

          <div className="p-4 flex-shrink-0">
            <button
              onClick={() => setIsCreatingFolder(true)}
              disabled={currentFolderId === 'trash'}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-white font-black text-sm rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              NEW PIPE FOLDER 🟢
            </button>
          </div>

          <nav className="px-4 space-y-2 pr-2 flex-1 overflow-y-auto">
            <button
              onClick={() => navigateToFolder(null, 'World 1-1 (My Drive)')}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropItem(e, null)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-black text-sm border-2 border-black transition-all ${
                currentFolderId === null 
                  ? 'bg-yellow-400 text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' 
                  : 'bg-white text-slate-700 hover:bg-yellow-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-[#e52521]" />
                <span>WORLD 1-1 (DRIVE)</span>
              </div>
            </button>

            <div className="pl-2 mt-2 space-y-1.5">
              {renderFolderTree(sidebarFolders)}
            </div>

            {/* Menu Trash Can dipindah ke paling bawah nav sidebar */}
            <div className="pt-2">
              <button
                onClick={() => navigateToFolder('trash', 'Trash Can')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-black text-sm border-2 border-black transition-all ${
                  currentFolderId === 'trash' 
                    ? 'bg-red-500 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' 
                    : 'bg-white text-slate-700 hover:bg-red-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5 text-red-500" />
                  <span>TRASH CAN</span>
                </div>
              </button>
            </div>
          </nav>
        </div>

        <div className="p-4 m-4 bg-white border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex-shrink-0">
          <div className="flex items-center gap-2 mb-1 text-xs font-black text-amber-600">
            <Sparkles className="w-4 h-4 text-yellow-500 fill-yellow-400" />
            <span>BOWSER'S COIN VAULT</span>
          </div>
          <p className="text-lg font-black text-slate-800">{formatFileSize(totalStorage)}</p>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Guard: Yoshi & Toad 🦖</span>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <header className="bg-white border-b-4 border-black px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] z-0">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black stroke-[3]" />
              <input
                type="text"
                placeholder="Search power-ups & files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={currentFolderId === 'trash'}
                className="w-full pl-10 pr-4 py-2 bg-yellow-50 border-3 border-black focus:bg-white disabled:opacity-50 rounded-xl text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
              />
            </div>

            <div className="hidden lg:flex items-center gap-1.5 text-xs font-black bg-yellow-300 px-3 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-x-auto max-w-xs">
              {folderPath.map((folder, index) => (
                <React.Fragment key={folder.id || 'root'}>
                  {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-black stroke-[3] flex-shrink-0" />}
                  <button
                    onClick={() => navigateToFolder(folder.id, folder.name)}
                    className="hover:underline truncate uppercase text-black"
                    title={folder.name}
                  >
                    {folder.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-yellow-100 border-2 border-black px-3 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-[11px] font-black text-black">PLAYER: {session.user.email}</span>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="p-2 bg-red-500 hover:bg-red-600 text-white font-bold border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all"
              title="Exit World"
            >
              <LogOut className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </header>

        <main className="flex-1 w-full p-6 md:p-8">
          <div className="flex lg:hidden items-center gap-2 mb-4 text-xs font-black bg-yellow-300 px-3 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-x-auto">
            {folderPath.map((folder, index) => (
              <React.Fragment key={folder.id || 'root'}>
                {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-black stroke-[3]" />}
                <button
                  onClick={() => navigateToFolder(folder.id, folder.name)}
                  className="hover:underline truncate uppercase text-black"
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {isCreatingFolder && currentFolderId !== 'trash' && (
            <form onSubmit={handleCreateFolder} className="mb-6 p-4 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex gap-3 max-w-xl">
              <input
                type="text"
                placeholder="Enter Pipe/Folder Name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-50 border-2 border-black rounded-xl text-sm font-bold focus:outline-none"
                autoFocus
              />
              <button type="submit" className="px-4 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-white font-black border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs">CREATE</button>
              <button type="button" onClick={() => setIsCreatingFolder(false)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-black font-black border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs">CANCEL</button>
            </form>
          )}

          {currentFolderId === 'trash' ? (
            <TrashView 
              onRestore={() => {
                setRefreshKey(prev => prev + 1);
                fetchStorageUsage();
                fetchNestedFolders();
                showToast('Item restored successfully! 🍄', 'success');
              }} 
            />
          ) : (
            <>
              <UploadBox 
                currentFolderId={currentFolderId} 
                onUploadSuccess={() => { 
                  setRefreshKey(prev => prev + 1); 
                  fetchStorageUsage();
                  showToast('Yoshi swallowed the file! Power-up collected! 🦖', 'success'); 
                }} 
                onError={(msg) => showToast(msg, 'error')}
              />
              
              <FolderList 
                currentFolderId={currentFolderId} 
                onFolderClick={navigateToFolder} 
                refreshKey={refreshKey} 
                onRefresh={() => {
                  setRefreshKey(prev => prev + 1);
                  fetchNestedFolders();
                }}
                onDropItem={handleDropItem}
              />

              <FileList 
                currentFolderId={currentFolderId} 
                searchQuery={searchQuery} 
                refreshKey={refreshKey} 
                onRefresh={() => {
                  setRefreshKey(prev => prev + 1);
                  fetchStorageUsage();
                }} 
              />
            </>
          )}
        </main>
      </div>

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