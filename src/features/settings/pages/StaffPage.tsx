import { PageHeader } from '@/shared/ui';
import { StaffSection } from '../components/StaffSection';

/** Staff / RBAC management — moved out of the settings page onto its own route. */
export default function StaffPage() {
  return (
    <div>
      <PageHeader heading="Xodimlar" subheading="Jamoa a'zolari va rollar" />
      <StaffSection />
    </div>
  );
}
