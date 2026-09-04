import { SetMetadata } from '@nestjs/common';

export const AFX_PUBLIC_KEY = 'afx:public';
export const AfxPublic = () => SetMetadata(AFX_PUBLIC_KEY, true);
