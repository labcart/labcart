import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkspaceState {
  workspacePath: string;
  isFirstRun: boolean;
  setWorkspacePath: (path: string) => void;
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
      isFirstRun: true, // Will be set to false after first workspace selection
      setWorkspacePath: (path: string) => {
        console.log('📂 Workspace changed to:', path);
        set({ workspacePath: path, isFirstRun: false });
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
