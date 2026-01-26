/**
 * API Types for UCFR Desktop Application
 *
 * These types align with the OpenAPI specification defined in openapi.yml.
 * They represent the data structures returned by the UCFR API endpoints.
 */

// =============================================================================
// License Types
// =============================================================================

/**
 * License information with display name and URL.
 * Used by projects to define licensing terms for claims.
 */
export type License = {
  name: string;
  url: string;
};

/**
 * Identifier for predefined license types.
 * Maps to the LicenseKey enum in openapi.yml.
 */
export type LicenseKey =
  | "MIT"
  | "Apache-2.0"
  | "GPL-3.0"
  | "BSD-3-Clause"
  | "CC-BY-4.0"
  | "CC-BY-SA-4.0"
  | "CC-BY-NC-4.0"
  | "CC-BY-NC-SA-4.0"
  | "CC0-1.0"
  | "UNLICENSED";

// =============================================================================
// Organization Types
// =============================================================================

/**
 * Organization details embedded in projects.
 * Nullable for user-owned projects that don't belong to an organization.
 */
export type ProjectOrganization = {
  id: string;
  name: string;
  description?: string;
};

/**
 * Member of an organization with their role and join date.
 */
export type OrganizationMember = {
  email: string;
  role: "owner" | "member";
  joinedAt: string;
};

/**
 * Full organization entity with members and metadata.
 */
export type Organization = {
  id: string;
  name: string;
  description?: string;
  ownerEmail: string;
  members: OrganizationMember[];
  createdAt: string;
  updatedAt: string;
};

// =============================================================================
// Project Types
// =============================================================================

/**
 * Project entity representing a collection of claims.
 * Projects can belong to an organization or be user-owned.
 */
export type Project = {
  id: string;
  name: string;
  description?: string;
  adminEmail: string;
  organization?: ProjectOrganization | null;
  ownerUserId?: string | null;
  visibility: "public" | "private";
  license?: License | null;
  allowAiTraining?: boolean;
  members: string[];
  createdAt: string;
  updatedAt: string;
};

// =============================================================================
// Claim Types
// =============================================================================

/**
 * Parameters for creating a claim via JSON-RPC.
 */
export type ClaimCreateParams = {
  methodId: string;
  fingerprint: string;
  data?: string;
  externalId?: string;
  signature?: string;
  pubKey?: string;
  extURI?: string;
};

/**
 * REST DTO for POST /api/projects/{projectId}/claims endpoint.
 * Used when submitting claims through the REST API.
 */
export type CreateProjectClaimDto = {
  methodId: number;
  externalId: number;
  fingerprint: string;
  data: string;
  signature?: string | null;
  pubKey?: string | null;
};

// =============================================================================
// User Profile Types
// =============================================================================

/**
 * Social media channel linked to a user profile.
 */
export type UserSocialChannel = {
  platform: string;
  url: string;
  handle?: string | null;
};

/**
 * User profile with organizations, projects, and recent claims.
 * Returned by GET /api/users/{email}/profile endpoint.
 */
export type UserProfile = {
  email: string;
  displayName?: string | null;
  websiteUrl?: string | null;
  socialChannels?: UserSocialChannel[];
  organizations: Organization[];
  projects: Project[];
  recentClaims: unknown[];
  ethAddress?: string | null;
};

// =============================================================================
// Search Types
// =============================================================================

/**
 * Profile search result with activity statistics.
 * Part of the SearchResponse from GET /api/search endpoint.
 */
export type ProfileSearchResult = {
  email: string;
  organizationCount: number;
  projectCount: number;
  recentClaimCount: number;
  lastActivityAt?: string | null;
  score: number;
};

/**
 * Organization search result with membership and project counts.
 * Part of the SearchResponse from GET /api/search endpoint.
 */
export type OrganizationSearchResult = {
  id: string;
  name: string;
  description?: string | null;
  ownerEmail: string;
  memberCount: number;
  projectCount: number;
  score: number;
};

/**
 * Project search result with organization context.
 * Part of the SearchResponse from GET /api/search endpoint.
 */
export type ProjectSearchResult = {
  id: string;
  name: string;
  description?: string | null;
  adminEmail: string;
  organization?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  score: number;
};

/**
 * Fingerprint search result with claim context.
 * Part of the SearchResponse from GET /api/search endpoint.
 */
export type FingerprintSearchResult = {
  fingerprint: string;
  methodId: number;
  externalId: number;
  projectId: string;
  projectName: string;
  organization?: ProjectOrganization | null;
  createdAt: string;
  score: number;
};

/**
 * Combined search response from GET /api/search endpoint.
 * Supports searching profiles, organizations, projects, and fingerprints.
 */
export type SearchResponse = {
  profileQuery?: string | null;
  organizationQuery?: string | null;
  projectQuery?: string | null;
  fingerprintQuery?: string | null;
  profileSearchApplied: boolean;
  organizationSearchApplied: boolean;
  projectSearchApplied: boolean;
  fingerprintSearchApplied: boolean;
  profiles: ProfileSearchResult[];
  organizations: OrganizationSearchResult[];
  projects: ProjectSearchResult[];
  fingerprints: FingerprintSearchResult[];
};

// =============================================================================
// Health & Info Types
// =============================================================================

/**
 * Health check response from GET /health endpoint.
 */
export type Health = {
  status: string;
  timestamp?: string;
  version: string;
  environment?: string;
};

/**
 * Platform summary response from GET /info endpoint.
 * Contains aggregate counts cached for five minutes.
 */
export type InfoSummary = {
  claims: number;
  organizations: number;
  projects: number;
};
