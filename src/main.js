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
    // .slice(0, 10000);
    // L.svg({clickable: true}).addTo(map)
    //
    // const overlay = d3.select(map.getPanes().overlayPane)
    // const svg = overlay.select('svg').attr("pointer-events", "auto")
    // const hubsLayer = svg.append('g').attr("class", "hubs-layer")
    // const tripsLayer = svg.append('g').attr("class", "trips-layer")

    // 
    // drawTrips(tripsLayer, hubArray, tripData)
    return [tripData, hubArray, hubData, links]
}

// const drawTrips = function (g, hubArray, tripData) {
//     const nodes = hubArray.map(d => ({
//         id: d.id,
//         lat: parseFloat(d.lat),
//         lon: parseFloat(d.lon)
//     }));
//     const nodeById = new Map(nodes.map(d => [d.id, d]));
//
//     const links = tripData.map(d => ({
//         source: nodes.find(n => n.id === d.StartID),
//         target: nodes.find(n => n.id === d.EndID)
//     }));
//
//     let bundle = generateSegments(nodes, links);
//
//    
//     paths = g.selectAll('path.trip')
//         .data(links)
//         .enter()
//         .append('path')
//         .attr('class', 'trip')
//         .attr("source-lon", d => {
//             const source = nodeById.get(d.source.id);
//             return source.lon
//         })
//         .attr("source-lat", d => {
//             const source = nodeById.get(d.source.id);
//             return source.lat
//         })
//         .attr("target-lon", d => {
//             const target = nodeById.get(d.target.id);
//             return target.lon
//         })
//         .attr("target-lat", d => {
//             const target = nodeById.get(d.target.id);
//             return target.lat
//         })
//         .attr('d', d => {
//             const source = nodeById.get(d.source.id);
//             const target = nodeById.get(d.target.id);
//
//             if (!source || !target) {
//                 console.error('Missing source or target:', d);
//                 return '';
//             }
//             const sourcePoint = map.latLngToLayerPoint(new L.LatLng(source.lat, source.lon));
//             const targetPoint = map.latLngToLayerPoint(new L.LatLng(target.lat, target.lon));
//
//             if (isNaN(sourcePoint.x) || isNaN(sourcePoint.y) || isNaN(targetPoint.x) || isNaN(targetPoint.y)) {
//                 console.error('Invalid source or target point:', sourcePoint, targetPoint);
//                 return '';
//             }
//            
//             console.log(`M${sourcePoint.x},${sourcePoint.y}L${targetPoint.x},${targetPoint.y}`)
//
//             return `M${sourcePoint.x},${sourcePoint.y}L${targetPoint.x},${targetPoint.y}`;
//         })
//         .attr('stroke', 'grey')
//         .attr('stroke-width', 2)
//
//     let layout = d3.forceSimulation()
//         .nodes(bundle.nodes)
//         .force("link", d3.forceLink(bundle.links).distance(10).strength(0.7))
//         .force("charge", d3.forceManyBody().strength(-50))
//         .on("tick", () => {
//             paths.attr("d", line);
//         });
// };

// const plotTrips = function (mode, tripsLayer) {
const drawTrips = function (tripsLayer, svg, aggTripData, zoom) {
    const countExtent = d3.extent(aggTripData, d => d.count);
    const strokeWidthScale = d3.scaleLinear()
        .domain(countExtent)
        .range([.1, 3]);
    const strokeOpacityScale = d3.scaleLinear()
        .domain(countExtent)
        .range([0.1, 1]);


    const lineGenerator = d3.line()
        .curve(d3.curveBundle.beta(0.85))
        .x(d => d.x)
        .y(d => d.y);

    function createLinearGradient(svg, id, startColor, endColor) {
        var gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', id)
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '0%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', startColor)
            .attr('stop-opacity', 1);
            // .attr('stop-opacity', .2);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', endColor)
            .attr('stop-opacity', 1);
    }

    createLinearGradient(svg, 'tripsGradient', startColor = colorPalette['complement'][0], endColor = colorPalette['primary'][0]);

    tripsLayer.selectAll('path.trip')
        .data(aggTripData)
        .enter()
        .append('path')
        .attr('class', 'trip')
        .attr('d', d => {
            const sourcePoint = map.latLngToLayerPoint(new L.LatLng(d.source.lat, d.source.lon));
            const targetPoint = map.latLngToLayerPoint(new L.LatLng(d.target.lat, d.target.lon));
            return lineGenerator([sourcePoint, {
                x: (sourcePoint.x + targetPoint.x) / 2,
                y: (sourcePoint.y + targetPoint.y) / 2
            }, targetPoint]);
        })
        .attr('stroke', colorPalette['primary'][3])
        .attr('stroke', 'url(#tripsGradient)')
        .attr('stroke-width', d => strokeWidthScale(d.count))
        .attr('stroke-opacity', .03)
        // .attr('stroke-opacity', d => strokeOpacityScale(d.count))
        .attr('fill', 'none');
    d3.selectAll('circle.point').interrupt()
        .transition()
        .duration(transitionDuration * 3)
        // .attr("r", radiusScale(zoom) * .8)
        .attr("fill", unselectedGrey)
        .attr("fill-opacity", fillOpacity * .5)
        .attr("stroke", unselectedGrey)
        .attr("stroke-opacity", strokeOpacity * .5)


    const updatePaths = () => {
        tripsLayer.selectAll('path.trip')
            .attr('d', d => {
                const sourcePoint = map.latLngToLayerPoint(new L.LatLng(d.source.lat, d.source.lon));
                const targetPoint = map.latLngToLayerPoint(new L.LatLng(d.target.lat, d.target.lon));
                return lineGenerator([sourcePoint, {
                    x: (sourcePoint.x + targetPoint.x) / 2,
                    y: (sourcePoint.y + targetPoint.y) / 2
                }, targetPoint]);
            })
            .attr('stroke-width', d => strokeWidthScale(d.count))
            // .attr('stroke-opacity', d => strokeOpacityScale(d.count));
            .attr('stroke-opacity', .03)

        d3.selectAll('circle.point').interrupt()
            .transition()
            .duration(transitionDuration * 3)
            // .attr("r", radiusScale(zoom) * .8)
            .attr("fill", unselectedGrey)
            .attr("fill-opacity", fillOpacity * .5)
            .attr("stroke", unselectedGrey)
            .attr("stroke-opacity", strokeOpacity * .5)

    };

    map.on("zoomend viewreset", updatePaths);
}

const plotHubs = function (mode, hubsLayer, hubData, aggTripData, minZoom, maxZoom, initZoom) {
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

    let addHoverEffect;
    switch (mode) {
        case "trips-overlay": {
            addHoverEffect = function (selection, primaryColor, hoverColor, radiusScale, hoverRadiusScale, fillOpacity, strokeOpacity, zoom) {
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
                            .attr("fill", unselectedGrey)
                            .attr("fill-opacity", fillOpacity)
                            .attr("stroke", unselectedGrey)
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
            break;
        default: {
            addHoverEffect = function (selection, primaryColor, hoverColor, radiusScale, hoverRadiusScale, fillOpacity, strokeOpacity, zoom) {
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
        }
            break;
    }

}


// function generateSegments(nodes, links) {
//     let bundle = {nodes: [], links: [], paths: []};
//
//    
//     nodes.forEach(node => {
//         node.fx = node.x; 
//         node.fy = node.y; 
//         bundle.nodes.push(node);
//     });
//
//     links.forEach(link => {
//         let source = nodes.find(n => n.id === link.source.id);
//         let target = nodes.find(n => n.id === link.target.id);
//
//        
//         const numSegments = 3; 
//         let segmentPoints = [source];
//         for (let i = 1; i < numSegments; i++) {
//             let intermediateNode = {
//                 x: source.fx + (target.fx - source.fx) * i / numSegments,
//                 y: source.fy + (target.fy - source.fy) * i / numSegments
//             };
//             bundle.nodes.push(intermediateNode);
//             segmentPoints.push(intermediateNode);
//         }
//         segmentPoints.push(target);
//
//         bundle.paths.push(segmentPoints);
//         bundle.links.push({source: source, target: target});
//     });
//
//     return bundle;
// }


const initialDrawPage = async function () {
    const map = createMap(minZoom, maxZoom, initZoom)
    L.svg({clickable: true}).addTo(map)

    const overlay = d3.select(map.getPanes().overlayPane)
    const svg = overlay.select('svg').attr("pointer-events", "auto")
    const hubsLayer = svg.append('g').attr("class", "hubs-layer")
    const tripsLayer = svg.append('g').attr("class", "trips-layer")

    const [tripData, hubArray, hubData, aggTripData] = await loadData()

    const modeSwitcher = function (mode) {

        switch (mode) {
            default: {
                plotHubs(mode, hubsLayer, hubData, aggTripData, minZoom, maxZoom, initZoom)
            }
                break
            case 'trips-overlay': {
                plotHubs(mode, hubsLayer, hubData, aggTripData, minZoom, maxZoom, initZoom)

                let topAggTripData = aggTripData.slice(0, 1000);
                
                drawTrips(tripsLayer, svg, topAggTripData, initZoom)
                console.log(topAggTripData)
            }
        }

    }

    let mode = 'trips-overlay'
    modeSwitcher(mode)

}

initialDrawPage();



