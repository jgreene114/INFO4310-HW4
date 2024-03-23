const createMap = function (minZoom, maxZoom, initZoom) {
    map = L.map('map').setView([45.5231, -122.6765], initZoom);

    // found on https://leaflet-extras.github.io/leaflet-providers/preview/index.html
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abcd', // QUESTION: what is this line?
        maxZoom: maxZoom,
        minZoom: minZoom
    }).addTo(map);

    const bBoxPadding = 0.1; // Increase or decrease this value to adjust the padding around the bounds
    const bBox = L.latLngBounds(
        L.latLng(45.4325 - bBoxPadding, -122.8367 - bBoxPadding),
        L.latLng(45.6529 + bBoxPadding, -122.4720 + bBoxPadding)
    );
    map.setMaxBounds(bBox);
    
    d3.select('.leaflet-control-container .leaflet-top.leaflet-left')
        .append("div")
        .attr("id", "map-mode-dropdown-container")
        .html(
            `Mode:<br><select id="map-mode-dropdown" onchange="modePicker(this.value)">
                <option value="normal">Normal</option>
                <option value="radiusByCount">Size by count</option>
                <option value="contour">Contour</option>
            </select>`
        )
    return map
}

const loadData = async function () {
    let hubArray = await d3.csv("data/Biketown Cleaned Data/hubs.csv");
    let hubData = new Map(hubArray.map(d => [d.id, d]));
    const tripData = await d3.csv("data/Biketown Cleaned Data/trips.csv");

    const nodes = hubArray.map(d => ({
        id: d.id,
        lat: parseFloat(d.lat),
        lon: parseFloat(d.lon)
    }));

    const nodeById = new Map(nodes.map(d => [d.id, d]));

    const aggregatedTrips = d3.rollup(
        tripData,
        v => d3.sum(v, d => d.Count || 1),
        d => d.StartID,
        d => d.EndID
    );

    let links = [];
    aggregatedTrips.forEach((targets, startId) => {
        targets.forEach((count, endId) => {
            links.push({
                source: nodeById.get(startId),
                target: nodeById.get(endId),
                count: count
            });
        });
    });
    links = links
        .sort((a, b) => b.count - a.count)

    return [tripData, hubArray, hubData, links]
}


const plotHubs = function (mapMode, hubsLayer, hubArray, hubData, aggTripData, minZoom, maxZoom, initZoom) {
    const fillOpacity = .3
    const strokeOpacity = 1

    let radiusScale;
    let hoverRadiusScale;
    let zoomFactor;
    zoomFactor = d3.scaleLinear()
        .domain([minZoom, maxZoom])
        .range([minRadius, maxRadius]);
    switch (mapMode) {
        case "radiusByCount":
            // const startIDCounts = Array.from(hubData.values()).map(hub => {
            //     return aggTripData.filter(trip => trip.StartID === hub.id).length;
            // });

            let countScale = d3.scaleLinear()
                .domain(d3.extent(hubArray, d => d.Count))
                .range([.5, 5]);


            radiusScale = (count, zoom) => {
                return countScale(count) * zoomFactor(zoom);
            };

            hoverRadiusScale = (count, zoom) => {
                const hoverFactor = d3.scaleLinear()
                    .domain([minZoom, maxZoom])
                    .range([3, 1.5]);


                return radiusScale(count, zoom) * hoverFactor(zoom);
            };
            break;
        default:
            radiusScale = (count, zoom) => {
                return zoomFactor(zoom);
            };

            hoverRadiusScale = (count, zoom) => {
                const hoverFactor = d3.scaleLinear()
                    .domain([minZoom, maxZoom])
                    .range([5, 1.5]);


                return radiusScale(count, zoom) * hoverFactor(zoom);
            };

    }

    let addHoverEffect = function (selection, primaryColor, hoverColor,
                                   radiusScale, hoverRadiusScale,
                                   fillOpacity, strokeOpacity,
                                   zoom) {
        selection
            .on('mouseover', function () {
                hubsLayer.selectAll('circle.point').each(function (d) {
                    const currentCircle = d3.select(this);
                    currentCircle.interrupt()
                        .transition()
                        .duration(transitionDuration * 3)
                        .attr("r", radiusScale(d.Count, zoom) * 0.8)
                        .attr("fill", unselectedGrey)
                        .attr("fill-opacity", fillOpacity * 0.75)
                        .attr("stroke", unselectedGrey)
                        .attr("stroke-opacity", strokeOpacity * 0.75);
                });

                const hoveredData = d3.select(this).datum();
                d3.select(this)
                    .style('cursor', 'pointer')
                    .transition()
                    .duration(transitionDuration)
                    .ease(d3.easeExpIn)
                    .attr("fill", hoverColor)
                    .attr("fill-opacity", fillOpacity)
                    .attr("stroke", hoverColor)
                    .attr('r', hoverRadiusScale(hoveredData.Count, zoom) * 1.5)
                    .transition()
                    .duration(transitionDuration)
                    .ease(d3.easeExpOut)
                    .attr('r', hoverRadiusScale(hoveredData.Count, zoom));
            })
            .on('mouseout', function () {
                hubsLayer.selectAll('circle.point').each(function (d) {
                    const currentCircle = d3.select(this);
                    currentCircle.transition()
                        .duration(transitionDuration)
                        .attr("r", radiusScale(+d.Count, zoom))
                        .attr("fill", primaryColor)
                        .attr("fill-opacity", fillOpacity)
                        .attr("stroke", primaryColor)
                        .attr("stroke-opacity", strokeOpacity);
                });
            });
    }
    
    hubsLayer.selectAll("circle.point").remove()

    hubData.forEach(d => {
        const coords = map.latLngToLayerPoint(new L.LatLng(d.lat, d.lon));

        let primaryColor = colorPalette['primary'][0]
        let hoverColor = colorPalette['complement'][0]

        let circle = hubsLayer.append('circle')
            .datum(d)
            .attr("id", d.id)
            .attr("class", "point")
            .attr("fill", primaryColor)
            .attr("primary-color", primaryColor)
            .attr("hover-color", hoverColor)
            .attr("fill-opacity", fillOpacity)
            .attr("stroke", primaryColor)
            .attr("stroke-opacity", strokeOpacity)
            .attr("r", radiusScale(+d.Count, initZoom))
            .attr("cx", coords.x)
            .attr("cy", coords.y)

        addHoverEffect(circle, primaryColor, hoverColor, radiusScale, hoverRadiusScale, fillOpacity, strokeOpacity, initZoom)
        // addHoverEffect(circle, primaryColor, hoverColor, initZoom)
    })

    const update = () => {
        const currentZoom = map.getZoom();

        let primaryColor = colorPalette['primary'][0]
        let hoverColor = colorPalette['complement'][0]

        let circle = hubsLayer.selectAll('circle')
            .each(function (d) {
                console.log(radiusScale(+d.Count, currentZoom))
                // console.log(+d.Count)
                // console.log(d)
                d3.select(this)
                    .attr("r", radiusScale(+d.Count, currentZoom))
                    .attr("cx", map.latLngToLayerPoint(new L.LatLng(d.lat, d.lon)).x)
                    .attr("cy", map.latLngToLayerPoint(new L.LatLng(d.lat, d.lon)).y)
            })

        console.log(currentZoom)
        addHoverEffect(circle, primaryColor, hoverColor, radiusScale, hoverRadiusScale, fillOpacity, strokeOpacity, currentZoom)
    }

    map.on("zoomend viewreset", update);

}
let modePicker;

const initialDrawPage = async function () {
    const map = createMap(minZoom, maxZoom, initZoom)
    L.svg({clickable: true}).addTo(map)

    const overlay = d3.select(map.getPanes().overlayPane)
    const svg = overlay.select('svg').attr("pointer-events", "auto")
    const hubsLayer = svg.append('g').attr("class", "hubs-layer")
    const tripsLayer = svg.append('g').attr("class", "trips-layer")

    const [tripData, hubArray, hubData, aggTripData] = await loadData()
    // console.log("tripData")
    // console.log(tripData)
    // console.log("hubData")
    // console.log(hubData)
    // console.log("hubArray")
    // console.log(hubArray)
    
    modePicker = function (mapMode) {
        const currentZoom = map.getZoom();
        plotHubs(mapMode, hubsLayer, hubArray, hubData, aggTripData, minZoom, maxZoom, currentZoom)
    }
    
    plotHubs("Normal", hubsLayer, hubArray, hubData, aggTripData, minZoom, maxZoom, initZoom)
    createBeeswarmChart('#parent-chart-container', 'StartDate', "Trips x Hours", tripData, hubData)
    createBeeswarmChart('#parent-chart-container', 'DistanceMiles', "Trips x Distance", tripData, hubData)
}

initialDrawPage();



