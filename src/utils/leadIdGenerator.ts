import { v4 as uuidv4 } from 'uuid';

export const generateLeadId = (): string => {
  const uuid = uuidv4();
  const shortUuid = uuid.split('-')[0];
  return `lead_${shortUuid}`;
};

export const isValidLeadId = (id: string): boolean => {
  return /^lead_[a-f0-9]{8}$/.test(id);
};

export const formatLeadId = (id: string): string => {
  return id.toLowerCase().trim();
};
