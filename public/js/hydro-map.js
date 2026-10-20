/**
 * Hydrological warning map.
 * River sectors come from the CorelDRAW template (monitored reaches).
 */
const HYDRO_RIVER_COLOR = '#2E6CB5';
const HYDRO_RIVER_CASING = '#B7D2EE';
const HYDRO_LAND_FILL = '#F8FBFF';
const HYDRO_LAND_EDGE = '#7BA3D4';
const HYDRO_NOTE = 'Notă: Pe hartă sunt menționate doar râurile care sunt monitorizate de către AMM';
const HYDRO_SMOOTH = 0.85;
const HYDRO_PAINT_OPACITY = 0.95;

const HYDRO_PHENOMENA = [
  'Avertizare hidrologică',
];

function hydroIsMainRiver(feature) {
  const name = (feature && feature.properties && (feature.properties.name || feature.properties.shapeName)) || '';
  return name === 'Râu 64' || /Giurgiule|Sireu|Ungheni|Coste/.test(name);
}

function hydroLineStyle(color, feature, kind) {
  const active = !!color;
  const main = hydroIsMainRiver(feature);
  if (kind === 'casing') {
    return {
      color: active ? color : HYDRO_RIVER_CASING,
      weight: active ? (main ? 8 : 6.2) : (main ? 3.5 : 2.4),
      opacity: active ? HYDRO_PAINT_OPACITY : 1,
      lineCap: 'round',
      lineJoin: 'round',
    };
  }
  return {
    color: HYDRO_RIVER_COLOR,
    weight: main ? 2.15 : 1.35,
    opacity: 1,
    lineCap: 'round',
    lineJoin: 'round',
  };
}

function hydroCanPaint(feature) {
  return !(feature.properties && feature.properties.paintable === false);
}

function hydroFeatureStyle(feature, color) {
  return hydroLineStyle(color || '', feature);
}

function hydroApplyStyle(layer, color) {
  if (!layer) return;
  layer.setStyle(hydroLineStyle(color, layer.feature));
  if (layer._hydroCasing) {
    layer._hydroCasing.setStyle(hydroLineStyle(color, layer.feature, 'casing'));
  }
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
          color: HYDRO_LAND_EDGE,
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
  if (!map.getPane('hydroCasing')) {
    map.createPane('hydroCasing').style.zIndex = 455;
  }
  if (!map.getPane('hydroLines')) {
    map.createPane('hydroLines').style.zIndex = 450;
  }
  if (!map.getPane('hydroRivers')) {
    map.createPane('hydroRivers').style.zIndex = 470;
  }
  return fetch('/data/md-hydro.geojson?v=20261019s19')
    .then(response => response.json())
    .then(geo => {
      const casingGroup = L.geoJSON(geo, {
        pane: 'hydroCasing',
        interactive: false,
        smoothFactor: HYDRO_SMOOTH,
        style: feature => hydroLineStyle('', feature, 'casing'),
      }).addTo(map);
      const casings = [];
      casingGroup.eachLayer(layer => casings.push(layer));
      let index = 0;
      return L.geoJSON(geo, {
        smoothFactor: HYDRO_SMOOTH,
        style: feature => hydroFeatureStyle(feature, ''),
        onEachFeature(feature, line) {
          line._hydroCasing = casings[index++];
          line.options.pane = hydroCanPaint(feature) ? 'hydroRivers' : 'hydroLines';
          if (!hydroCanPaint(feature)) {
            line.options.interactive = false;
            return;
          }
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
      }).addTo(map);
    });
}

function hydroPlaceLine(layer, painted) {
  if (!layer._map || !hydroCanPaint(layer.feature)) return;
  const casing = layer._hydroCasing;
  if (painted) {
    if (casing) casing.bringToFront();
    layer.bringToFront();
    return;
  }
  layer.bringToBack();
  if (casing) casing.bringToBack();
}
