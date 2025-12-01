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

export type MockHealth = {
  status: 'ok' | 'degraded' | 'unhealthy';
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
