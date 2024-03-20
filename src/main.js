var map;

const createMap = function () {
    map = L.map('map').setView([45.5231, -122.6765], 12.);

    // found on https://leaflet-extras.github.io/leaflet-providers/preview/index.html
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abcd', // QUESTION: what is this line?
        maxZoom: 20,
        minZoom: 10
    }).addTo(map);
    const topLeft = L.latLng(52, -132.54)
    const bottomRight = L.latLng(21.78, -59.94)
    const bBox = L.latLngBounds(topLeft, bottomRight)
    map.setMaxBounds(bBox)
}

const loadData = async function () {
    var tripData = await d3.csv("data/Biketown Raw Data/2016_07.csv")

    tripData = tripData.filter(d => {
        const startLatitude = parseFloat(d.StartLatitude);
        const startLongitude = parseFloat(d.StartLongitude);
        const endLatitude = parseFloat(d.EndLatitude);
        const endLongitude = parseFloat(d.EndLongitude);
        // console.log(d)
        return !isNaN(startLatitude) && !isNaN(startLongitude) && !isNaN(endLatitude) && !isNaN(endLongitude)
    })
        .slice(0, 100)
    // console.log("Loaded data: ", tripData);

    L.svg({clickable: true}).addTo(map)



    const overlay = d3.select(map.getPanes().overlayPane)
    const svg = overlay.select('svg').attr("pointer-events", "auto")
    const g = svg.append('g')
        .attr('class', 'points leaflet-zoom-hide')

    const fillOpacity = .1
    const strokeOpacity = 1
    const normalRadius = 6
    const hoverRadius = 9

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
            .attr("r", normalRadius)
            .attr("cx", startPoint.x)
            .attr("cy", startPoint.y)
            .on('mouseover', function () {
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("fill", hoverColor)
                    .attr("fill-opacity", 0.5)
                    .attr("stroke", hoverColor)
                    .attr('r', hoverRadius);
            })
            .on('mouseout', function () {
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("fill", primaryColor)
                    .attr("fill-opacity", fillOpacity)
                    .attr("stroke", primaryColor)
                    .attr('r', normalRadius);
            });

        primaryColor = colorPalette['complement'][0]
        hoverColor = colorPalette['complement'][3]


        g.append('circle')
            .datum(d)
            .attr("class", "point start-point")
            .attr("fill", primaryColor)
            .attr("fill-opacity", fillOpacity)
            .attr("stroke", primaryColor)
            .attr("stroke-opacity", strokeOpacity)
            .attr("r", normalRadius)
            .attr("cx", startPoint.x)
            .attr("cy", startPoint.y)
            .on('mouseover', function () {
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("fill", hoverColor)
                    .attr("fill-opacity", 0.5)
                    .attr("stroke", hoverColor)
                    .attr('r', hoverRadius*1.5)
                    .transition()
                    .ease(d3.easeExpOut)
                    .duration(150)
                    .attr('r', hoverRadius);

            })
            .on('mouseout', function () {
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("fill", primaryColor)
                    .attr("fill-opacity", fillOpacity)
                    .attr("stroke", primaryColor)
                    .attr('r', normalRadius);
            });
    })

    const update = () => {
        g.selectAll('circle.start-point')
            .attr("cx", d => map.latLngToLayerPoint(new L.LatLng(d.StartLatitude, d.StartLongitude)).x)
            .attr("cy", d => map.latLngToLayerPoint(new L.LatLng(d.StartLatitude, d.StartLongitude)).y);
        g.selectAll('circle.end-point')
            .attr("cx", d => map.latLngToLayerPoint(new L.LatLng(d.EndLatitude, d.EndLongitude)).x)
            .attr("cy", d => map.latLngToLayerPoint(new L.LatLng(d.EndLatitude, d.EndLongitude)).y);
    }

    map.on("zoomend viewreset", update);

    // map.on("zoomend", update);
}

createMap()
loadData()