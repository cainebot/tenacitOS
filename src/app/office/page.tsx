'use client';

import Office3D from '@/components/Office3D/Office3D';
import { RealtimeProvider } from '@/components/RealtimeProvider';

export default function OfficePage() {
  return (
    <RealtimeProvider>
      <Office3D />
    </RealtimeProvider>
  );
}
