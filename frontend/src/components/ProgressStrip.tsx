import { PTW_STEPS, currentPart } from '../lib/format'
import type { PermitStatus } from '../types'

export default function ProgressStrip({ status, declared = false }: { status: PermitStatus; declared?: boolean }) {
  let part = currentPart(status)
  if (status === 'active' && declared) part = 3
  return (
    <ol className="steps">
      {PTW_STEPS.map((step) => {
        const state = step.id < part || status === 'completed' ? 'done' : step.id === part ? 'now' : ''
        return (
          <li key={step.id} className={state}>
            <span>{step.label}</span>
            <small>{step.title}</small>
          </li>
        )
      })}
    </ol>
  )
}
