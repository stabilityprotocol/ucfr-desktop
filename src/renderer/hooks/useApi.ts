import { useEffect } from "react";
import { useAtom } from "jotai";
import {
  autoStartAtom,
  folderAtom,
  tokenAtom,
  projectsAtom,
  healthAtom,
  currentUserAtom,
  organizationsAtom,
  userProfileAtom,
} from "../state";
import { useQueryClient } from "@tanstack/react-query";
import { isTokenExpired } from "../../shared/api/auth";

export function useBootstrap() {
  const [, setToken] = useAtom(tokenAtom);
  const [, setFolder] = useAtom(folderAtom);
  const [, setAutoStart] = useAtom(autoStartAtom);
  const [, setProjects] = useAtom(projectsAtom);
  const [, setHealth] = useAtom(healthAtom);
  const [, setCurrentUser] = useAtom(currentUserAtom);
  const [, setOrganizations] = useAtom(organizationsAtom);
  const [, setUserProfile] = useAtom(userProfileAtom);
  const queryClient = useQueryClient();

  useEffect(() => {
    async function hydrate() {
      if (
        !window.ucfr ||
        !window.ucfr.auth ||
        !window.ucfr.settings ||
        !window.ucfr.api
      ) {
        console.warn(
          "[useBootstrap] window.ucfr is not available, skipping hydrate."
        );
        return;
      }
      const token = await window.ucfr.auth.getToken();
      
      // Check if token is expired before making any API calls
      if (token && isTokenExpired(token)) {
        console.info("[useBootstrap] Token expired, clearing and showing login");
        await window.ucfr.auth.clearToken();
        setToken(null);
        setCurrentUser(null);
        setUserProfile(null);
        setOrganizations([]);
        setProjects([]);
        return;
      }
      
      const [settings, user, projects, health] = await Promise.all([
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
      if (user && typeof user === "string") {
        window.ucfr.api
          .userProfile(user)
          .then((profile: any) => {
            if (profile) {
              setUserProfile(profile);
              if (profile.organizations) {
                setOrganizations(profile.organizations);
              }
            }
          })
          .catch((err) => console.error("Failed to fetch profile", err));
        
        // Handle first-time login logic
        window.ucfr.auth
          .handleFirstLogin()
          .then((result: any) => {
            if (result.attached) {
              console.info(
                `[First Login] Downloads folder attached to "${result.projectName}"`,
                result
              );
            } else if (result.skipped) {
              console.info(`[First Login] ${result.reason}`);
            }
          })
          .catch((err) => console.error("Failed to handle first login", err));
      }
      setProjects(projects as any);
      setHealth(health as any);
    }
    hydrate();

    const handler = async () => {
      if (!window.ucfr || !window.ucfr.auth) {
        console.warn(
          "[useBootstrap] window.ucfr is not available, skipping token refresh."
        );
        return;
      }
      const nextToken = await window.ucfr.auth.getToken();
      setToken(nextToken);
      if (!nextToken) {
        setCurrentUser(null);
        setUserProfile(null);
        setOrganizations([]);
        setProjects([]);
      } else {
        // Token is available, fetch user information
        try {
          const user = await window.ucfr.auth.getUser();
          setCurrentUser(user as any);
          if (user && typeof user === "string") {
            window.ucfr.api
              .userProfile(user)
              .then((profile: any) => {
                if (profile) {
                  setUserProfile(profile);
                  if (profile.organizations) {
                    setOrganizations(profile.organizations);
                  }
                }
              })
              .catch((err) => console.error("Failed to fetch profile", err));
            
            // Handle first-time login logic
            window.ucfr.auth
              .handleFirstLogin()
              .then((result: any) => {
                if (result.attached) {
                  console.info(
                    `[First Login] Downloads folder attached to "${result.projectName}"`,
                    result
                  );
                } else if (result.skipped) {
                  console.info(`[First Login] ${result.reason}`);
                }
              })
              .catch((err) => console.error("Failed to handle first login", err));
          }
          // Refresh projects
          const projects = await window.ucfr.api.projects();
          setProjects(projects as any);
          // Refresh health
          const health = await window.ucfr.api.health();
          setHealth(health as any);
        } catch (err) {
          console.error("Failed to refresh user state after token change", err);
          // If there's an error, the token might have been cleared
          // The next tokenChanged event will handle cleanup
        }
      }
      queryClient.invalidateQueries();
    };
    window.addEventListener("tokenChanged", handler);

    // Periodic token expiration check (every 60 seconds)
    const TOKEN_CHECK_INTERVAL = 60 * 1000; // 60 seconds
    const checkTokenExpiration = async () => {
      if (!window.ucfr || !window.ucfr.auth) {
        return;
      }
      
      const token = await window.ucfr.auth.getToken();
      if (token && isTokenExpired(token)) {
        console.info("[useBootstrap] Periodic check: Token expired, clearing and showing login");
        await window.ucfr.auth.clearToken();
        setToken(null);
        setCurrentUser(null);
        setUserProfile(null);
        setOrganizations([]);
        setProjects([]);
        queryClient.invalidateQueries();
      }
    };
    
    const intervalId = setInterval(checkTokenExpiration, TOKEN_CHECK_INTERVAL);

    return () => {
      window.removeEventListener("tokenChanged", handler);
      clearInterval(intervalId);
    };
  }, [
    setToken,
    setFolder,
    setAutoStart,
    setProjects,
    setHealth,
    setCurrentUser,
    setOrganizations,
    setUserProfile,
    queryClient,
  ]);
}
