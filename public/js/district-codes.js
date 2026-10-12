// District label codes keyed by GeoJSON shapeName and common Romanian variants.
const DISTRICT_SHORT_CODES = {
  "Anenii Noi": "AN",
  "Balti": "Bălți",
  "Bălți": "Bălți",
  "Bălţi": "Bălți",
  "Basarabeasca": "BS",
  "Bender": "Bender",
  "Tighina": "Bender",
  "Briceni": "BR",
  "Cahul": "CH",
  "Calarasi": "CL",
  "Călărași": "CL",
  "Călăraşi": "CL",
  "Cantemir": "CT",
  "Causeni": "CS",
  "Căușeni": "CS",
  "Căuşeni": "CS",
  "Chisinau": "CHIȘINĂU",
  "Chișinău": "CHIȘINĂU",
  "Chişinău": "CHIȘINĂU",
  "Cimislia": "CM",
  "Cimișlia": "CM",
  "Cimişlia": "CM",
  "Criulei": "CR",
  "Criuleni": "CR",
  "Donduseni": "DN",
  "Dondușeni": "DN",
  "Donduşeni": "DN",
  "Drochia": "DR",
  "Dubasari": "DB",
  "Dubăsari": "DB",
  "Edinet": "ED",
  "Edineț": "ED",
  "Edineţ": "ED",
  "Falesti": "FL",
  "Fălești": "FL",
  "Făleşti": "FL",
  "Floresti": "FR",
  "Florești": "FR",
  "Floreşti": "FR",
  "Gagauzia": "UTAG",
  "Găgăuzia": "UTAG",
  "Unitatea Teritorială Autonomă Găgăuzia": "UTAG",
  "Comrat": "UTAG",
  "Glodeni": "GL",
  "Hincesti": "HN",
  "Hîncești": "HN",
  "Hînceşti": "HN",
  "Ialoveni": "IL",
  "Leova": "LV",
  "Nisporeni": "NS",
  "Ocnita": "OC",
  "Ocnița": "OC",
  "Ocniţa": "OC",
  "Orhei": "OR",
  "RIscani": "RS",
  "Rîșcani": "RS",
  "Rîşcani": "RS",
  "Rezina": "RZ",
  "SIngerei": "SG",
  "Sîngerei": "SG",
  "Soldanesti": "SD",
  "Șoldănești": "SD",
  "Şoldăneşti": "SD",
  "Soroca": "SR",
  "Stefan Voda": "SV",
  "Ștefan Vodă": "SV",
  "Ştefan Vodă": "SV",
  "Straseni": "ST",
  "Strășeni": "ST",
  "Străşeni": "ST",
  "Taraclia": "TR",
  "Telenesti": "TL",
  "Telenești": "TL",
  "Teleneşti": "TL",
  "Transnistria": "Transnistria",
  "Tiraspol": "Tiraspol",
  "Ungheni": "UN"
};

function districtLabel(name) {
  if (!name) return '???';
  return DISTRICT_SHORT_CODES[name] || name;
}

function meteoLabelOffset() {
  return [0, 0];
}

function largestPartCenter(layer) {
  const polys = layer.getLatLngs ? layer.getLatLngs() : null;
  if (!polys || !polys.length) return layer.getBounds().getCenter();

  const outers = (polys[0] && polys[0][0] && typeof polys[0][0].lat === 'number')
    ? [polys[0]]
    : polys.map(part => part[0]).filter(ring => ring && ring.length);

  let best = null;
  let bestArea = -1;
  outers.forEach(ring => {
    let area = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      area += ring[j].lng * ring[i].lat - ring[i].lng * ring[j].lat;
    }
    area = Math.abs(area);
    if (area > bestArea) {
      bestArea = area;
      best = ring;
    }
  });
  if (!best) return layer.getBounds().getCenter();

  let twice = 0;
  let x = 0;
  let y = 0;
  for (let i = 0, j = best.length - 1; i < best.length; j = i++) {
    const cross = best[j].lng * best[i].lat - best[i].lng * best[j].lat;
    twice += cross;
    x += (best[j].lng + best[i].lng) * cross;
    y += (best[j].lat + best[i].lat) * cross;
  }
  if (!twice) return L.latLng(best[0].lat, best[0].lng);
  return L.latLng(y / (3 * twice), x / (3 * twice));
}
