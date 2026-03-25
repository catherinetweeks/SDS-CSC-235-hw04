// Resources Used:
// 1) https://d3-graph-gallery.com/graph/backgroundmap_basic.html, 


// The svg
const svg = d3.select("#map");
const width = +svg.attr("width");
const height = +svg.attr("height");

// Map and projection
const projection = d3.geoNaturalEarth1()
    .scale(width / 1.3 / Math.PI)
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

// Load external data
d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
  .then(function(data) {
      svg.append("g")
        .selectAll("path")
        .data(data.features)
        .join("path")
            .attr("d", path)
            .attr("fill", "#c3c3c3")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);
  })
  .catch(function(error) {
      console.error("Error loading data:", error);
  });