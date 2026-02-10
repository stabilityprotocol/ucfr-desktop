export const WEB_APP_BASE_URL = "https://lite.monolith.stabilityprotocol.com";

export const getDashboardUrl = () => `${WEB_APP_BASE_URL}/dashboard`;

export const getMarkUrl = (markId: string) =>
  `${WEB_APP_BASE_URL}/mark/${markId}`;

export const getMarkSettingsUrl = (markId: string) =>
  `${WEB_APP_BASE_URL}/mark/${markId}`;

export const getProfileSettingsUrl = (email?: string) =>
  email
    ? `${WEB_APP_BASE_URL}/profile/${email}`
    : `${WEB_APP_BASE_URL}/profile`;

export const getOrganizationUrl = (orgId: string) =>
  `${WEB_APP_BASE_URL}/workspace/${orgId}`;

export const getFingerprintVerifyUrl = (fingerprint: string) =>
  `${WEB_APP_BASE_URL}/artifact/fingerprint/${encodeURIComponent(fingerprint)}`;

export const openInWeb = async (url: string) => {
  if (window.ucfr?.app?.openExternal) {
    await window.ucfr.app.openExternal(url);
  } else {
    window.open(url, "_blank");
  }
};
