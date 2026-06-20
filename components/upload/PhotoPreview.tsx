'use client'

interface PhotoPreviewProps {
  imageUrl: string
  label?: string
  order?: number
}

export function PhotoPreview({ imageUrl, label, order }: PhotoPreviewProps) {
  return (
    <div className="relative">
      <img
        src={imageUrl}
        alt={label || `照片 ${order || ''}`}
        className="w-full rounded-xl object-cover aspect-[4/3] shadow-md"
      />
      {(label || order) && (
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-black/60 text-white text-xs">
          {order && `#${order} `}{label}
        </div>
      )}
    </div>
  )
}
