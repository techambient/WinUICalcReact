import { CalcButton } from './calc-button'

interface MemoryBarProps {
  hasMemory: boolean
  disabled?: boolean
  onClear?: () => void
  onRecall?: () => void
  onAdd?: () => void
  onSubtract?: () => void
  onStore: () => void
  onOpenList: () => void
  storeAndListOnly?: boolean
}

export function MemoryBar({
  hasMemory,
  disabled,
  onClear,
  onRecall,
  onAdd,
  onSubtract,
  onStore,
  onOpenList,
  storeAndListOnly,
}: MemoryBarProps) {
  return (
    <div className="flex h-9 shrink-0 gap-0.5 px-1" role="group" aria-label="Memory controls">
      {!storeAndListOnly && (
        <>
          <MemButton label="MC" aria="Clear all memory" onClick={onClear} disabled={!hasMemory} />
          <MemButton label="MR" aria="Memory recall" onClick={onRecall} disabled={!hasMemory || disabled} />
          <MemButton label="M+" aria="Memory add" onClick={onAdd} disabled={disabled} />
          <MemButton label="M-" aria="Memory subtract" onClick={onSubtract} disabled={disabled} />
        </>
      )}
      <MemButton label="MS" aria="Memory store" onClick={onStore} disabled={disabled} />
      <MemButton
        label={
          <span>
            M<span className="text-[10px]">▾</span>
          </span>
        }
        aria="Open memory flyout"
        onClick={onOpenList}
        disabled={!hasMemory}
        className="md:invisible"
      />
    </div>
  )
}

function MemButton({
  label,
  aria,
  onClick,
  disabled,
  className = '',
}: {
  label: React.ReactNode
  aria: string
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <CalcButton
      variant="subtle"
      aria-label={aria}
      title={aria}
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 text-xs font-semibold ${className}`}
    >
      {label}
    </CalcButton>
  )
}
