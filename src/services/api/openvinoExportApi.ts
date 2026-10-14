import { API_PATHS } from '../../types';
import { apiUrl } from './client';

/** Download URL for the illustrative OpenVINO IR descriptor (GET /api/openvino/export-ir). */
export function openvinoIrExportUrl(device: string, precision: string): string {
  return `${apiUrl(API_PATHS.openvinoExportIr)}?device=${device}&precision=${precision}`;
}

/** Download URL for the deployment config JSON (GET /api/openvino/export-config). */
export function openvinoConfigExportUrl(device: string, precision: string): string {
  return `${apiUrl(API_PATHS.openvinoExportConfig)}?device=${device}&precision=${precision}`;
}
