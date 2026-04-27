// Shared UI Component Library for @agency/ui
// All components exported from this barrel file

export { Button } from './Button'
export type { ButtonProps } from './Button'

export { Card, CardHeader, CardTitle } from './Card'
export type { CardProps } from './Card'

export { Modal } from './Modal'
export type { ModalProps } from './Modal'

export { SlideOver } from './SlideOver'
export type { SlideOverProps } from './SlideOver'

export { Dropdown } from './Dropdown'
export type { DropdownProps, DropdownOption } from './Dropdown'

export { StatusBadge } from './StatusBadge'
export type { StatusBadgeProps, StatusVariant } from './StatusBadge'

export { MetricCard } from './MetricCard'
export type { MetricCardProps } from './MetricCard'

export {
    LoadingSpinner,
    SkeletonLine,
    SkeletonBlock,
    SkeletonCard,
    SkeletonTable,
} from './Loading'
export type { LoadingSpinnerProps } from './Loading'

export { EmptyState } from './EmptyState'
export type { EmptyStateProps } from './EmptyState'

export { ToastProvider, useToast } from './Toast'

export { DataTable } from './DataTable'
export type { DataTableProps, Column } from './DataTable'

export { MediaPicker } from './MediaPicker'
export type { MediaPickerProps, MediaAsset } from './MediaPicker'

export { CopyEditor } from './CopyEditor/CopyEditor'
export type { CopyEditorProps } from './CopyEditor/CopyEditor'
