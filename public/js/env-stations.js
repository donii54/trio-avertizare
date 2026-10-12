/**
 * Air-quality stations. The base map matches the meteorological warnings.
 * Only these circles change color: green by default, then yellow, orange, red.
 */
const ENV_LAND_FILL = '#D8F3E4';
const ENV_LAND_EDGE = '#6FCB96';

function addEnvCountryOutline(map, geo) {
  L.geoJSON(geo, {
    interactive: false,
    style: {
      color: ENV_LAND_EDGE,
      weight: 6,
      opacity: 1,
      fillColor: ENV_LAND_FILL,
      fillOpacity: 1,
    },
  }).addTo(map);
}

function addEnvRoads(map) {
  if (!map.getPane('envRoads')) {
    const pane = map.createPane('envRoads');
    pane.style.zIndex = 450;
    pane.style.pointerEvents = 'none';
  }
  fetch('/data/md-roads.geojson')
    .then(r => r.json())
    .then(geo => {
      L.geoJSON(geo, {
        pane: 'envRoads',
        interactive: false,
        style(feature) {
          const highway = feature.properties && feature.properties.highway;
          const major = highway === 'motorway' || highway === 'trunk';
          return {
            color: major ? '#8A9390' : '#B7C0BB',
            weight: major ? 1.7 : 1.15,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          };
        },
      }).addTo(map);
    })
    .catch(err => console.error('Roads load error:', err));
}

const ENV_PLACE_NAMES = {
  Cahul: 'Cahul',
  Gagauzia: 'Comrat',
  Taraclia: 'Taraclia',
  Cantemir: 'Cantemir',
  Basarabeasca: 'Basarabeasca',
  Leova: 'Leova',
  Cimislia: 'Cimișlia',
  'Stefan Voda': 'Ștefan Vodă',
  Bender: 'Bender',
  Causeni: 'Căușeni',
  Hincesti: 'Hîncești',
  Ialoveni: 'Ialoveni',
  Nisporeni: 'Nisporeni',
  Chisinau: 'Chișinău',
  'Anenii Noi': 'Anenii Noi',
  Criuleni: 'Criuleni',
  Straseni: 'Strășeni',
  Ungheni: 'Ungheni',
  Dubasari: 'Dubăsari',
  Calarasi: 'Călărași',
  Transnistria: 'Tiraspol',
  Falesti: 'Fălești',
  Orhei: 'Orhei',
  Glodeni: 'Glodeni',
  Balti: 'Bălți',
  Telenesti: 'Telenești',
  SIngerei: 'Sîngerei',
  RIscani: 'Rîșcani',
  Rezina: 'Rezina',
  Soldanesti: 'Șoldănești',
  Floresti: 'Florești',
  Drochia: 'Drochia',
  Edinet: 'Edineț',
  Briceni: 'Briceni',
  Soroca: 'Soroca',
  Donduseni: 'Dondușeni',
  Ocnita: 'Ocnița',
};

function envPlaceName(shapeName) {
  return ENV_PLACE_NAMES[shapeName] || shapeName;
}

const ENV_STATIONS = {
  balti:     { label: 'Bălți',    lat: 47.77404, lng: 27.93126 },
  mateuti:   { label: 'Mateuți',  lat: 47.69303, lng: 28.85393 },
  chisinau:  { label: 'Chișinău', lat: 47.01667, lng: 28.87131 },
  bender:    { label: 'Căușeni', lat: 46.64928, lng: 29.32427 },
};

function envLevelClass(color) {
  const value = String(color || '').toLowerCase();
  if (!value || value === '#28d762' || value === '#53ad55') return '';
  if (value.includes('ff0000') || value.includes('d81833')) return 'warning';
  if (value.includes('ff8a00') || value.includes('d86204')) return 'watch';
  if (value.includes('ffff00') || value.includes('ffed00') || value.includes('fce636')) return 'advisory';
  return '';
}

function envFillColor(color) {
  const level = envLevelClass(color);
  if (level === 'warning') return '#FF0000';
  if (level === 'watch') return '#FF8A00';
  if (level === 'advisory') return '#FFFF00';
  return '#28D762';
}

function envMarkerOptions(color, radius) {
  const size = radius == null ? 18 : radius;
  return {
    radius: size,
    color: '#ffffff',
    weight: size >= 80 ? 10 : (size >= 22 ? 5 : 4),
    opacity: 1,
    fillColor: envFillColor(color),
    fillOpacity: 1,
  };
}
