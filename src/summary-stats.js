fetch('summary-stats.html')
    .then(response => response.text())
    .then(text => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const template = doc.querySelector('template');
        const clone = document.importNode(template.content, true);
        d3.select('#summary-stats')
            .node()
            .appendChild(clone);
    });


// TODO creaet a function to run in update map selection (in main.js) that uses
//  the filtered trip data to compute agg stats and fill the template (summary-stats.html)