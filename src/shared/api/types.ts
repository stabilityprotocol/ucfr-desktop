export type ProjectOrganization = {
  id: string;
  name: string;
  description?: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  adminEmail: string;
  organization?: ProjectOrganization;
  ownerUserId?: string;
  visibility: "public" | "private";
  license?: string | null;
  allowAiTraining?: boolean;
  members: string[];
  createdAt: string;
  updatedAt: string;
};

export type Health = {
  status: string;
  version: string;
};

export type FingerprintSearchResult = {
  fingerprint: string;
  claimId: string;
  score: number;
};

export type SearchResponse = {
  profileSearchApplied: boolean;
  organizationSearchApplied: boolean;
  fingerprintSearchApplied: boolean;
  profiles: Array<{ id: string; email: string; score: number }>;
  organizations: Array<{ id: string; name: string; score: number }>;
  fingerprints: FingerprintSearchResult[];
};

export type ClaimCreateParams = {
  methodId: string;
  fingerprint: string;
  data?: string;
  externalId?: string;
  signature?: string;
  pubKey?: string;
  extURI?: string;
};

export type OrganizationMember = {
  email: string;
  role: "owner" | "member";
  joinedAt: string;
};

export type Organization = {
  id: string;
  name: string;
  description?: string;
  ownerEmail: string;
  members: OrganizationMember[];
  createdAt: string;
  updatedAt: string;
};

export type UserSocialChannel = {
  platform: string;
  url: string;
  handle?: string;
};

export type UserProfile = {
  email: string;
  displayName?: string;
  websiteUrl?: string;
  socialChannels?: UserSocialChannel[];
  organizations: Organization[];
  projects: Project[];
  recentClaims: any[];
  ethAddress?: string;
};
