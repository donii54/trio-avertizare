/**
 * Hydrological warning map.
 * River sectors come from the CorelDRAW template (monitored reaches).
 */
const HYDRO_RIVER_COLOR = '#2E6CB5';
const HYDRO_LAND_FILL = '#FBF9FD';
const HYDRO_LAND_EDGE = '#C4B3D6';
const HYDRO_NOTE = 'Notă: Pe hartă sunt menționate doar râurile care sunt monitorizate de către AMM';

const HYDRO_PHENOMENA = [
  'Avertizare hidrologică',
];

function hydroLineStyle(color) {
  const active = !!color;
  return {
    color: active ? color : HYDRO_RIVER_COLOR,
    weight: active ? 5 : 1.8,
    opacity: 1,
    lineCap: 'round',
    lineJoin: 'round',
  };
}

function hydroFeatureStyle(feature, color) {
  return hydroLineStyle(color || '');
}

function addHydroCountry(map, geo) {
  const boundsLayer = L.geoJSON(geo, {
    interactive: false,
    style: { opacity: 0, fillOpacity: 0, weight: 0 },
  }).addTo(map);
  fetch('/data/md-outline.geojson?v=20261015east')
    .then(response => response.json())
    .then(outline => {
      L.geoJSON(outline, {
        interactive: false,
        style: {
          stroke: true,
          color: '#C4B3D6',
          weight: 1.6,
          opacity: 1,
          fill: true,
          fillColor: HYDRO_LAND_FILL,
          fillOpacity: 1,
        },
      }).addTo(map);
    })
    .catch(err => console.error('Hydro outline load error:', err));
  return boundsLayer;
}

function loadHydroRivers(map, options) {
  options = options || {};
  if (!map.getPane('hydroRivers')) {
    const pane = map.createPane('hydroRivers');
    pane.style.zIndex = 460;
  }
  return fetch('/data/md-hydro.geojson?v=20261015east')
    .then(response => response.json())
    .then(geo => L.geoJSON(geo, {
      pane: 'hydroRivers',
      smoothFactor: 0.35,
      style: feature => hydroFeatureStyle(feature, ''),
      onEachFeature(feature, line) {
        const label = feature.properties.name || feature.properties.shapeName || '';
        feature.properties._name = label;
        feature.properties._label = label;
        if (label && !options.widget) {
          line.bindTooltip(label, { sticky: true, opacity: 0.95, className: 'district-label' });
        }
        line.on('click', event => {
          if (options.onClick) options.onClick(line, event);
        });
        line.on('dblclick', event => {
          if (!options.onDblClick) return;
          L.DomEvent.stop(event);
          options.onDblClick(line, event);
        });
      },
    }).addTo(map));
}
