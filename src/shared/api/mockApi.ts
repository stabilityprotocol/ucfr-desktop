import type { MockUser, MockProject, MockHealth } from './types';

const mockUser: MockUser = {
  id: 'user-1',
  email: 'demo@example.com',
  name: 'Demo User'
};

const mockProjects: MockProject[] = [
  { id: 'proj-1', name: 'Sample Project', claims: 12 },
  { id: 'proj-2', name: 'Research Project', claims: 4 }
];

const mockHealth: MockHealth = { status: 'ok', version: '0.0.1-mock' };

export async function loginWithToken(token: string): Promise<MockUser> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return { ...mockUser, token };
}

export async function fetchCurrentUser(): Promise<MockUser> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return mockUser;
}

export async function fetchProjects(): Promise<MockProject[]> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  return mockProjects;
}

export async function fetchHealth(): Promise<MockHealth> {
  return mockHealth;
}
