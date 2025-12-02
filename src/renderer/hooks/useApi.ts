import { useEffect } from "react";
import { useAtom } from "jotai";
import {
  autoStartAtom,
  folderAtom,
  tokenAtom,
  projectsAtom,
  healthAtom,
  currentUserAtom,
} from "../state";
import { useQueryClient } from "@tanstack/react-query";

declare global {
  interface Window {
    ucfr: import("../../preload").RendererAPI;
  }
}

export function useBootstrap() {
  const [, setToken] = useAtom(tokenAtom);
  const [, setFolder] = useAtom(folderAtom);
  const [, setAutoStart] = useAtom(autoStartAtom);
  const [, setProjects] = useAtom(projectsAtom);
  const [, setHealth] = useAtom(healthAtom);
  const [, setCurrentUser] = useAtom(currentUserAtom);
  const queryClient = useQueryClient();

  useEffect(() => {
    async function hydrate() {
      const [token, settings, user, projects, health] = await Promise.all([
        window.ucfr.auth.getToken(),
        window.ucfr.settings.get(),
        window.ucfr.auth.getUser(),
        window.ucfr.api.projects(),
        window.ucfr.api.health(),
      ]);
      setToken(token);
      const typedSettings = settings as {
        folderPath?: string;
        autoStart?: boolean;
      };
      setFolder(typedSettings.folderPath);
      setAutoStart(Boolean(typedSettings.autoStart));
      setCurrentUser(user as any);
      setProjects(projects as any);
      setHealth(health as any);
    }
    hydrate();

    const handler = () => {
      queryClient.invalidateQueries();
    };
    window.addEventListener("tokenChanged", handler);
    return () => window.removeEventListener("tokenChanged", handler);
  }, [
    setToken,
    setFolder,
    setAutoStart,
    setProjects,
    setHealth,
    setCurrentUser,
    queryClient,
  ]);
}
