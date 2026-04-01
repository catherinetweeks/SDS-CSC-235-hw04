// Resources Used:
// 1) https://d3-graph-gallery.com/graph/backgroundmap_basic.html, 
// 2) https://d3js.org/d3-force/collide,
// 3) https://stackoverflow.com/questions/46005546/d3-v4-get-current-zoom-scale
// 4) https://richardbrath.wordpress.com/2018/11/24/using-font-attributes-with-d3-js/

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

// Creat pop-up container
const popup = d3.select("body")
    .append("div")
    .attr("id", "popup")
    .style("position", "absolute")
    .style("background", "white")
    .style("padding", "15px")
    .style("border-radius", "8px")
    .style("opacity", 0)
    .style("z-index", 10);

// Create tooltip
const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("background", "#000000")
    .style("color", "white")
    .style("font-family", "sans-serif")
    .style("padding", "5px 8px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("z-index", 10);

// make an overlay to dim the map when the pop up is active
const overlay = d3.select("body")
    .append("div")
    .attr("id", "overlay")
    .style("position", "absolute")
    .style("background", "rgba(0,0,0,0.4)")
    .style("opacity", 0)
    .style("pointer-events", "none")
    .style("z-index", 5);

//Call zoom
svg.call(zoom);

// Make it so pop up disappears when you click anywhere on the map
svg.on("click", function(event) {
    if (event.target.tagName !== "circle") {
        popup
            .style("opacity", 0)
            .style("pointer-events", "none"); // disable blocking of map interaction when popup is not active

        overlay
            .style("opacity", 0)
            .style("pointer-events", "none");
    }
});

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
                countryCode: c.Code,
                allLanguages: c.languages,
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
        .attr("fill-opacity", 1)
        .on("click", function(event, d) {
            showBarChart(event, d);
        });
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

// Add pop up bar chart
function showBarChart(event, d) {
    const newrect = svg.node().getBoundingClientRect();

    overlay
        .style("left", newrect.left + "px")
        .style("top", newrect.top + "px")
        .style("width", newrect.width + "px")
        .style("height", newrect.height + "px")
        .style("opacity", 1)
        .style("pointer-events", "all")
        .style("z-index", 5) // blocks map interaction
        .on("click", function() {
            popup.style("opacity", 0)
                .style("pointer-events", "none"); // disable blocking of map interaction when popup is not active
            overlay.style("opacity", 0)
                .style("pointer-events", "none");
});

    const data = d.allLanguages.map(l => ({
        language: l.Language,
        value: +l.Percentage,
        official: l.IsOfficial
    }));
    data.sort((a, b) => b.value - a.value);

    // Clear any previous popup content
    popup.html("");

    const popupWidth = 350;
    const popupHeight = 250;
    const margin = { top: 20, right: 10, bottom: 40, left: 70 };


    const svgPopup = popup.append("svg")
        .attr("width", popupWidth)
        .attr("height", popupHeight)
        .style("z-index", 10);

    const y = d3.scaleBand()
        .domain(data.map(d => d.language))
        .range([margin.top, popupHeight - margin.bottom])
        .padding(0.2);

    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value)])
        .nice()
        .range([margin.left, popupWidth - margin.right]);

    // Bars
    svgPopup.selectAll("rect")
        .data(data)
        .join("rect")
        .attr("x", margin.left)
        .attr("y", d => y(d.language))
        .attr("width", d => x(d.value) - margin.left)
        .attr("height", y.bandwidth())
        .attr("fill", d => d.official === "F" ? "red" : "green")
        .on("mouseover", function(event, d) {
            tooltip
                .style("opacity", 1)
                .html(`${d.language}: ${d.value}%`);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0);
        })
        // add a little animation for funsies
        .attr("width", 0)
        .transition()
        .duration(600)
        .attr("width", d => x(d.value) - margin.left);

    // X axis
    svgPopup.append("g")
        .attr("transform", `translate(0,${popupHeight - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(5).tickSize(0))
        .call(g => g.select(".domain").remove());

    // Y axis
    svgPopup.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).tickSize(0))
        .call(g => g.select(".domain").remove());

    // Title
    svgPopup.append("text")
        .attr("x", popupWidth / 2)
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .attr("font-family", "sans-serif")
        .text(d.country);

    // Show popup
    const rect = svg.node().getBoundingClientRect();

    popup
        .style("left", (rect.left + (rect.width / 2) - (popupWidth / 2)) + "px")
        .style("top", (rect.top + (rect.height / 2) - (popupHeight / 2)) + "px")
        .style("opacity", 1)
        .style("pointer-events", "all");
}