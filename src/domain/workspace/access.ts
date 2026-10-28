/** Who may use the analysis workspace (isomorphic; the UI policy and the API both read this). */
import type { UserRole } from '../../types';

export const WORKSPACE_VIEW_ROLES: readonly UserRole[] = ['OPERATIONS_MANAGER', 'FIELD_ENGINEER'];
export const WORKSPACE_CORRECT_ROLES: readonly UserRole[] = ['FIELD_ENGINEER'];
export const WORKSPACE_APPROVE_ROLES: readonly UserRole[] = ['OPERATIONS_MANAGER'];

export const canViewWorkspace = (role: string): boolean => (WORKSPACE_VIEW_ROLES as readonly string[]).includes(role);
