import { useEffect, useState, type ComponentType, type SVGProps } from 'react'
import { Callout } from './components/Callout'
import { Intro } from './components/Intro'
import { IconBluetooth, IconCamera, IconCar, IconMagnet, IconReport, IconSettings, IconSteps } from './components/icons'
import { BluetoothView } from './features/bluetooth/BluetoothView'
import { CameraInspection } from './features/camera/CameraInspection'
import { ChecklistView } from './features/checklist/ChecklistView'
import { MoreView, SHOW_INTRO_EVENT } from './features/diagnostics/MoreView'
import { ReportView } from './features/report/ReportView'
import { SensorView } from './features/sensors/SensorView'
import { WorkflowView } from './features/workflow/WorkflowView'
import { hasSeenIntro } from './lib/prefs'
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
  const [showIntro, setShowIntro] = useState(() => !hasSeenIntro())

  useEffect(() => {
    const open = () => {
      window.location.hash = '#/workflow'
      setShowIntro(true)
    }
    window.addEventListener(SHOW_INTRO_EVENT, open)
    return () => window.removeEventListener(SHOW_INTRO_EVENT, open)
  }, [])

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <a className="brand" href="#/workflow">
            <img src="/pwa-64x64.png" alt="" width={32} height={32} />
            <span>
              CarGuard
              <small>فحص السيارة</small>
            </span>
          </a>
          <span className="header-spacer" />
          <a className="icon-btn" href="#/more" aria-current={route === 'more' ? 'page' : undefined} aria-label="الإعدادات والتوافق">
            <IconSettings />
          </a>
        </div>
      </header>
      <main className="app-main" aria-busy={!ready}>
        {storageError && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <Callout tone="danger" role="alert">{storageError}</Callout>
          </div>
        )}
        {/* Keyed by route: leaving the camera page unmounts it (releasing the camera) and replays the entry motion. */}
        <div className="route-view" key={route}>
          <View />
        </div>
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
      {showIntro && <Intro onClose={() => setShowIntro(false)} />}
    </>
  )
}
