function createBeeswarmChart(selector, variable, title, tripData, hubData) {
    let aggTrips;
    let countScale = d3.scaleLinear();
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
            aggTrips = d3.rollup(tripData, v => ({
                count: v.length,
                uniqueStartIDs: new Set(v.map(d => d.StartID))
            }), d => {
                return Math.round(d.DistanceMiles * 2) / 2;
            });
            countScale.range([0, 18]);
            break;
        default:
            // Handle other variables here
            break;
    }

    aggTrips = Array.from(aggTrips, ([key, { count, uniqueStartIDs }]) => ({
        key,
        count,
        uniqueStartIDs: Array.from(uniqueStartIDs)
    }));

    countScale
        .domain([0, d3.max(aggTrips, d => d.count)])


    const scaledTrips = aggTrips.map(d => ({
        key: d['key'],
        count: countScale(d.count)
    }));

    const expandedTrips = scaledTrips.flatMap(d => d3.range(d.count).map(() => ({ key: d.key })));

    const container = d3.select(selector);
    const chartDiv = container.append('div')
        .attr('class', 'chart-div');

    chartDiv.append("h1").text(title).style("color", colorPalette['primary'][3])

    let svg = chartDiv.append('svg');
    const margin = { top: 0, right: 25, bottom: 20, left: 25 };

    function drawChart() {
        svg.selectAll('*').remove();

        const width = chartDiv.node().clientWidth;
        const height = Math.max(90, width / 3);

        svg.attr('width', width).attr('height', height);

        let xScale, xAxis;
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
                    .domain(d3.extent(aggTrips, d => d.key))
                    .range([0, width - margin.left - margin.right]);

                xAxis = d3.axisBottom(xScale).ticks(6);
                break;
            default:
                xScale = d3.scaleLinear().domain(d3.extent(aggTrips, d => d.key)).range([0, width - margin.left - margin.right]);
                xAxis = d3.axisBottom(xScale).ticks(6);
                break;
        }

        const centerY = (height - margin.top - margin.bottom) / 2;

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        g.append('g')
            .attr('transform', `translate(0,${height - margin.top - margin.bottom})`)
            .call(xAxis);

        let simulation = d3.forceSimulation(expandedTrips)
            .force('x', d3.forceX(d => xScale(d.key)).strength(1))
            .force('y', d3.forceY().y(centerY).strength(0.05))
            .force('collide', d3.forceCollide().radius(3));

        simulation.on('tick', () => {
            g.selectAll('circle')
                .data(expandedTrips)
                .join('circle')
                .attr('cx', d => d.x)
                .attr('cy', d => d.y)
                .attr('r', 2)
                .style('fill', colorPalette['complement'][0])
                .on("mouseover", function (d) {
                    console.log(d3.select(this).datum());
                });
        });

        chartDiv.style("background-color", "white")
            .style("border", "solid black 1px")
            .style("border-radius", "20px");

        const brush = d3.brush()
            .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
            .on("start brush end", brushed);

        svg.append("g")
            .call(brush);

        function brushed(event) {
            const selection = event.selection;
            if (selection === null) return;

            const [x0, x1] = selection;

            g.selectAll('circle')
                .classed("hidden", d => xScale(d.key) < x0 || xScale(d.key) > x1);
        }
    }

    drawChart();

    window.addEventListener('resize', drawChart);
}
