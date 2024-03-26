function createBeeswarmChart(selector, variable, title, tripData, hubsLayer, hubArray, hubData, contourLayer) {
    let aggTrips;
    let countScale = d3.scaleLinear();
    let xScale, xAxis //, brushG, g;

    let truncationLimit;
    switch (variable) {
        case 'StartDate':
            aggTrips = d3.rollup(tripData, v => ({
                count: v.length,
                uniqueStartIDs: new Set(v.map(d => d.StartID))
            }), d => {
                const date = new Date(d.StartDate);
                return date.getHours();
            });

            countScale.range([0, 20]);
            break;
        case 'DistanceMiles':
            truncationLimit = 5;

            aggTrips = d3.rollup(tripData, v => ({
                count: v.length,
                uniqueStartIDs: new Set(v.map(d => d.StartID))
            }), d => {
                const distance = Math.round(d.DistanceMiles * 4) / 4;
                return distance >= truncationLimit ? truncationLimit : distance;
            });
            countScale.range([0, 20]);
            break;
        default:
            break;
    }

    aggTrips = Array.from(aggTrips, ([key, {
        count,
        uniqueStartIDs
    }]) => ({
        key,
        count,
        uniqueStartIDs: Array.from(uniqueStartIDs)
    }));

    countScale
        .domain([0, d3.max(aggTrips, d => d.count)])


    const scaledTrips = aggTrips.map(d => ({
        key: d['key'],
        count: countScale(d.count),
        uniqueStartIDs: d.uniqueStartIDs
    }));

    const expandedTrips = scaledTrips
        .flatMap(d =>
            d3.range(d.count).map(() => ({
                key: d.key,
                count: d.count,
                uniqueStartIDs: d.uniqueStartIDs
            }))
        );

    // TODO: this is where tooltip  and title are styled
    let chartDiv = d3.select(selector).attr('class', 'chart-div');
    let chartTitleDiv = chartDiv.select("div")
    
    if (chartTitleDiv.empty()) {
        chartTitleDiv = chartDiv.append("div")
            .attr("class", "chart-title-div")
    }
    
    if (chartTitleDiv.select("h1").empty()) {
        chartTitleDiv.append("h1")
            .text(title)
            .style("color", "#A12B2B");
    }
    let tooltip = chartTitleDiv.select(".tooltip");
    if (tooltip.empty()) {
        tooltip = chartTitleDiv.append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .text("TOOLTIP TEXT")
            .style("color", colorPalette['complement'][3]);

    }

    let svg = chartDiv.select('svg.beeswarm-chart');
    if (svg.empty()) {
        svg = chartDiv.append('svg')
            .attr('class', 'beeswarm-chart')
            .attr('data-variable', variable);
    }

    const margin = {
        top: 0,
        right: 25,
        bottom: 20,
        left: 25
    };
    const width = chartDiv.node().clientWidth;
    const height = Math.max(80, width / 4);
    svg.attr('width', width).attr('height', height);

    const brush = d3.brushX()
        .extent([
            [0, 0],
            [width - margin.left - margin.right, height - margin.top - margin.bottom]
        ])
        // .extent([[0, 0], [width - margin.left - margin.right, height]])
        .on("start brush end", brushed);

    let brushG = svg.select("g.brush")
    if (brushG.empty()) {
        brushG = svg.append("g")
            .attr('class', 'brush')
            .attr('transform', `translate(${margin.left},${margin.top})`)
            .call(brush);
    }

    function drawChart() {
        switch (variable) {
            case 'StartDate':
                xScale = d3.scaleLinear().domain([0, 24]).range([0, width - margin.left - margin.right]);
                xAxis = d3.axisBottom(xScale)
                    .tickValues([0, 6, 12, 18, 24])
                    .tickFormat(d => {
                        if (d === 0 || d === 24) return "12AM";
                        if (d === 12) return "12PM";
                        return ((d % 12) || 12) + (d < 12 || d === 24 ? " AM" : " PM");
                    });
                break;
            case 'DistanceMiles':
                xScale = d3.scaleLinear()
                    .domain([0, truncationLimit]) //d3.extent(aggTrips, d => d.key))
                    .range([0, width - margin.left - margin.right]);

                xAxis = d3.axisBottom(xScale)
                    .tickFormat(d => {
                        if (d === truncationLimit) return `≥${d} Mi`;
                        return `${d} Mi`;
                    })
                    .ticks(truncationLimit);
                break;
            default:
                xScale = d3.scaleLinear().domain(d3.extent(aggTrips, d => d.key)).range([0, width - margin.left - margin.right]);
                xAxis = d3.axisBottom(xScale).ticks(6);
                break;
        }

        g = svg.select('g.main-group');
        if (g.empty()) {
            g = svg.append('g')
                .attr('class', 'main-group')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            g.append('g')
                .attr('transform', `translate(0,${height - margin.top - margin.bottom})`)
                .call(xAxis);
        }

        const centerY = (height - margin.top - margin.bottom) / 2;
        let simulation = d3.forceSimulation(expandedTrips)
            .force('x', d3.forceX(d => xScale(d.key)).strength(1))
            .force('y', d3.forceY().y(centerY).strength(0.09))
            .force('collide', d3.forceCollide().radius(3));

        let circles = g.selectAll('circle.mini-chart-point')
            .data(expandedTrips);

        circles = circles.enter()
            .append('circle')
            .attr('class', 'mini-chart-point')
            .attr('r', 2)
            .merge(circles)
            .style('fill', colorPalette['complement'][0])

        circles.exit().remove();

        let ticks = 0;
        simulation.on('tick', () => {
            ticks++;

            // g.selectAll('circle.mini-chart-point')
            circles
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            if (ticks > 100 || simulation.alpha() < 0.01) {
                simulation.stop();
            }
        });
    }

    // chartDiv.style("background-color", "white")
    //     .style("border", "solid black 1px")
    //     .style("border-radius", "20px");



    function brushed(event) {
        const selection = event.selection;
        const selectedColor = colorPalette["complement"][0]
        const outsideColor = unselectedGrey
        const normalColor = colorPalette["complement"][0]
        if (selection && selection[0] !== selection[1]) {

            const [x0, x1] = selection;
            const [filter0, filter1] = selection.map(xScale.invert)
            sharedStateFilters[variable] = [filter0, filter1];

            svg.selectAll('circle.mini-chart-point')
                .transition()
                .duration(transitionDuration / 3)
                .style('fill', d => {
                    return xScale(d.key) >= x0 && xScale(d.key) <= x1 ? selectedColor : outsideColor
                })
                .style("opacity", d =>
                    xScale(d.key) >= x0 && xScale(d.key) <= x1 ? 1 : .4
                );

            // let suffix;
            // if (variable === "StartDate") {
            //    
            // }
            // TODO: Range tooltip is added here, change range output to pretty value (0mi // 1PM 1:30PM etc)
            tooltip
                .style("visibility", "visible")
                .style("position", "relative")
                .text(selection.map(xScale.invert).map(d => {
                    if(variable === "StartDate"){
                        const hours = Math.floor(d);
                        const minutes = Math.floor((d - hours) * 60);
                        const ampm = hours >= 12 ? 'PM' : 'AM';
                        const formattedHours = ((hours + 11) % 12 + 1);
                        const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
                        return `${formattedHours}:${formattedMinutes} ${ampm}`;
                    }
                    else {
                        return d.toFixed(1)+"Mi";
                    }
                    
                }).join(" - "));

        } else {
            sharedStateFilters[variable] = null;
            svg.selectAll('circle')
                .transition()
                .duration(transitionDuration / 3)
                .style("opacity", 1)
                .style('fill', normalColor);
            tooltip
                .style("visibility", "hidden")
                .style("position", "absolute");

        }
        updateMapSelection(sharedStateFilters, tripData, hubsLayer, hubArray, hubData, contourLayer)


    }


    drawChart();

    window.addEventListener('resize', drawChart);
}