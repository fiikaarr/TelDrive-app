export interface User {
  id: string;
  email: string;
}

export interface FolderItem {
  id: string;
  name: string;
  user_id: string;
  parent_id: string | null;
  created_at: string;
}

export interface FileItem {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  folder_id: string | null;
  telegram_file_id: string;
  user_id: string;
  created_at: string;
}