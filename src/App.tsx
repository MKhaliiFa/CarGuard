import type { ComponentType, SVGProps } from 'react'
import { Callout } from './components/Callout'
import { IconBluetooth, IconCamera, IconCar, IconMagnet, IconReport, IconSettings, IconSteps } from './components/icons'
import { BluetoothView } from './features/bluetooth/BluetoothView'
import { CameraInspection } from './features/camera/CameraInspection'
import { ChecklistView } from './features/checklist/ChecklistView'
import { MoreView } from './features/diagnostics/MoreView'
import { ReportView } from './features/report/ReportView'
import { SensorView } from './features/sensors/SensorView'
import { WorkflowView } from './features/workflow/WorkflowView'
import { useHashRoute, type Route } from './lib/useHashRoute'
import { useInspection } from './state/InspectionContext'

const VIEWS: Record<Route, ComponentType> = {
  workflow: WorkflowView,
  checklist: ChecklistView,
  camera: CameraInspection,
  sensor: SensorView,
  bluetooth: BluetoothView,
  report: ReportView,
  more: MoreView,
}

const NAV: { route: Route; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { route: 'workflow', label: 'الخطوات', Icon: IconSteps },
  { route: 'checklist', label: 'الخريطة', Icon: IconCar },
  { route: 'camera', label: 'الكاميرا', Icon: IconCamera },
  { route: 'sensor', label: 'المستشعر', Icon: IconMagnet },
  { route: 'bluetooth', label: 'بلوتوث', Icon: IconBluetooth },
  { route: 'report', label: 'التقرير', Icon: IconReport },
]

export function App() {
  const route = useHashRoute()
  const { ready, storageError } = useInspection()
  const View = VIEWS[route]

  return (
    <>
      <header className="app-header">
        <a className="brand" href="#/workflow">
          <img src="/pwa-64x64.png" alt="" width={30} height={30} />
          <span>
            CarGuard
            <small>فحص السيارة</small>
          </span>
        </a>
        <span className="header-spacer" />
        <a className="btn btn--ghost" href="#/more" aria-current={route === 'more' ? 'page' : undefined} aria-label="الإعدادات والتوافق">
          <IconSettings width={20} height={20} />
        </a>
      </header>
      <main className="app-main" aria-busy={!ready}>
        {storageError && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Callout tone="danger" role="alert">{storageError}</Callout>
          </div>
        )}
        {/* Camera page is keyed by route so leaving it unmounts and releases the camera. */}
        <View key={route} />
      </main>
      <nav className="bottom-nav" aria-label="التنقل الرئيسي">
        <ul>
          {NAV.map(({ route: r, label, Icon }) => (
            <li key={r}>
              <a href={`#/${r}`} aria-current={route === r ? 'page' : undefined}>
                <Icon />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
