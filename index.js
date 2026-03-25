// Resources Used:
// 1) https://d3-graph-gallery.com/graph/backgroundmap_basic.html, 


// The svg
const svg = d3.select("#map");
// take the width and height from the svg element in the html file so I can adjust size in html instead of here.
const width = +svg.attr("width");
const height = +svg.attr("height");

// Map and projection
const projection = d3.geoNaturalEarth1()
    .scale(width / 1.3 / Math.PI)
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

// Create grouping for map for zoom feature
const mapGroup = svg.append("g");

// Create zoom behavior
const zoom = d3.zoom()
    .scaleExtent([1,8])
    .on("zoom", function(event) {
        mapGroup.attr("transform", event.transform);
    });

//Call zoom
svg.call(zoom);

// Load data
d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
  .then(function(data) {
    // append to svg
      mapGroup
        .selectAll("path")
        .data(data.features)
        .join("path")
            .attr("d", path)
            .attr("fill", "#e2e2e2")
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.2);

    // initial zoom location
    const initialCoords = [20, 46];
    const projected = projection(initialCoords);

    // iniital zoom scale
    const initialScale = 5;
    const transform = d3.zoomIdentity
        .translate(
            width/2 - projected[0] * initialScale,
            height / 2 - projected[1] * initialScale
            )
        .scale(initialScale);
    svg.call(zoom.transform, transform)
});
