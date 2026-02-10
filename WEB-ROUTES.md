# WEB APP ROUTES DOCUMENTATION

This document lists all routes defined in the UCFR web application.

## Route Structure

Routes are organized into two main groups:

- **Public routes**: Accessible without authentication (root route only)
- **Protected routes**: Wrapped in `PortalShell` component, requiring authentication

## Public Routes

### `/`

- **Component**: `HomePage`
- **Description**: Landing page
- **Authentication**: Not required
- **Error Handler**: `ErrorPage`

## Protected Routes (PortalShell)

All routes below are wrapped in `PortalShell` and require authentication.

### Dashboard

#### `/dashboard`

- **Component**: `DashboardPage`
- **Description**: User dashboard
- **Authentication**: Required

### Projects

#### `/projects`

- **Component**: `ProjectsPage`
- **Description**: List of user projects
- **Authentication**: Required

#### `/projects/:projectId`

- **Component**: `ProjectPage`
- **Description**: Project detail view
- **Parameters**:
  - `projectId` - Project identifier
- **Authentication**: Required

#### `/projects/:projectId/settings`

- **Component**: `ProjectSettingsPage`
- **Description**: Project settings page
- **Parameters**:
  - `projectId` - Project identifier
- **Authentication**: Required

#### `/projects/:projectId/claims/:claimId`

- **Component**: `ClaimDetailPage`
- **Description**: Artifact detail view
- **Parameters**:
  - `projectId` - Project identifier
  - `claimId` - Artifact identifier
- **Authentication**: Required

#### `/claims/fingerprint/:fingerprint`

- **Component**: `FingerprintVerifyPage`
- **Description**: Fingerprint verification page
- **Parameters**:
  - `fingerprint` - Fingerprint identifier
- **Authentication**: Not required

### Profile

#### `/profile`

- **Component**: `ProfilePage`
- **Description**: Current user's profile
- **Authentication**: Required

#### `/profile/settings`

- **Component**: `ProfileSettingsPage`
- **Description**: Current user's profile settings
- **Authentication**: Required

#### `/profile/:email`

- **Component**: `ProfilePage`
- **Description**: Public user profile by email
- **Parameters**:
  - `email` - User email address
- **Authentication**: Required

#### `/profile/:email/settings`

- **Component**: `ProfileSettingsPage`
- **Description**: User profile settings (for specified email)
- **Parameters**:
  - `email` - User email address
- **Authentication**: Required

### Artifacts

#### `/my-claims`

- **Component**: `MyClaimsPage`
- **Description**: User's artifacts listing
- **Authentication**: Required

#### `/claims/new`

- **Component**: `CreateClaimPage`
- **Description**: Create a new artifact
- **Authentication**: Required

### Organizations (Workspaces)

#### `/workspaces`

- **Component**: `OrganizationProfilePage`
- **Description**: Organizations listing page
- **Authentication**: Required

#### `/workspace/:organizationId`

- **Component**: `OrganizationProfilePage`
- **Description**: Organization detail view
- **Parameters**:
  - `organizationId` - Organization identifier
- **Authentication**: Required

### Support & Verification

#### `/support`

- **Component**: `SupportPage`
- **Description**: Support page
- **Authentication**: Required

#### `/verify`

- **Component**: `VerifyPage`
- **Description**: Verification page
- **Authentication**: Required

### Error Handling

#### `*` (catch-all)

- **Component**: Inline error message
- **Description**: 404 - Page not found
- **Authentication**: Required
- **Note**: This route catches all unmatched paths within the protected routes section

## Route Loading

All routes except `HomePage`, `DashboardPage`, and the 404 catch-all route use React's `lazy()` for code splitting and are wrapped in `Suspense` with a `LoadingFallback` component.

## Error Handling

All routes have error boundaries configured:

- Root route (`/`) uses `ErrorPage` as error element
- All PortalShell routes use `ErrorPage` as error element
