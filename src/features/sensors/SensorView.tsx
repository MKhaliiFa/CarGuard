import { PageHead } from '../../components/PageHead'
import { MagnetometerPanel } from './MagnetometerPanel'

export function SensorView() {
  return (
    <>
      <PageHead eyebrow="MAGNETIC FIELD" title="مستشعر المجال المغناطيسي">
        <p>قارن شدة المجال المغناطيسي بين مناطق السيارة وخط أساس تسجّله أنت. التغيّر مؤشر للفحص البصري، وليس كشفًا عن جهاز.</p>
      </PageHead>
      <MagnetometerPanel />
    </>
  )
}
