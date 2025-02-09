// Define API URLs
const API_URLS = {
    default: 'https://inspirehep.net/api/literature?sort=mostrecent&size=50&page=1&q=a%20Neelkamal.Mallick.1&author_count=10%20authors%20or%20less&doc_type=article&ui-citation-summary=true',
    other: 'https://inspirehep.net/api/literature?sort=mostrecent&size=50&page=1&q=a Neelkamal.Mallick.1&author_count=10 authors or less&doc_type=conference paper&ui-citation-summary=true'
};

let currentApiUrl = API_URLS.default;

async function fetchPublications() {
    try {
        const response = await fetch(currentApiUrl);
        const data = await response.json();
        console.log('API Response:', data);
        return data.hits.hits;
    } catch (error) {
        console.error('Error fetching publications:', error);
        return [];
    }
}

function formatAuthorName(fullName) {
    // Split the name into parts
    const parts = fullName.split(',');
    if (parts.length !== 2) return fullName;

    // Get last name and first/middle names
    const lastName = parts[0].trim();
    const firstMiddle = parts[1].trim().split('.');
    
    // Format first and middle initials
    const formattedFirstMiddle = firstMiddle
        .map(part => part.trim())
        .filter(part => part) // Remove empty parts
        .join('. ');  // Removed the extra '.' at the end

    // Format the name
    const formattedName = `${formattedFirstMiddle} ${lastName}`;
    
    // Make Neelkamal Mallick bold
    if (lastName === 'Mallick' && firstMiddle.some(part => part.includes('Neelkamal'))) {
        return `<strong>${formattedName}</strong>`;
    }

    return formattedName;
}

function formatPublication(pub, index) {
    try {
        console.log('Formatting publication:', pub); // Debug log
        
        const title = pub.metadata.titles[0].title;
        const authors = pub.metadata.authors 
            ? pub.metadata.authors
                .map(author => formatAuthorName(author.full_name))
                .join(', ')
            : 'ALICE Collaboration';
            
        // Format publication info
        const pubInfo = pub.metadata.publication_info && pub.metadata.publication_info[0];
        const journal = pubInfo?.journal_title || '';
        const volume = pubInfo?.journal_volume ? `${pubInfo.journal_volume}` : '';
        const year = pubInfo?.year ? `(${pubInfo.year})` : '';
        const pages = pubInfo?.page_start ? `, ${pubInfo.page_start}` : '';
        const articleId = pubInfo?.artid ? `, ${pubInfo.artid}` : '';

        // Format complete reference
        const fullRef = [journal, volume, year, pages || articleId]
            .filter(Boolean)
            .join(' ');

        // Format arXiv reference
        const arxiv = pub.metadata.arxiv_eprints 
            ? `• <span class="journal-ref" data-doi="https://arxiv.org/abs/${pub.metadata.arxiv_eprints[0].value}">arXiv:${pub.metadata.arxiv_eprints[0].value}</span>` 
            : '';
        const citations = pub.metadata.citation_count || 0;

        // Get DOI link
        const doi = pub.metadata.dois?.[0]?.value;
        const journalRef = doi 
            ? `<span class="journal-ref" data-doi="https://doi.org/${doi}">${fullRef}</span>` 
            : (fullRef || 'Under Peer-Review');

        return `
            <div class="pub-item">
                <span class="pub-number">${index + 1}.</span>
                <p class="title">${title}</p>
                <p class="authors">${authors}</p>
                <p class="journal">${citations} citations • ${journalRef} ${arxiv}</p>
            </div>
        `;
    } catch (error) {
        console.error('Error formatting publication:', error, pub);
        return '';
    }
}

// Function to calculate publication metrics
function calculateMetrics(publications) {
    // Split publications into published and under review
    const published = publications.filter(pub => 
        pub.metadata.publication_info && 
        pub.metadata.publication_info[0]?.journal_title
    );
    const underReview = publications.filter(pub => 
        !pub.metadata.publication_info || 
        !pub.metadata.publication_info[0]?.journal_title
    );
    
    // Calculate total citations
    const totalCitations = publications.reduce((sum, pub) => {
        return sum + (pub.metadata.citation_count || 0);
    }, 0);

    // Calculate h-index
    const citations = publications
        .map(pub => pub.metadata.citation_count || 0)
        .sort((a, b) => b - a);
    let hIndex = 0;
    for (let i = 0; i < citations.length; i++) {
        if (citations[i] >= i + 1) {
            hIndex = i + 1;
        } else {
            break;
        }
    }

    return { 
        published: published.length,
        underReview: underReview.length,
        totalCitations, 
        hIndex 
    };
}

async function updatePublicationList() {
    const pubList = document.querySelector('.pub-list');
    pubList.innerHTML = '<p>Loading publications...</p>';

    try {
        const publications = await fetchPublications();
        console.log('Fetched publications:', publications);
        
        if (publications.length === 0) {
            pubList.innerHTML = '<p>No publications found</p>';
            return;
        }

        // Calculate metrics
        const metrics = calculateMetrics(publications);
        
        // Update metrics display
        const metricsHtml = `
            <div class="pub-metrics">
                <span class="metric">Published: ${metrics.published}</span>
                <span class="metric">Under Review: ${metrics.underReview}</span>
                <span class="metric">Total Citations: ${metrics.totalCitations}</span>
                <span class="metric">h-index: ${metrics.hIndex}</span>
            </div>
        `;

        // Update publications list with metrics
        pubList.innerHTML = metricsHtml + publications.map((pub, index) => formatPublication(pub, index)).join('');

    } catch (error) {
        console.error('Error updating publication list:', error);
        pubList.innerHTML = '<p>Error loading publications</p>';
    }
}

// Add toggle function
function togglePublicationList(type) {
    // Update active button
    document.querySelectorAll('.pub-toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`#${type}Btn`).classList.add('active');
    
    // Update API URL
    currentApiUrl = API_URLS[type];
    
    // Refresh publication list
    updatePublicationList();
}

// Update on page load
document.addEventListener('DOMContentLoaded', updatePublicationList);

// Add click handler for journal references
document.addEventListener('click', function(e) {
    const target = e.target.closest('.journal-ref');  // Use closest to handle clicks on child elements
    if (target) {
        const doiUrl = target.getAttribute('data-doi');
        if (doiUrl) {
            window.open(doiUrl, '_blank', 'noopener,noreferrer');
        }
    }
}); 