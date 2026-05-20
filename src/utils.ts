import mapMetadata from './mapMetadata.json';

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; 
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function getRenderedMapMetrics(containerWidth: number, containerHeight: number) {
  const imageAspect = mapMetadata.width / mapMetadata.height;
  const containerAspect = containerWidth / containerHeight;
  
  let scale = 1, offsetX = 0, offsetY = 0;
  if (containerAspect > imageAspect) {
    scale = containerWidth / mapMetadata.width;
    const renderedHeight = mapMetadata.height * scale;
    offsetY = (containerHeight - renderedHeight) / 2;
  } else {
    scale = containerHeight / mapMetadata.height;
    const renderedWidth = mapMetadata.width * scale;
    offsetX = (containerWidth - renderedWidth) / 2;
  }
  return { scale, offsetX, offsetY };
}

export function latLngToPixel(lat: number, lng: number, containerWidth: number, containerHeight: number): { x: number, y: number } {
  const zoom = mapMetadata.zoom;
  const tileXMin = mapMetadata.tileXMin;
  const tileYMin = mapMetadata.tileYMin;
  const tileSize = mapMetadata.tileSize;
  
  const n = Math.pow(2, zoom);
  const xTileRaw = (lng + 180) / 360 * n;
  const latRad = deg2rad(lat);
  const yTileRaw = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
  
  const originalPixelX = (xTileRaw - tileXMin) * tileSize;
  const originalPixelY = (yTileRaw - tileYMin) * tileSize;
  
  const { scale, offsetX, offsetY } = getRenderedMapMetrics(containerWidth, containerHeight);
  
  return {
    x: originalPixelX * scale + offsetX,
    y: originalPixelY * scale + offsetY
  };
}

export function pixelToLatLng(x: number, y: number, containerWidth: number, containerHeight: number): { lat: number, lng: number } {
  const { scale, offsetX, offsetY } = getRenderedMapMetrics(containerWidth, containerHeight);
  
  const originalPixelX = (x - offsetX) / scale;
  const originalPixelY = (y - offsetY) / scale;
  
  const zoom = mapMetadata.zoom;
  const tileXMin = mapMetadata.tileXMin;
  const tileYMin = mapMetadata.tileYMin;
  const tileSize = mapMetadata.tileSize;
  
  const xTileRaw = originalPixelX / tileSize + tileXMin;
  const yTileRaw = originalPixelY / tileSize + tileYMin;
  
  const n = Math.pow(2, zoom);
  const lng = xTileRaw / n * 360 - 180;
  
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * yTileRaw / n)));
  const lat = latRad * (180 / Math.PI);
  
  return { lat, lng };
}

export function distanceToPath(lat: number, lng: number, path: [number, number][]): number {
  let minDistance = Infinity;
  for (const point of path) {
    const d = getDistance(lat, lng, point[0], point[1]);
    if (d < minDistance) {
      minDistance = d;
    }
  }
  return minDistance;
}
