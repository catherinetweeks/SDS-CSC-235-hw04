// Resources Used:
// 1) https://d3-graph-gallery.com/graph/backgroundmap_basic.html, 

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
        "FRA": [2.2137, 46.2276], // France (center of mainland)
        "USA": [-98.5795, 39.8283], // US (optional, common fix)
        "NOR": [8.4689, 60.4720] // Norway example
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

    const jitterAmount = 7;

    countries.forEach(c => {
        if (!c.coords) return;

        c.languages.forEach(lang => {
            languagePoints.push({
                country: c.Name,
                language: lang.Language,

                // add jitter so we can see multiple languages in same country
                coords: [
                    c.coords[0] + (Math.random() - 0.5) * jitterAmount,
                    c.coords[1] + (Math.random() - 0.5) * jitterAmount
                ],
                official: lang.IsOfficial,
                percentspeaker: lang.Percentage,
                numberspeaker: lang.Percentage * c.Population / 100
            });
        });
    });

    mapGroup
        .selectAll("circle")
        .data(languagePoints)
        .join("circle")
        .attr("cx", d => d.coords[0])
        .attr("cy", d => d.coords[1])
        .attr("r", d => d.percentspeaker / 15)
        // change fill color based on whether or not the language is official
        .attr("fill", d => d.official === "F" ? "red" : "green")
        .attr("fill-opacity", 1);
});

    // initial zoom location
    const initialCoords = [20, 46];
    const projected = projection(initialCoords);

    // iniital zoom scale
    const initialScale = 5;
    const transform = d3.zoomIdentity
        .translate(
            width / 2 - projected[0] * initialScale,
            height / 2 - projected[1] * initialScale
            )
        .scale(initialScale);
    svg.call(zoom.transform, transform)
});
