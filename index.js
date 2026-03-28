// Resources Used:
// 1) https://d3-graph-gallery.com/graph/backgroundmap_basic.html, 
// 2) https://d3js.org/d3-force/collide,
// 3)

//const { percent } = require("motion");


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
    // limit panning to bounds of the map with a little wiggle room.
    .translateExtent([[-100,-100], [width + 100, height + 100]])
    .on("zoom", function(event) {
        mapGroup.attr("transform", event.transform);
    });

//Call zoom
svg.call(zoom);

// Load data
d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
  .then(function(world) {
    // append to svg
      mapGroup
        .selectAll("path")
        .data(world.features)
        .join("path")
            .attr("d", path)
            .attr("fill", "#e2e2e2")
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.2);
    // Load CSVs 
    Promise.all([
    d3.csv("country.csv"),
    d3.csv("countrylanguage.csv")
]).then(function([countries, languages]) {

    const languagesByCountry = d3.group(languages, d => d.CountryCode);

    // match country code to countries
    countries.forEach(c => {
        c.languages = languagesByCountry.get(c.Code) || [];
    });

    // create map to get coordinates
    const geoById = new Map(
        world.features.map(d => [d.id, d])
    );

    // manual coordinate overrides for france specifically (they took colonialism to an extreme)
    const manualCoords = {
        "FRA": [2.2137, 46.2276],
        "USA": [-98.5795, 39.8283],
        "NOR": [8.4689, 60.4720]
    };

    countries.forEach(c => {
        const geo = geoById.get(c.Code);
        if (geo) {
            if (manualCoords[c.Code]) {
                c.coords = projection(manualCoords[c.Code]); // convert lon/lat → screen coords
            } else {
                c.coords = path.centroid(geo);
            };
        }
    });

    const languagePoints = [];

    countries.forEach(c => {
        if (!c.coords) return;

        c.languages.forEach(lang => {
            const r = lang.Percentage / 20 + 1;

            languagePoints.push({
                country: c.Name,
                language: lang.Language,
                x: c.coords[0],
                y: c.coords[1],
                r: r,
                official: lang.IsOfficial,
                percentspeaker: lang.Percentage
            });
        });
    });

    // prevent circles from overlapping by using a force simulation to adjust the x and y coordinates 
    const simulation = d3.forceSimulation(languagePoints)
    .force("x", d3.forceX(d => d.x).strength(0.5))
    .force("y", d3.forceY(d => d.y).strength(0.5))
    .force("collide", d3.forceCollide(d => d.r + 1)) // +1 = padding
    .stop();

    for (let i = 0; i < 120; i++) simulation.tick();

    mapGroup
        .selectAll("circle")
        .data(languagePoints)
        .join("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", d => d.r)
        .attr("fill", d => d.official === "F" ? "red" : "green")
        .attr("fill-opacity", 1);
});

    // initial zoom location
    const initialCoords = [20, 46];
    const projected = projection(initialCoords);

    // iniital zoom scale
    const initialScale = 2;
    const transform = d3.zoomIdentity
        .translate(
            width / 2 - projected[0] * initialScale,
            height / 2 - projected[1] * initialScale
            )
        .scale(initialScale);
    svg.call(zoom.transform, transform)
});
