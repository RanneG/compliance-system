import type { PermitStatus } from '../types'
import { STATUS_LABEL } from '../lib/format'

export default function StatusBadge({ status }: { status: PermitStatus }) {
  return (
    <span className={`badge badge-${status}`}>
      <i />
      {STATUS_LABEL[status]}
    </span>
  )
}
