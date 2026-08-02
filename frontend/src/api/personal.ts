import { apiClient } from './api-client';

export interface CheckRecord {
  clave_empleado: string;
  nombre_completo: string;
  plantel: string;
  foto: string | null;
  fecha_hora: string;
}

export interface VerificationData {
  nombre_completo: string;
  plantel: string;
  clave_empleado: string;
  foto: string | null;
  correo: string | null;
  nivel_educativo: string | null;
}

export const getRecentChecks = async (): Promise<CheckRecord[]> => {
  const response = await apiClient.get<CheckRecord[]>('/personal/recent_checks/');
  return response.data;
};

export const verifyQR = async (hash: string): Promise<VerificationData> => {
  const response = await apiClient.get<VerificationData>(`/personal/verify/${hash}/`);
  return response.data;
};

