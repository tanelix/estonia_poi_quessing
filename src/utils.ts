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

function distanceToSegment(lat: number, lng: number, lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = lat2 - lat1;
  // Multiply dLng by cos(lat) approximation to fix longitude stretching distortion
  const cosLat = Math.cos(deg2rad(lat1));
  const dLng = (lng2 - lng1) * cosLat;
  
  const latDiff = lat - lat1;
  const lngDiff = (lng - lng1) * cosLat;
  
  if (dLat === 0 && dLng === 0) return getDistance(lat, lng, lat1, lng1);
  
  const t = (latDiff * dLat + lngDiff * dLng) / (dLat * dLat + dLng * dLng);
  
  let nearestLat, nearestLng;
  if (t < 0) {
    nearestLat = lat1;
    nearestLng = lng1;
  } else if (t > 1) {
    nearestLat = lat2;
    nearestLng = lng2;
  } else {
    nearestLat = lat1 + t * dLat;
    nearestLng = lng1 + t * (lng2 - lng1); // Un-scale for the actual lng coordinate
  }
  
  return getDistance(lat, lng, nearestLat, nearestLng);
}

export function distanceToPath(lat: number, lng: number, path: [number, number][]): number {
  let minDistance = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];
    const d = distanceToSegment(lat, lng, p1[0], p1[1], p2[0], p2[1]);
    if (d < minDistance) minDistance = d;
  }
  return minDistance;
}

export function isPointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pyi = polygon[i][0], pxi = polygon[i][1];
    const pyj = polygon[j][0], pxj = polygon[j][1];
    
    const intersect = ((pyi > lat) !== (pyj > lat)) &&
        (lng < (pxj - pxi) * (lat - pyi) / (pyj - pyi) + pxi);
    if (intersect) isInside = !isInside;
  }
  return isInside;
}

export function distanceToPolygon(lat: number, lng: number, polygon: [number, number][]): number {
  if (isPointInPolygon(lat, lng, polygon)) return 0;
  
  let minDistance = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const p1 = polygon[j];
    const p2 = polygon[i];
    const d = distanceToSegment(lat, lng, p1[0], p1[1], p2[0], p2[1]);
    if (d < minDistance) minDistance = d;
  }
  return minDistance;
}
