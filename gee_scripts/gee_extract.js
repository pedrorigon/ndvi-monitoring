var roi = ee.Geometry.Rectangle([-54.02, -28.5, -53.75, -28.23]);

// 📐 Parâmetros da célula (~1 km² ≈ 0.009°)
var delta = 0.009;

var lonList = ee.List.sequence(-54.02, -53.75 - delta, delta);
var latList = ee.List.sequence(-28.5, -28.23 - delta, delta);

var cellList = [];

lonList.getInfo().forEach(function(lon) {
  latList.getInfo().forEach(function(lat) {
    var cell = ee.Feature(ee.Geometry.Rectangle([lon, lat, lon + delta, lat + delta]));
    cellList.push(cell);
  });
});

var cells = ee.FeatureCollection(cellList);

var years = ee.List.sequence(2014, 2024); // 10 years

// calcular NDVI médio (jan–mar) por célula e ano
var results = years.map(function(year) {
  var start = ee.Date.fromYMD(year, 1, 1);
  var end = start.advance(3, 'month');

  var ndviImage = ee.ImageCollection('MODIS/006/MOD13Q1')
    .filterDate(start, end)
    .filterBounds(roi)
    .select('NDVI')
    .mean();

  var yearCells = cells.map(function(cell) {
    var stats = ndviImage.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: cell.geometry(),
      scale: 250,
      maxPixels: 1e9
    });

    var ndvi = ee.Algorithms.If(stats.contains('NDVI'),
                                stats.get('NDVI'),
                                null);

    return cell.set({
      'year': year,
      'ndvi': ndvi,
      'centroid_lon': cell.geometry().centroid().coordinates().get(0),
      'centroid_lat': cell.geometry().centroid().coordinates().get(1)
    });
  });

  return yearCells;
});

var finalResults = ee.FeatureCollection(results).flatten();

Export.table.toDrive({
  collection: finalResults,
  description: 'NDVI_Ijui_GradeCompleta_1km_2014_2024',
  fileFormat: 'CSV'
});

