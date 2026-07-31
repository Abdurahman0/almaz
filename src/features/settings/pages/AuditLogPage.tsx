import { Card, PageHeader, SkeletonRows } from '@/shared/ui';
import { formatDateTime } from '@/shared/lib/format';
import { useAudit } from '../rbac';

/** Audit log — moved out of the settings page onto its own route. */
export default function AuditLogPage() {
  const audit = useAudit();

  return (
    <div>
      <PageHeader heading="Amallar jurnali" subheading="Tizimda bajarilgan amallar tarixi" />

      <Card>
        {audit.isPending && <SkeletonRows rows={8} />}
        <div className="space-y-2">
          {audit.data?.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-[var(--r-sm)] border border-border px-3 py-2 text-xs"
            >
              <span className="text-text">
                {a.action} · <span className="text-muted">{a.entity_type}</span>
              </span>
              <span className="text-muted">{formatDateTime(a.created_at)}</span>
            </div>
          ))}
          {audit.isSuccess && audit.data.length === 0 && (
            <p className="text-sm text-muted">Jurnal bo'sh</p>
          )}
        </div>
      </Card>
    </div>
  );
}
