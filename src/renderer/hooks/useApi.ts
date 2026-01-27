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
  isValidatingAtom,
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
  const [, setIsValidating] = useAtom(isValidatingAtom);
  const queryClient = useQueryClient();

  useEffect(() => {
    async function hydrate() {
      setIsValidating(true);

      if (
        !window.ucfr ||
        !window.ucfr.auth ||
        !window.ucfr.settings ||
        !window.ucfr.api
      ) {
        console.warn(
          "[useBootstrap] window.ucfr is not available, skipping hydrate."
        );
        setIsValidating(false);
        return;
      }
      const token = await window.ucfr.auth.getToken();

      // Quick local check first (fast-fail for obviously expired tokens)
      if (token && isTokenExpired(token)) {
        console.info(
          "[useBootstrap] Token expired locally, clearing and showing login"
        );
        await window.ucfr.auth.clearToken();
        setToken(null);
        setCurrentUser(null);
        setUserProfile(null);
        setOrganizations([]);
        setProjects([]);
        setIsValidating(false);
        return;
      }

      // If we have a token, validate it against the server
      if (token) {
        const { valid } = await window.ucfr.auth.validateToken();
        if (!valid) {
          console.info(
            "[useBootstrap] Token invalid on server, showing login"
          );
          setToken(null);
          setCurrentUser(null);
          setUserProfile(null);
          setOrganizations([]);
          setProjects([]);
          setIsValidating(false);
          return;
        }
      }

      // No token means show login
      if (!token) {
        setToken(null);
        setIsValidating(false);
        return;
      }

      // Token is valid, proceed with fetching user data
      // STEP 1: Fetch user first
      const user = await window.ucfr.auth.getUser();
      setCurrentUser(user as any);

      // STEP 2: If we have a user, fetch their profile FIRST before any other API calls
      if (user && typeof user === "string") {
        try {
          const profile = (await window.ucfr.api.userProfile(user)) as any;
          if (profile) {
            setUserProfile(profile);
            if (profile.organizations) {
              setOrganizations(profile.organizations);
            }
          }
        } catch (err) {
          console.error("Failed to fetch profile", err);
        }
      }

      // STEP 3: Now fetch everything else in parallel
      const [settings, projects, health] = await Promise.all([
        window.ucfr.settings.get(),
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
      setProjects(projects as any);
      setHealth(health as any);

      // Handle first-time login logic (can be async, doesn't block)
      if (user && typeof user === "string") {
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

      setIsValidating(false);
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
          // STEP 1: Fetch user first
          const user = await window.ucfr.auth.getUser();
          setCurrentUser(user as any);

          // STEP 2: Fetch profile FIRST before any other API calls
          if (user && typeof user === "string") {
            try {
              const profile = (await window.ucfr.api.userProfile(user)) as any;
              if (profile) {
                setUserProfile(profile);
                if (profile.organizations) {
                  setOrganizations(profile.organizations);
                }
              }
            } catch (err) {
              console.error("Failed to fetch profile", err);
            }

            // Handle first-time login logic (can be async, doesn't block)
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

          // STEP 3: Now fetch everything else in parallel
          const [projects, health] = await Promise.all([
            window.ucfr.api.projects(),
            window.ucfr.api.health(),
          ]);
          setProjects(projects as any);
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

    // Periodic token validation check (every 5 minutes)
    const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
    const checkTokenExpiration = async () => {
      if (!window.ucfr || !window.ucfr.auth) {
        return;
      }

      const token = await window.ucfr.auth.getToken();
      if (!token) return;

      // Quick local check first
      if (isTokenExpired(token)) {
        console.info(
          "[useBootstrap] Periodic check: Token expired locally, clearing"
        );
        await window.ucfr.auth.clearToken();
        setToken(null);
        setCurrentUser(null);
        setUserProfile(null);
        setOrganizations([]);
        setProjects([]);
        queryClient.invalidateQueries();
        return;
      }

      // Validate against the server
      const { valid } = await window.ucfr.auth.validateToken();
      if (!valid) {
        console.info(
          "[useBootstrap] Periodic check: Token invalid on server, clearing"
        );
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
    setIsValidating,
    queryClient,
  ]);
}
