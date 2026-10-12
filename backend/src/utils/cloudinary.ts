/**
 * Deriva el public_id y el resource_type de una URL de Cloudinary.
 * Devuelve null para rutas legacy (uploads\...) o URLs ajenas a Cloudinary,
 * de modo que el llamador simplemente omite el borrado.
 */
export function extractPublicId(
  url: string
): { publicId: string; resourceType: string } | null {
  if (!url || !url.startsWith('http')) return null

  const m = url.match(
    /^https:\/\/res\.cloudinary\.com\/[^/]+\/([^/]+)\/upload\/(?:v\d+\/)?(.+?)(?:\.[^./]+)?$/
  )
  if (!m) return null

  return { resourceType: m[1], publicId: m[2] }
}
