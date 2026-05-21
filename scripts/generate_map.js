import fs from 'fs';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';

// Estonia Bounding Box (Expanded to add plenty of padding)
const latMin = 55.5; // Latvia/Lithuania
const latMax = 61.5; // Finland
const lonMin = 19.5; // Baltic Sea
const lonMax = 30.5; // Russia

// Zoom level (increased for sharpness)
const zoom = 10;

function lon2tile(lon, zoom) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
}

function lat2tile(lat, zoom) {
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
}

const xMin = lon2tile(lonMin, zoom);
const xMax = lon2tile(lonMax, zoom);
// Note: y increases downwards
const yMinTile = lat2tile(latMax, zoom); // North is smaller Y
const yMaxTile = lat2tile(latMin, zoom); // South is larger Y

const cols = xMax - xMin + 1;
const rows = yMaxTile - yMinTile + 1;
const tileSize = 256;

const width = cols * tileSize;
const height = rows * tileSize;

console.log(`Generating map with zoom ${zoom}, cols: ${cols}, rows: ${rows}, width: ${width}, height: ${height}`);

// We will use Stadia Maps or CartoDB Positron No Labels (which is free and doesn't require an API key usually for light usage)
// CartoDB Positron without labels: https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png
// Stamen Watercolor (via Stadia) might need API key.
// Let's use OpenStreetMap standard for now, but the requirement is "only rivers, lakes and water bodies, borders, no text, no reliefs".
// This is perfectly matched by "CartoDB Voyager No Labels" or "CartoDB Positron No Labels"
// Wait, "CartoDB Positron No Labels" shows borders and water, but it's very pale. "CartoDB Dark Matter No Labels" is dark.
// Let's use CartoDB Positron No Labels.
const getTileUrl = (x, y, z) => `https://a.basemaps.cartocdn.com/rastertiles/voyager_nolabels/${z}/${x}/${y}.png`;

async function downloadTile(x, y, z) {
  const url = getTileUrl(x, y, z);
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'arraybuffer'
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error(`Error downloading tile ${z}/${x}/${y}:`, error.message);
    // Return an empty transparent tile
    return await sharp({
      create: {
        width: 256,
        height: 256,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    }).png().toBuffer();
  }
}

async function generateMap() {
  const composites = [];
  const tasks = [];
  
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMinTile; y <= yMaxTile; y++) {
      tasks.push({x, y});
    }
  }

  console.log(`Starting download of ${tasks.length} tiles...`);
  let completed = 0;
  
  // Concurrent download with concurrency limit of 10
  const limit = 10;
  for (let i = 0; i < tasks.length; i += limit) {
    const batch = tasks.slice(i, i + limit);
    const results = await Promise.all(batch.map(async (t) => {
      const buffer = await downloadTile(t.x, t.y, zoom);
      return {
        input: buffer,
        left: (t.x - xMin) * tileSize,
        top: (t.y - yMinTile) * tileSize
      };
    }));
    composites.push(...results);
    completed += batch.length;
    process.stdout.write(`\rDownloaded ${completed}/${tasks.length} tiles`);
  }
  console.log('\nStitching tiles together...');
  
  const baseImage = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  });

  const outputDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'estonia_map.webp');

  await baseImage
    .composite(composites)
    .webp({ quality: 80 })
    .toFile(outputPath);

  console.log(`Map successfully generated at ${outputPath}`);
  
  // Output metadata for mapping lat/lng to pixels
  const metadata = {
    zoom,
    tileXMin: xMin,
    tileYMin: yMinTile,
    tileSize,
    width,
    height
  };
  
  fs.writeFileSync(
    path.join(process.cwd(), 'src', 'mapMetadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  
  console.log('Map metadata saved to src/mapMetadata.json');
}

generateMap().catch(console.error);
