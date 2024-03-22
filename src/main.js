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


const plotHubs = function (hubsLayer, hubData, aggTripData, minZoom, maxZoom, initZoom) {
    const fillOpacity = .3
    const strokeOpacity = 1
    const minRadius = .1,
        maxRaduis = 8
    const radiusScale = d3.scaleLinear()
        .domain([minZoom, maxZoom])
        .range([minRadius, maxRaduis]);
    const hoverRadiusScale = d3.scaleLinear()
        .domain([minZoom, maxZoom])
        .range([minRadius * 1.5, maxRaduis * 1.5]);

    addHoverEffect = function (selection, primaryColor, hoverColor,
                               radiusScale, hoverRadiusScale,
                               fillOpacity, strokeOpacity,
                               zoom) {
        selection
            .on('mouseover', function () {
                d3.selectAll('circle.point').interrupt()
                    .transition()
                    .duration(transitionDuration * 3)
                    .attr("r", radiusScale(zoom) * .8)
                    .attr("fill", unselectedGrey)
                    .attr("fill-opacity", fillOpacity * .75)
                    .attr("stroke", unselectedGrey)
                    .attr("stroke-opacity", strokeOpacity * .75)

                d3.select(this)
                    .style('cursor', 'pointer')
                    .transition()
                    .duration(transitionDuration)
                    .ease(d3.easeExpIn)
                    .attr("fill", hoverColor)
                    .attr("fill-opacity", fillOpacity)
                    .attr("stroke", hoverColor)
                    .attr('r', hoverRadiusScale(zoom) * 1.5)
                    .transition()
                    .duration(transitionDuration)
                    .ease(d3.easeExpOut)
                    .attr('r', hoverRadiusScale(zoom))
            })
            .on('mouseout', function () {
                d3.select(this)
                    .transition()
                    .duration(transitionDuration)
                    .ease(d3.easeExpIn)
                    .attr('r', hoverRadiusScale(zoom) * 1.5)
                    .transition()
                    .duration(transitionDuration)
                    .ease(d3.easeExpOut)
                    .attr('r', radiusScale(zoom))

                d3.selectAll('circle.point').interrupt()
                    .transition()
                    .duration(transitionDuration)
                    .attr("r", radiusScale(zoom))
                    .attr("fill", primaryColor)
                    .attr("fill-opacity", fillOpacity)
                    .attr("stroke", primaryColor)
                    .attr("stroke-opacity", strokeOpacity)

            });
    }

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
            .attr("r", radiusScale(initZoom))
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
            .attr("cx", d => map.latLngToLayerPoint(new L.LatLng(d.lat, d.lon)).x)
            .attr("cy", d => map.latLngToLayerPoint(new L.LatLng(d.lat, d.lon)).y)
            .attr('r', radiusScale(currentZoom))

        addHoverEffect(circle, primaryColor, hoverColor, radiusScale, hoverRadiusScale, fillOpacity, strokeOpacity, currentZoom)
        // addHoverEffect(circle, primaryColor, hoverColor, currentZoom)
    }

    map.on("zoomend viewreset", update);

}


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
    
    plotHubs(hubsLayer, hubData, aggTripData, minZoom, maxZoom, initZoom)
    createBeeswarmChart('#parent-chart-container', 'StartDate', "Trips x Hours", tripData, hubData)
    createBeeswarmChart('#parent-chart-container', 'DistanceMiles', "Trips x Distance", tripData, hubData)
}

initialDrawPage();



