import { useEffect, useState } from 'react'
import { loadPhoto } from '../lib/storage'

interface PhotoThumbProps {
  readonly photoId: string
  readonly alt: string
  readonly size?: number
}

export function PhotoThumb({ photoId, alt, size = 88 }: PhotoThumbProps) {
  const [url, setUrl] = useState<string>()
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let objectUrl: string | undefined
    let cancelled = false
    loadPhoto(photoId)
      .then((p) => {
        if (cancelled) return
        if (!p) return setMissing(true)
        objectUrl = URL.createObjectURL(p.blob)
        setUrl(objectUrl)
      })
      .catch(() => !cancelled && setMissing(true))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photoId])

  const style = { width: size, height: size, borderRadius: 8, objectFit: 'cover' as const, background: 'var(--c-bg-raised)', display: 'block' }
  if (missing) return <div style={{ ...style, display: 'grid', placeItems: 'center' }} className="faint">غير متاحة</div>
  if (!url) return <div style={style} aria-busy="true" />
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt={alt} width={size} height={size} style={style} loading="lazy" />
    </a>
  )
}
