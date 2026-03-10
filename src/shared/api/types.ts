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
 * Used by marks to define licensing terms for artifacts.
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
  | "NONE_SPECIFIED"
  | "UNLICENSED";

// =============================================================================
// User Reference Types
// =============================================================================

/**
 * Lightweight user reference used throughout the API to identify users.
 * Replaces flat email strings with a richer object containing username and stable UUID.
 * The optional `email` field is only populated when the authenticated user is
 * viewing their own data (e.g., own profile, own projects, own claims).
 */
export type UserRef = {
  username: string;
  id: string;
  email?: string;
};

// =============================================================================
// Organization Types
// =============================================================================

/**
 * Organization details embedded in marks.
 * Nullable for user-owned marks that don't belong to an organization.
 */
export type ProjectOrganization = {
  id: string;
  name: string;
  description?: string;
};

/**
 * Member of an organization with their role and join date.
 * Uses username as the primary identifier (replaces email in older API versions).
 */
export type OrganizationMember = {
  id?: string | null;
  username: string;
  role: "owner" | "member";
  joinedAt: string;
};

/**
 * Full organization entity with members and metadata.
 * The `owner` field is a UserRef object representing the organization owner.
 */
export type Organization = {
  id: string;
  name: string;
  description?: string;
  owner: UserRef;
  members: OrganizationMember[];
  createdAt: string;
  updatedAt: string;
};

// =============================================================================
// Mark Types (API type name kept as Project for backend compatibility)
// =============================================================================
// Artifact Types (API uses 'Claim' terminology for backend compatibility)
// =============================================================================

/**
 * Mark entity representing a collection of artifacts.
 * Marks can belong to an organization or be user-owned.
 * Note: API type name kept as `Project` for backend compatibility.
 *
 * The `admin` field is a UserRef object identifying the project administrator.
 * The `owner` field is a UserRef (or null for org-owned marks) identifying the personal owner.
 * The `members` array contains UserRef objects for each collaborator.
 */
export type Project = {
  id: string;
  name: string;
  description?: string;
  admin: UserRef;
  organization?: ProjectOrganization | null;
  owner?: UserRef | null;
  visibility: "public" | "private";
  license?: License | null;
  licenseKey?: LicenseKey;
  allowAiTraining?: boolean | null;
  members: UserRef[];
  createdAt: string;
  updatedAt: string;
};

/**
 * Extended Project type that includes a claim count.
 * Returned by GET /api/projects (list all projects for authenticated user).
 */
export type ProjectWithClaimsCount = Project & {
  claimsCount: number;
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
 * REST DTO for POST /api/projects/{markId}/claims endpoint.
 * Used when submitting artifacts through the REST API.
 * Note: API type name kept as `CreateProjectClaimDto` for backend compatibility.
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
 * Lightweight mark representation used in user profile responses.
 * Unlike the full Project type, this includes aggregate counts
 * (totalClaims, memberCount) and omits detailed member lists.
 */
export type UserProfileProject = {
  id: string;
  name: string;
  description?: string | null;
  organization?: ProjectOrganization | null;
  owner?: UserRef | null;
  visibility: "public" | "private";
  totalClaims: number;
  memberCount: number;
};

/**
 * User profile with organizations, marks, and recent artifacts.
 * Returned by GET /api/users/me, GET /api/users/username/{username}/profile,
 * or GET /api/users/id/{uuid}/profile.
 *
 * The `id` field is the user's immutable UUID. The `email` field is only
 * included when the authenticated user is viewing their own profile.
 */
export type UserProfile = {
  id: string;
  email?: string;
  username: string;
  displayName?: string | null;
  websiteUrl?: string | null;
  socialChannels?: UserSocialChannel[];
  organizations: Organization[];
  projects: UserProfileProject[];
  recentClaims: unknown[];
  ethAddress?: string | null;
};

// =============================================================================
// Search Types
// =============================================================================

/**
 * Profile search result with activity statistics.
 * Part of the SearchResponse from GET /api/search endpoint.
 * Uses a UserRef `user` field instead of flat username/email strings.
 */
export type ProfileSearchResult = {
  user: UserRef;
  organizationCount: number;
  projectCount: number;
  recentClaimCount: number;
  lastActivityAt?: string | null;
  score: number;
};

/**
 * Organization search result with membership and mark counts.
 * Part of the SearchResponse from GET /api/search endpoint.
 */
export type OrganizationSearchResult = {
  id: string;
  name: string;
  description?: string | null;
  memberCount: number;
  projectCount: number;
  score: number;
};

/**
 * Mark search result with organization context.
 * Part of the SearchResponse from GET /api/search endpoint.
 */
export type ProjectSearchResult = {
  id: string;
  name: string;
  description?: string | null;
  organization?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  score: number;
};

/**
 * Fingerprint search result with artifact context.
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
 * Supports searching profiles, organizations, marks, and fingerprints.
 */
export type SearchResponse = {
  usernameQuery?: string | null;
  organizationQuery?: string | null;
  projectQuery?: string | null;
  fingerprintQuery?: string | null;
  usernameSearchApplied: boolean;
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
