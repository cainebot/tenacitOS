'use client';
import { RealtimeProvider } from '@/components/RealtimeProvider';
export default function OfficePage() {
  return (
    <RealtimeProvider>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-primary)' }}>
        <p>Office 2D — loading Phaser...</p>
      </div>
    </RealtimeProvider>
  );
}
