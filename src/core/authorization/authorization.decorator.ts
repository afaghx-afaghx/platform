import { SetMetadata } from '@nestjs/common';

export const AFX_AUTHORIZATION_KEY = 'afx:authorization';
export const AfxAuthorize = (action: string, resourceType: string) =>
  SetMetadata(AFX_AUTHORIZATION_KEY, { action, resourceType });
