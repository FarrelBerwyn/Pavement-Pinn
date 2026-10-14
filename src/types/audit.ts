/** Audit-trail record type. */

import type { UserRole } from './rbac';

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userRole: UserRole;
  userAgency: string;
  action: string;
  segmentName: string;
  details: string;
}
