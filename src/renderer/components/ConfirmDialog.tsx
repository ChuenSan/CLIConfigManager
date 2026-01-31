import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { clsx } from 'clsx'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  onConfirm
}: ConfirmDialogProps) {
  const { t } = useTranslation()

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-app-surface rounded-xl p-6 w-[400px] max-w-[90vw] border border-app-border shadow-2xl z-50 animate-slide-in focus:outline-none">
          <Dialog.Title className="text-lg font-semibold text-app-text mb-2">
            {title}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-app-text-muted mb-6 whitespace-pre-wrap">
            {description}
          </Dialog.Description>

          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="px-4 py-2 bg-app-surface-hover text-app-text rounded-md text-sm hover:bg-app-border transition-colors">
                {cancelLabel || t('dialog.cancel')}
              </button>
            </Dialog.Close>
            <button
              onClick={handleConfirm}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                variant === 'danger'
                  ? 'bg-danger text-white hover:bg-red-600'
                  : 'bg-primary text-white hover:bg-primary-hover'
              )}
            >
              {confirmLabel || t('dialog.confirm')}
            </button>
          </div>

          <Dialog.Close asChild>
            <button className="absolute top-4 right-4 text-app-text-muted hover:text-app-text transition-colors">
              <X size={18} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
