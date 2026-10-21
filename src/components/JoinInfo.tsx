import { QRCodeSVG } from 'qrcode.react'
import { participantUrl } from '../lib/routes'

export function JoinInfo({ code, size = 220 }: { code: string; size?: number }) {
  const url = participantUrl(code)
  return (
    <div className="join">
      <QRCodeSVG value={url} size={size} marginSize={2} className="join__qr" />
      <div className="join__text">
        <div className="join__label">Rejoindre l'atelier</div>
        <div className="join__url">{url.replace(/^https?:\/\//, '')}</div>
        <div className="join__code">
          Code <strong>{code}</strong>
        </div>
      </div>
    </div>
  )
}
