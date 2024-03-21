var map;
const minZoom = 12,
    maxZoom = 20,
    initZoom = 12


const createMap = function () {
    map = L.map('map').setView([45.5231, -122.6765], initZoom);

    // found on https://leaflet-extras.github.io/leaflet-providers/preview/index.html
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abcd', // QUESTION: what is this line?
        maxZoom: maxZoom,
        minZoom: minZoom
    }).addTo(map);

    const bBox = L.latLngBounds(
        L.latLng(45.4325, -122.8367),
        L.latLng(45.6529, -122.4720)
    )
    map.setMaxBounds(bBox)
}

const loadData = async function () {
    var hubdata = await d3.csv("data/Biketown Cleaned Data/hubs.json")
    // var tripData = await d3.csv("data/Biketown Raw Data/2016_07.csv")

    // tripData = hubdata.filter(d => {
    //     const startLatitude = parseFloat(d.StartLatitude);
    //     const startLongitude = parseFloat(d.StartLongitude);
    //     const endLatitude = parseFloat(d.EndLatitude);
    //     const endLongitude = parseFloat(d.EndLongitude);
    //     // console.log(d)
    //     return !isNaN(startLatitude) && !isNaN(startLongitude) && !isNaN(endLatitude) && !isNaN(endLongitude)
    // })
    //     .slice(0, 100)
    // console.log("Loaded data: ", tripData);

    L.svg({clickable: true}).addTo(map)


    const overlay = d3.select(map.getPanes().overlayPane)
    const svg = overlay.select('svg').attr("pointer-events", "auto")
    const g = svg.append('g')
        .attr('class', 'points leaflet-zoom-hide')

    const fillOpacity = .1
    const strokeOpacity = 1
    const hoverRadiusMultiplier = 1.4

    const radiusScale = d3.scaleLinear()
        .domain([minZoom, maxZoom])
        .range([2,8]);
    const hoverRadiusScale = d3.scaleLinear()
        .domain([minZoom, maxZoom])
        .range([2*1.5, 8*1.5]);

    // console.log("adfdsf")
    tripData.forEach(d => {
        const startPoint = map.latLngToLayerPoint(new L.LatLng(d.StartLatitude, d.StartLongitude));
        const endPoint = map.latLngToLayerPoint(new L.LatLng(d.EndLatitude, d.EndLongitude));
        
        let primaryColor = colorPalette['primary'][0]
        let hoverColor = colorPalette['primary'][3]
        
        g.append('circle')
            .datum(d)
            .attr("class", "point start-point")
            .attr("fill", primaryColor)
            .attr("fill-opacity", fillOpacity)
            .attr("stroke", primaryColor)
            .attr("stroke-opacity", strokeOpacity)
            .attr("r", radiusScale(initZoom))
            .attr("cx", startPoint.x)
            .attr("cy", startPoint.y)
            .on('mouseover', function () {
                d3.select(this)
                    .style('cursor', 'pointer')
                    .transition()
                    .duration(150)
                    .attr("fill", hoverColor)
                    .attr("fill-opacity", 0.5)
                    .attr("stroke", hoverColor)
                    // .attr('r', radiusScale(initZoom) * hoverRadiusMultiplier * 1.5)
                    .attr('r', hoverRadiusScale(initZoom) * 1.5)
                    .transition()
                    .ease(d3.easeExpOut)
                    .duration(150)
                    .attr('r', hoverRadiusScale(initZoom))
                    // .attr('r', radiusScale(initZoom) * hoverRadiusMultiplier)
            })
            .on('mouseout', function () {
                d3.select(this)
                    .style('cursor', 'grab')
                    .transition()
                    .duration(150)
                    .attr("fill", primaryColor)
                    .attr("fill-opacity", fillOpacity)
                    .attr("stroke", primaryColor)
                    .attr('r', radiusScale(initZoom));
            });

        primaryColor = colorPalette['complement'][0]
        hoverColor = colorPalette['complement'][3]


        g.append('circle')
            .datum(d)
            .attr("class", "point end-point")
            .attr("fill", primaryColor)
            .attr("fill-opacity", fillOpacity)
            .attr("stroke", primaryColor)
            .attr("stroke-opacity", strokeOpacity)
            .attr("r", radiusScale(initZoom))
            .attr("cx", endPoint.x)
            .attr("cy", endPoint.y)
            .on('mouseover', function () {
                d3.select(this)
                    .style('cursor', 'pointer')
                    .transition()
                    .duration(150)
                    .attr("fill", hoverColor)
                    .attr("fill-opacity", 0.5)
                    .attr("stroke", hoverColor)
                    // .attr('r', radiusScale(initZoom) * hoverRadiusMultiplier * 1.5)
                    .attr('r', hoverRadiusScale(initZoom) * 1.5)
                    .transition()
                    .ease(d3.easeExpOut)
                    .duration(150)
                    .attr('r', hoverRadiusScale(initZoom))
                    // .attr('r', radiusScale(initZoom) * hoverRadiusMultiplier)
            })
            .on('mouseout', function () {
                d3.select(this)
                    .style('cursor', 'grab')
                    .transition()
                    .duration(150)
                    .attr("fill", primaryColor)
                    .attr("fill-opacity", fillOpacity)
                    .attr("stroke", primaryColor)
                    .attr('r', radiusScale(initZoom));
            });
    })

    const update = () => {
        const currentZoom = map.getZoom();

        let primaryColor = colorPalette['primary'][0]
        let hoverColor = colorPalette['primary'][3]
        
        g.selectAll('circle.start-point')
            .attr("cx", d => map.latLngToLayerPoint(new L.LatLng(d.StartLatitude, d.StartLongitude)).x)
            .attr("cy", d => map.latLngToLayerPoint(new L.LatLng(d.StartLatitude, d.StartLongitude)).y)
            .attr('r', radiusScale(currentZoom))
            .on('mouseover', function () {
                d3.select(this)
                    .style('cursor', 'pointer')
                    .transition()
                    .duration(150)
                    .attr("fill", hoverColor)
                    .attr("fill-opacity", 0.5)
                    .attr("stroke", hoverColor)
                    .attr('r', hoverRadiusScale(currentZoom) * 1.5)
                    // .attr('r', radiusScale(currentZoom) * hoverRadiusMultiplier * 1.5)
                    .transition()
                    .ease(d3.easeExpOut)
                    .duration(150)
                    .attr('r', hoverRadiusScale(currentZoom))
                    // .attr('r', radiusScale(currentZoom) * hoverRadiusMultiplier)
            })
            .on('mouseout', function () {
                d3.select(this)
                    .style('cursor', 'grab')
                    .transition()
                    .duration(150)
                    .attr("fill", primaryColor)
                    .attr("fill-opacity", fillOpacity)
                    .attr("stroke", primaryColor)
                    .attr('r', radiusScale(currentZoom));
            });
        
        primaryColor = colorPalette['complement'][0]
        hoverColor = colorPalette['complement'][3]
        
        g.selectAll('circle.end-point')
            .attr("cx", d => map.latLngToLayerPoint(new L.LatLng(d.EndLatitude, d.EndLongitude)).x)
            .attr("cy", d => map.latLngToLayerPoint(new L.LatLng(d.EndLatitude, d.EndLongitude)).y)
            .attr('r', radiusScale(currentZoom))
            .on('mouseover', function () {
                d3.select(this)
                    .style('cursor', 'pointer')
                    .transition()
                    .duration(150)
                    .attr("fill", hoverColor)
                    .attr("fill-opacity", 0.5)
                    .attr("stroke", hoverColor)
                    .attr('r', hoverRadiusScale(currentZoom) * 1.5)
                    .transition()
                    .ease(d3.easeExpOut)
                    .duration(150)
                    .attr('r', hoverRadiusScale(currentZoom))
            })
            .on('mouseout', function () {
                d3.select(this)
                    .style('cursor', 'grab')
                    .transition()
                    .duration(150)
                    .attr("fill", primaryColor)
                    .attr("fill-opacity", fillOpacity)
                    .attr("stroke", primaryColor)
                    .attr('r', radiusScale(currentZoom));
            });
        
        
    }

    map.on("zoomend viewreset", update);

    // map.on("zoomend", update);
}

createMap()
loadData()