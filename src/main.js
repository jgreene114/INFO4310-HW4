const createMap = function (minZoom, maxZoom, initZoom) {
    map = L.map('map').setView([45.5231, -122.6765], initZoom);

    // found on https://leaflet-extras.github.io/leaflet-providers/preview/index.html
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abcd', // QUESTION: what is this line?
        maxZoom: maxZoom,
        minZoom: minZoom
    }).addTo(map);
    map.attributionControl.setPosition('bottomright');

    const bBoxPadding = 0.1;
    const bBox = L.latLngBounds(
        L.latLng(45.4325 - bBoxPadding, -122.8367 - bBoxPadding),
        L.latLng(45.6529 + bBoxPadding, -122.4720 + bBoxPadding)
    );
    map.setMaxBounds(bBox);

    d3.select('.leaflet-control-container .leaflet-top.leaflet-left')
        .append("div")
        .attr("id", "map-mode-dropdown-container")
        .html(
            `<div class="mode-title"><p class="mode">MODE</p><select id="map-mode-dropdown" onchange="modePicker(this.value)">
                <option value="normal">Normal</option>
                <option value="radiusByCount">Size by count</option>
                <option value="contour">Contour</option>
            </select></div>`
        )
    return map
}

const loadData = async function (tripDataSampleN) {
    let hubArray = await d3.csv("data/Biketown Cleaned Data/hubs.csv");
    let hubData = new Map(hubArray.map(d => [d.id, d]));
    let tripData = await d3.csv("data/Biketown Cleaned Data/trips.csv");

    if (tripDataSampleN) {
        const sampleSize = tripDataSampleN;
        tripData = d3.shuffle(tripData).slice(0, sampleSize);
    }

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


                return radiusScale(count, zoom) + hoverFactor(zoom);
            };
            break;
        default:
            radiusScale = (count, zoom) => {
                return zoomFactor(zoom);
            };

            hoverRadiusScale = (count, zoom) => {
                const hoverFactor = d3.scaleLinear()
                    .domain([minZoom, maxZoom])
                    .range([2, 1.5]);


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

    hubArray.forEach(d => {
        const coords = map.latLngToLayerPoint(new L.LatLng(d.lat, d.lon));

        let primaryColor = colorPalette['primary'][0]
        let hoverColor = colorPalette['complement'][0]

        let circle = hubsLayer.append('circle')
            .datum(d)
            .attr("id", d.id)
            .attr("class", "point")

        // addHoverEffect(circle, primaryColor, hoverColor, radiusScale, hoverRadiusScale, fillOpacity, strokeOpacity, initZoom)

        circle
            .attr("cx", coords.x)
            .attr("cy", coords.y)
            .attr("fill", "#F86858")
            .attr("primary-color", "#F86858")
            .attr("hover-color", hoverColor)
            .attr("fill-opacity", fillOpacity)
            .attr("stroke", "#F86858")
            .attr("stroke-opacity", strokeOpacity)
            .transition()
            .duration(transitionDuration)
            .attr("r", radiusScale(+d.Count, initZoom))
            .attr("display", mapMode === 'contour' ? 'none' : 'auto')


    })

    const update = () => {
        const currentZoom = map.getZoom();

        let primaryColor = colorPalette['primary'][0]
        let hoverColor = colorPalette['complement'][0]

        let circle = hubsLayer.selectAll('circle')
            .each(function (d) {
                d3.select(this)
                    .attr("r", radiusScale(+d.Count, currentZoom))
                    .attr("cx", map.latLngToLayerPoint(new L.LatLng(d.lat, d.lon)).x)
                    .attr("cy", map.latLngToLayerPoint(new L.LatLng(d.lat, d.lon)).y)
            })

        // addHoverEffect(circle, primaryColor, hoverColor, radiusScale, hoverRadiusScale, fillOpacity, strokeOpacity, currentZoom)
    }

    map.on("zoomend viewreset", update);
    if (globalMapMode === "contour") {
        map.on("zoomend viewreset", calculateAndDrawContours);
    }

}



let modePicker, globalMapMode;
let sharedStateFilters = {
    StartDate: null,
    DistanceMiles: null
};

function updateMapSelection(filters, tripData, hubsLayer, hubArray, hubData, contourLayer) {
    const filteredData = tripData.filter(d => {
        const startDate = new Date(d.StartDate);
        const startHour = startDate.getHours();

        let dateFilter = true;
        let distanceFilter = true;

        if (filters.StartDate) {
            dateFilter = startHour >= filters.StartDate[0] && startHour <= filters.StartDate[1];
        }
        if (filters.DistanceMiles) {
            distanceFilter = d.DistanceMiles >= filters.DistanceMiles[0] && d.DistanceMiles <= filters.DistanceMiles[1];
        }

        return dateFilter && distanceFilter;
    });

    // TODO: here is where map is updated with new selection, redraw summary stats here

    let tripCountsByHub = d3.rollup(filteredData, trips => trips.length, d => d.StartID);

    let activeStartIDs = new Set(filteredData.map(d => d.StartID));
    hubArray = hubArray
        .filter(hub => activeStartIDs.has(hub.id))
        .map(hub => ({
            ...hub,
            Count: tripCountsByHub.get(hub.id)
        }));

    switch (globalMapMode) {
        default:
            plotHubs(globalMapMode, hubsLayer, hubArray, hubData, filteredData, minZoom, maxZoom, map.getZoom());
            contourLayer.select('*').remove();
            // map.off('zoomend viewreset', calculateAndDrawContours);
            break;
        case 'contour':
            drawContours(hubArray, contourLayer)
            // map.on("zoomend viewreset", calculateAndDrawContours);
            break;
    }

}

let calculateAndDrawContours;
const drawContours = (hubArray, contourLayer) => {
    calculateAndDrawContours = () => {
        if (globalMapMode !== 'contour') { return; }
        const points = hubArray.map(hub => {
            const point = map.latLngToLayerPoint(new L.LatLng(hub.lat, hub.lon));
            return [point.x, point.y, hub.Count];
        });

        const density = d3.contourDensity()
            .x(d => d[0])
            .y(d => d[1])
            .size([map.getSize().x, map.getSize().y])
            .bandwidth(20);

        const contours = density(points);

        const densityValues = contours.map(d => d.value);
        const densityExtent = d3.extent(densityValues);

        const baseColor = d3.rgb("#A12B2B");

        const customInterpolator = (t) => {
            let modifiedColor = baseColor.brighter(t * 2).darker(t * 0.5);
            return modifiedColor.toString();
        };

        // TODO: CONTOUR COLOR SCALE
        const contourColorScale = d3.scaleSequential(customInterpolator)
            .domain(densityExtent);

        contourLayer.select('.contour-layer').remove();

        const contourGroup = contourLayer.append('g').attr('class', 'contour-layer');
        contourGroup.selectAll('path')
            .data(contours)
            .enter().append('path')
            .attr('d', d3.geoPath())
            .attr('fill', d => contourColorScale(d.value))
            .attr('stroke', 'none')
            .attr('opacity', .1);

    };

    if (globalMapMode == "contour") {
        map.on("zoomend viewreset", calculateAndDrawContours);
        calculateAndDrawContours();
    } else {
        map.off("zoomend viewreset", calculateAndDrawContours);
    }

};


const initialDrawPage = async function () {
    const map = createMap(minZoom, maxZoom, initZoom)
    L.svg({
        clickable: true
    }).addTo(map)

    const overlay = d3.select(map.getPanes().overlayPane)
    const svg = overlay.select('svg').attr("pointer-events", "auto")
    const hubsLayer = svg.append('g').attr("class", "hubs-layer")
    const contourLayer = svg.append('g').attr("class", "contour-layer")

    let [tripData, hubArray, hubData, aggTripData] = await loadData()
    // agg

    modePicker = function (mapMode) {
        const currentZoom = map.getZoom();
        plotHubs(mapMode, hubsLayer, hubArray, hubData, aggTripData, minZoom, maxZoom, currentZoom)
        globalMapMode = mapMode
        if (mapMode === 'contour') {
            drawContours(hubArray, contourLayer)
        } else {
            contourLayer.select('*').remove();
            map.off('zoomend viewreset', calculateAndDrawContours);
        }
    }


    plotHubs("Normal", hubsLayer, hubArray, hubData, aggTripData, minZoom, maxZoom, initZoom)
    // TODO: here is where the titles are set
    let variable = 'StartDate'
    createBeeswarmChart('#beeswarm-chart-startdate', variable, variableToTitles[variable], tripData, hubsLayer, hubArray, hubData, contourLayer)
    variable = 'DistanceMiles'
    createBeeswarmChart('#beeswarm-chart-distancemiles', variable, variableToTitles[variable], tripData, hubsLayer, hubArray, hubData, contourLayer)
    if (globalMapMode === "contour") {
        drawContours(hubArray, contourLayer);
    } else {
        // map.off('zoomend viewreset', calculateAndDrawContours);
        contourLayer.select('*').remove();
    }

}

initialDrawPage();