import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Douglas-Peucker simplification algorithm
function getSqDist(p1, p2) {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return dx * dx + dy * dy;
}

function getSqSegDist(p, p1, p2) {
  let x = p1[0], y = p1[1];
  let dx = p2[0] - x, dy = p2[1] - y;
  
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = p2[0];
      y = p2[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

function simplifyDPStep(points, first, last, sqTolerance, simplified) {
  let maxSqDist = sqTolerance;
  let index;

  for (let i = first + 1; i < last; i++) {
    const sqDist = getSqSegDist(points[i], points[first], points[last]);
    if (sqDist > maxSqDist) {
      index = i;
      maxSqDist = sqDist;
    }
  }

  if (maxSqDist > sqTolerance) {
    if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
    simplified.push(points[index]);
    if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
  }
}

function simplify(points, tolerance) {
  if (points.length <= 2) return points;
  const sqTolerance = tolerance !== undefined ? tolerance * tolerance : 1;
  const simplified = [points[0]];
  simplifyDPStep(points, 0, points.length - 1, sqTolerance, simplified);
  simplified.push(points[points.length - 1]);
  return simplified;
}

const POIs = [
  'Tallinn', 'Tartu', 'Narva', 'Pärnu', 'Peipsi järv', 'Võrtsjärv',
  'Viljandi', 'Rakvere', 'Kuressaare', 'Haapsalu', 'Võru', 'Emajõgi',
  'Pärnu jõgi', 'Narva jõgi', 'Hiiumaa', 'Suur Munamägi', 'Soomaa rahvuspark',
  'Matsalu laht', 'Endla looduskaitseala', 'Kasari jõgi', 'Kärdla', 'Valga', 'Põlva', 'Tapa',
  'Otepää', 'Haanja', 'Pandivere', 'Sakala', 'Rõuge ürgorg', 'Taevaskoja'
];

async function fetchPolygons() {
  const result = {};
  // Tolerance for simplification (degrees). Approx 0.01 = 1km, 0.001 = 100m. 
  // We want highly simplified shapes that look good but don't slow down the browser.
  const tolerance = 0.005;

  for (const name of POIs) {
    try {
      console.log(`Fetching polygon for: ${name}`);
      const res = await axios.get(`https://nominatim.openstreetmap.org/search.php`, {
        params: {
          q: `${name}, Estonia`,
          polygon_geojson: 1,
          format: 'json',
          limit: 1
        },
        headers: {
          'User-Agent': 'EstoniaMapGame/1.0'
        }
      });

      if (res.data && res.data.length > 0) {
        const item = res.data[0];
        if (item.geojson) {
          const type = item.geojson.type;
          let coords = [];
          
          if (type === 'Polygon') {
            coords = item.geojson.coordinates[0]; // Outer ring
          } else if (type === 'MultiPolygon') {
            // Find the largest polygon by number of points
            let largest = [];
            for (const poly of item.geojson.coordinates) {
              if (poly[0].length > largest.length) {
                largest = poly[0];
              }
            }
            coords = largest;
          } else if (type === 'LineString') {
            coords = item.geojson.coordinates;
          }

          if (coords.length > 0) {
            // GeoJSON is [lng, lat], our game uses [lat, lng]
            const mapped = coords.map(c => [c[1], c[0]]);
            const simplified = simplify(mapped, tolerance);
            
            result[name] = simplified;
            console.log(`  -> Success. Original points: ${mapped.length}, Simplified: ${simplified.length}`);
          } else {
            console.log(`  -> No usable geometry found.`);
          }
        } else {
          console.log(`  -> No geojson returned.`);
        }
      } else {
        console.log(`  -> Not found.`);
      }

      // Nominatim requires 1 sec delay
      await new Promise(r => setTimeout(r, 1100));
    } catch (e) {
      console.error(`  -> Failed:`, e.message);
    }
  }

  const outputPath = path.join(process.cwd(), 'src', 'polygons.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`Saved to ${outputPath}`);
}

fetchPolygons();
