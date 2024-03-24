// Fetch the template file
fetch('summary-stats.html')
    .then(response => response.text())
    .then(text => {
        // Create a new HTML document from the fetched text
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        // Select the template content
        const template = doc.querySelector('template');
        // Import the template content
        const clone = document.importNode(template.content, true);
        // Append the template content to the target element
        d3.select('#summary-stats')
            .node()
            .appendChild(clone);
    });
