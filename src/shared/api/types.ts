export type MockUser = {
  id: string;
  email: string;
  name: string;
  token?: string;
};

export type MockProject = {
  id: string;
  name: string;
  claims: number;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  adminEmail: string;
  organization?: {
    id: string;
    name: string;
    description?: string;
  };
  ownerUserId?: string;
  visibility: "public" | "private";
  members: string[];
  createdAt: string;
  updatedAt: string;
};

export type MockHealth = {
  status: "ok" | "degraded" | "unhealthy";
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

export type UserProfile = {
  email: string;
  displayName?: string;
  websiteUrl?: string;
  organizations: Organization[];
  projects: Project[];
  recentClaims: any[]; // limiting scope for now
  ethAddress?: string;
};
