import { useEffect, useRef } from "react";
import { useAtom } from "jotai";
import {
  autoStartAtom,
  folderAtom,
  tokenAtom,
  marksAtom,
  healthAtom,
  currentUserAtom,
  organizationsAtom,
  userProfileAtom,
  isValidatingAtom,
} from "../state";
import { useQueryClient } from "@tanstack/react-query";
import { isTokenExpired } from "../../shared/api/auth";
import { toast } from "sonner";

// Prevent concurrent first login attempts
let firstLoginInProgress = false;

export function useBootstrap() {
  const [, setToken] = useAtom(tokenAtom);
  const [, setFolder] = useAtom(folderAtom);
  const [, setAutoStart] = useAtom(autoStartAtom);
  const [, setMarks] = useAtom(marksAtom);
  const [, setHealth] = useAtom(healthAtom);
  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
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
        setMarks([]);
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
          setMarks([]);
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
      const [settings, marks, health] = await Promise.all([
        window.ucfr.settings.get(),
        window.ucfr.api.marks(),
        window.ucfr.api.health(),
      ]);
      
      setToken(token);
      const typedSettings = settings as {
        folderPath?: string;
        autoStart?: boolean;
      };
      setFolder(typedSettings.folderPath);
      setAutoStart(Boolean(typedSettings.autoStart));
      setMarks(marks as any);
      setHealth(health as any);

      // Handle first-time login logic (can be async, doesn't block)
      if (!firstLoginInProgress && user && typeof user === "string") {
        firstLoginInProgress = true;
        window.ucfr.auth
          .handleFirstLogin()
          .then((result: any) => {
            if (result.attached) {
              console.info(
                `[First Login] Downloads folder attached to "${result.markName}"`,
                result
              );
            } else if (result.skipped) {
              console.info(`[First Login] ${result.reason}`);
            } else if (result.success === false) {
              console.error(`[First Login] Failed:`, result.error);
            }
          })
          .catch((err) => console.error("Failed to handle first login", err))
          .finally(() => {
            firstLoginInProgress = false;
          });
      }

      setIsValidating(false);
    }
    hydrate();

    const handler = async () => {
      console.log("[useBootstrap] tokenChanged event received!");
      if (!window.ucfr || !window.ucfr.auth) {
        console.warn(
          "[useBootstrap] window.ucfr is not available, skipping token refresh."
        );
        return;
      }
      console.log("[useBootstrap] Calling auth.getToken()...");
      const nextToken = await window.ucfr.auth.getToken();
      console.log("[useBootstrap] Token from main process:", nextToken ? "exists" : "null");
      setToken(nextToken);
      if (!nextToken) {
        console.log("[useBootstrap] Token is null, clearing user state");
        setCurrentUser(null);
        setUserProfile(null);
        setOrganizations([]);
        setMarks([]);
      } else {
        console.log("[useBootstrap] Token is available, fetching user information...");
        try {
          // STEP 1: Fetch user first
          console.log("[useBootstrap] Calling auth.getUser()...");
          const user = await window.ucfr.auth.getUser();
          console.log("[useBootstrap] User from auth:", user);
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
            if (!firstLoginInProgress) {
              firstLoginInProgress = true;
              window.ucfr.auth
                .handleFirstLogin()
                .then((result: any) => {
                  if (result.attached) {
                    console.info(
                      `[First Login] Downloads folder attached to "${result.markName}"`,
                      result
                    );
                  } else if (result.skipped) {
                    console.info(`[First Login] ${result.reason}`);
                  } else if (result.success === false) {
                    console.error(`[First Login] Failed:`, result.error);
                  }
                })
                .catch((err) => console.error("Failed to handle first login", err))
                .finally(() => {
                  firstLoginInProgress = false;
                });
            }
          }

          // STEP 3: Now fetch everything else in parallel
          const [marks, health] = await Promise.all([
            window.ucfr.api.marks(),
            window.ucfr.api.health(),
          ]);
          setMarks(marks as any);
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

    // Listen for notifications from main process
    const notificationHandler = (event: Event) => {
      const customEvent = event as CustomEvent<{ type: string; message: string }>;
      const { type, message } = customEvent.detail;
      
      if (type === 'success') {
        toast.success(message);
      } else if (type === 'error') {
        toast.error(message);
      } else if (type === 'info') {
        toast.info(message);
      }
    };
    window.addEventListener("notification", notificationHandler);

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
        setMarks([]);
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
        setMarks([]);
        queryClient.invalidateQueries();
      }
    };

    const intervalId = setInterval(checkTokenExpiration, TOKEN_CHECK_INTERVAL);

    return () => {
      window.removeEventListener("tokenChanged", handler);
      window.removeEventListener("notification", notificationHandler);
      clearInterval(intervalId);
    };
  }, [
    setToken,
    setFolder,
    setAutoStart,
    setMarks,
    setHealth,
    setCurrentUser,
    setOrganizations,
    setUserProfile,
    setIsValidating,
    queryClient,
  ]);

  // Sync current user to main process for database context
  // Skip the initial null value to avoid overwriting the persisted user
  const hasSetUser = useRef(false);
  useEffect(() => {
    if (!window.ucfr?.db?.setCurrentUser) return;

    if (currentUser) {
      hasSetUser.current = true;
      window.ucfr.db.setCurrentUser(currentUser);
    } else if (hasSetUser.current) {
      // Only sync null after we've previously set a real user (i.e. logout)
      window.ucfr.db.setCurrentUser(null);
    }
  }, [currentUser]);
}
