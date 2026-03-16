mapboxgl.accessToken = mapToken;

const coords = listingData.geometry?.coordinates || [72.8777, 19.0760];

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  center: coords,
  zoom: 9,
});

new mapboxgl.Marker({ color: "red" })
  .setLngLat(coords)
  .setPopup(
    new mapboxgl.Popup({ offset: 25 }).setHTML(
      `<h4>${listingData.title}</h4><p>Exact location provided after booking</p>`
    )
  )
  .addTo(map);