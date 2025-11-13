import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkspaceState {
  workspacePath: string;
  workspaceId: string | null;
  isFirstRun: boolean;
  setWorkspacePath: (path: string) => void;
  setWorkspaceId: (id: string) => void;
  setWorkspace: (path: string, id: string) => void;
  markFirstRunComplete: () => void;
}

/**
 * Workspace Store
 *
 * Manages the current workspace directory path.
 * This is where the user's project files live and where bots operate.
 *
 * Default: Environment variable LABCART_WORKSPACE or current working directory
 */
const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspacePath: '', // No default - user must select workspace
      workspaceId: null, // UUID from .labcart/workspace.json
      isFirstRun: true, // Will be set to false after first workspace selection
      setWorkspacePath: (path: string) => {
        console.log('📂 Workspace path changed to:', path);
        set({ workspacePath: path, isFirstRun: false });
      },
      setWorkspaceId: (id: string) => {
        console.log('🆔 Workspace ID set to:', id);
        set({ workspaceId: id });
      },
      setWorkspace: (path: string, id: string) => {
        console.log('📂 Workspace set:', { path, id });
        set({ workspacePath: path, workspaceId: id, isFirstRun: false });
      },
      markFirstRunComplete: () => {
        set({ isFirstRun: false });
      },
    }),
    {
      name: 'labcart-workspace', // localStorage key
    }
  )
);

export default useWorkspaceStore;
