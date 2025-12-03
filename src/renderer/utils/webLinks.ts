export const WEB_APP_BASE_URL = "https://app.ucfr.io";

export const getDashboardUrl = () => `${WEB_APP_BASE_URL}/dashboard`;

export const getProjectUrl = (projectId: string) =>
  `${WEB_APP_BASE_URL}/projects/${projectId}`;

export const getProjectSettingsUrl = (projectId: string) =>
  `${WEB_APP_BASE_URL}/projects/${projectId}/settings`;

export const getProfileSettingsUrl = (email?: string) =>
  email
    ? `${WEB_APP_BASE_URL}/profile/${email}/settings`
    : `${WEB_APP_BASE_URL}/profile/settings`;

export const getOrganizationUrl = (orgId: string) =>
  `${WEB_APP_BASE_URL}/workspace/${orgId}`;

export const openInWeb = async (url: string) => {
  if (window.ucfr?.app?.openExternal) {
    await window.ucfr.app.openExternal(url);
  } else {
    window.open(url, "_blank");
  }
};

