// visualize_script.js - For JavaScript functionality on the Visualize page
const FMP_API_KEY = 'M3WCOsdd5MojVXueguoarO7fGe9Nkuba'; // Ensure this is the correct key
let activeVisualizeCharts = []; // To keep track of Chart.js instances on this page

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('visualize-stock-search-input');
    const searchButton = document.getElementById('visualize-stock-search-button');
    const tickerResultsContainer = document.getElementById('visualize-ticker-search-results');
    const chartsDisplayArea = document.getElementById('charts-display-area');
    const chartsPlaceholderMessage = document.getElementById('charts-placeholder-message');

    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => {
            const searchTerm = searchInput.value.trim();
            if (searchTerm) {
                performVisualizeStockSearch(searchTerm, tickerResultsContainer);
            }
        });

        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                const searchTerm = searchInput.value.trim();
                if (searchTerm) {
                    performVisualizeStockSearch(searchTerm, tickerResultsContainer);
                }
            }
        });
    } else {
        console.error('Visualize page search input or button not found.');
    }
});

function destroyActiveVisualizeCharts() {
    activeVisualizeCharts.forEach(chart => chart.destroy());
    activeVisualizeCharts = [];
}

async function fetchVisualizeData(ticker, endpoint, params = {}) {
    let urlBase = 'https://financialmodelingprep.com/api/v3/';
    let url;

    if (endpoint === 'historical-price-full') {
        url = `${urlBase}${endpoint}/${ticker}?apikey=${FMP_API_KEY}`;
        if (params.from) url += `&from=${params.from}`;
        if (params.to) url += `&to=${params.to}`;
        // FMP's historical-price-full can also take 'serietype=line' for smaller responses if only close is needed
    } else {
        url = `${urlBase}${endpoint}/${ticker}?apikey=${FMP_API_KEY}`;
        if (params.period) url += `&period=${params.period}`;
        if (params.limit) url += `&limit=${params.limit}`;
    }
    
    console.log(`Fetching Visualize Data from: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
        let errorMessage = response.statusText;
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || (errorData["Error Message"]) || errorMessage;
        } catch (e) { /* Ignore */ }
        console.error(`FMP API Error for ${endpoint} ${ticker} (Visualize):`, errorMessage);
        throw new Error(`Failed to fetch ${endpoint} for visualization: ${errorMessage}`);
    }
    return response.json();
}

async function performVisualizeStockSearch(searchTerm, resultsContainer) {
    resultsContainer.innerHTML = '<p style="padding: 1rem; text-align: center;">Searching for stocks...</p>';
    const url = `https://financialmodelingprep.com/api/v3/search-ticker?query=${encodeURIComponent(searchTerm)}&limit=10&exchange=NASDAQ,NYSE,AMEX,EURONEXT,TSX&apikey=${FMP_API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            console.error('FMP API Error (Visualize Search):', errorData);
            resultsContainer.innerHTML = `<p style="padding: 1rem; text-align: center; color: red;">Error: ${errorData.message || response.statusText}</p>`;
            return;
        }
        const data = await response.json();
        displayVisualizeTickerSuggestions(data, resultsContainer);
    } catch (error) {
        console.error('Network or other error (Visualize Search):', error);
        resultsContainer.innerHTML = `<p style="padding: 1rem; text-align: center; color: red;">Network Error: ${error.message}</p>`;
    }
}

function displayVisualizeTickerSuggestions(results, container) {
    container.innerHTML = ''; // Clear previous results or loading/error message

    if (!results || results.length === 0) {
        container.innerHTML = '<p style="padding: 1rem; text-align: center; color:var(--text-secondary);">No stocks found matching your search.</p>';
        return;
    }

    results.forEach(stock => {
        const item = document.createElement('div');
        item.classList.add('ticker-result-item'); // Reuse existing style from style.css
        // Consider if #visualize-ticker-search-results .ticker-result-item needs specific styling later
        
        item.innerHTML = `
            <span class="symbol">${stock.symbol}</span>
            <span class="name">${stock.name} (${stock.stockExchange || 'N/A'})</span>
        `;
        // The whole item is clickable
        item.style.cursor = 'pointer'; 
        item.addEventListener('click', () => {
            container.innerHTML = ''; // Clear suggestions after selection
            const searchInput = document.getElementById('visualize-stock-search-input');
            if(searchInput) searchInput.value = `${stock.name} (${stock.symbol})`; // Update search bar text

            // Placeholder for chart loading function
            loadChartsForStock(stock.symbol, stock.name); 
        });
        container.appendChild(item);
    });
}

// Placeholder for the main function that will orchestrate data fetching and chart rendering
async function loadChartsForStock(symbol, name) {
    destroyActiveVisualizeCharts(); // Clear previous charts first

    const chartsDisplayArea = document.getElementById('charts-display-area');
    const chartsPlaceholderMessage = document.getElementById('charts-placeholder-message');

    if(chartsPlaceholderMessage) chartsPlaceholderMessage.style.display = 'none'; // Hide initial message
    chartsDisplayArea.innerHTML = `<h2 style="text-align:center; margin-bottom: 1.5rem;">Loading charts for ${name} (${symbol})...</h2>`;
    
    try {
        const today = new Date();
        const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];

        const [
            incomeData, 
            balanceData, 
            cashflowData, 
            keyMetricsData, 
            priceData
        ] = await Promise.all([
            fetchVisualizeData(symbol, 'income-statement', { period: 'annual', limit: 10 }),
            fetchVisualizeData(symbol, 'balance-sheet-statement', { period: 'annual', limit: 10 }),
            fetchVisualizeData(symbol, 'cash-flow-statement', { period: 'annual', limit: 10 }),
            fetchVisualizeData(symbol, 'key-metrics', { period: 'annual', limit: 10 }),
            fetchVisualizeData(symbol, 'historical-price-full', { from: oneYearAgo })
        ]);

        chartsDisplayArea.innerHTML = `<h2 style="text-align:center; margin-bottom: 1.5rem;">Visualizations for ${name} (${symbol})</h2>`; // Clear loading message

        // Income Statement Chart
        if (incomeData && incomeData.length > 0) {
            createChartDOM(chartsDisplayArea, 'incomeStatementVizChart', 'Income Statement Trends (Annual)');
            renderVisualizeChart('incomeStatementVizChart', 'bar', incomeData, ['revenue', 'grossProfit', 'operatingIncome', 'netIncome'], 'Income Statement Trends');
        } else {
            chartsDisplayArea.innerHTML += '<p>No Income Statement data available.</p>';
        }

        // Balance Sheet Chart
        if (balanceData && balanceData.length > 0) {
            createChartDOM(chartsDisplayArea, 'balanceSheetVizChart', 'Balance Sheet Trends (Annual)');
            renderVisualizeChart('balanceSheetVizChart', 'bar', balanceData, ['totalAssets', 'totalLiabilities', 'totalEquity', 'totalDebt', 'cashAndCashEquivalents'], 'Balance Sheet Trends');
        } else {
            chartsDisplayArea.innerHTML += '<p>No Balance Sheet data available.</p>';
        }

        // Cash Flow Chart
        if (cashflowData && cashflowData.length > 0) {
            createChartDOM(chartsDisplayArea, 'cashFlowVizChart', 'Cash Flow Trends (Annual)');
            renderVisualizeChart('cashFlowVizChart', 'bar', cashflowData, ['operatingCashFlow', 'freeCashFlow', 'capitalExpenditure', 'dividendsPaid'], 'Cash Flow Trends');
        } else {
            chartsDisplayArea.innerHTML += '<p>No Cash Flow data available.</p>';
        }
        
        // Key Metrics Charts - Split for better scale readability
        if (keyMetricsData && keyMetricsData.length > 0) {
            // Chart 1: Valuation Ratios (e.g., P/E, P/B)
            createChartDOM(chartsDisplayArea, 'valuationRatiosVizChart', 'Valuation Ratios (Annual)');
            renderVisualizeChart('valuationRatiosVizChart', 'bar', keyMetricsData, ['priceToEarningsRatio', 'priceToBookRatio'], 'Valuation Ratios');

            // Chart 2: Key Percentages (e.g., ROE, Dividend Yield)
            createChartDOM(chartsDisplayArea, 'keyPercentagesVizChart', 'Key Percentages (ROE, Dividend Yield - Annual)');
            renderVisualizeChart('keyPercentagesVizChart', 'bar', keyMetricsData, ['returnOnEquity', 'dividendYield'], 'Key Percentages');

            // Chart 3: Financial Health Ratios (e.g., Debt/Equity, Current Ratio)
            createChartDOM(chartsDisplayArea, 'financialHealthRatiosVizChart', 'Financial Health Ratios (Annual)');
            renderVisualizeChart('financialHealthRatiosVizChart', 'bar', keyMetricsData, ['debtToEquity', 'currentRatio'], 'Financial Health Ratios');
        } else {
            chartsDisplayArea.innerHTML += '<p style="text-align:center; margin-top:1rem;">No Key Metrics data available for detailed charts.</p>';
        }

        // Historical Price Chart
        if (priceData && priceData.historical && priceData.historical.length > 0) {
            createChartDOM(chartsDisplayArea, 'priceVizChart', 'Stock Price (Last Year)');
            // We'll need to adapt renderVisualizeChart or make a new one for line charts with date labels
            renderVisualizeChart('priceVizChart', 'line', priceData.historical, ['close'], 'Stock Price (Last Year)', true);
        } else {
            chartsDisplayArea.innerHTML += '<p>No historical price data available.</p>';
        }

    } catch (error) {
        console.error(`Error loading charts for ${symbol}:`, error);
        chartsDisplayArea.innerHTML = `<h2 style="text-align:center; color:red;">Could not load visualizations for ${name} (${symbol}).</h2><p style="text-align:center; color:var(--text-secondary);">${error.message}</p>`;
        if(chartsPlaceholderMessage) chartsPlaceholderMessage.style.display = 'block'; // Show placeholder again if error
    }
}

function createChartDOM(parentArea, canvasId, titleText) {
    console.log(`Creating DOM for chart: ${canvasId}, Title: ${titleText}`); // DEBUG_LOG
    const chartWrapper = document.createElement('div');
    chartWrapper.classList.add('chart-wrapper'); // Use this class for consistent styling
    chartWrapper.style.width = '90%';
    chartWrapper.style.maxWidth = '800px';
    chartWrapper.style.margin = '2rem auto';
    chartWrapper.style.padding = '1.5rem'; // 3rem total vertical padding (1.5rem top + 1.5rem bottom)
    chartWrapper.style.backgroundColor = 'rgba(0,0,0,0.15)';
    chartWrapper.style.borderRadius = '0.75rem';
    chartWrapper.style.border = '1px solid var(--border-color)';
    chartWrapper.style.position = 'relative'; 
    chartWrapper.style.height = '480px'; // Explicit height for the wrapper

    const title = document.createElement('h3');
    title.textContent = titleText;
    title.style.textAlign = 'center';
    title.style.color = 'var(--primary-color)';
    title.style.marginBottom = '1rem';

    const canvas = document.createElement('canvas');
    canvas.id = canvasId;
    canvas.height = 400; 
    canvas.style.display = 'block'; 
    canvas.style.width = '100%'; 
    canvas.style.height = '400px'; 

    chartWrapper.appendChild(title);
    chartWrapper.appendChild(canvas);
    parentArea.appendChild(chartWrapper);
}

// Basic chart rendering function - will need expansion for different types and data structures
function renderVisualizeChart(canvasId, chartType, data, metrics, chartLabel, isPriceChart = false) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`Canvas with id ${canvasId} not found for visualization.`);
        return;
    }

    let chartData, chartOptions;

    const reversedData = data.slice().reverse(); // FMP usually gives newest first, Chart.js prefers oldest first

    if (isPriceChart) { // Specific handling for historical price data
        const labels = reversedData.map(d => d.date); // Dates for x-axis
        chartData = {
            labels: labels,
            datasets: [{
                label: metrics[0] ? camelCaseToTitleCase(metrics[0]) : 'Price', // Assuming 'close' or similar
                data: reversedData.map(d => d[metrics[0]]),
                borderColor: 'var(--primary-color)',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                tension: 0.1,
                fill: true,
                pointRadius: 1, // Smaller points for daily data
                pointHoverRadius: 3
            }]
        };
        chartOptions = { // Options specific to line charts / price charts
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: false }, // Title is in the DOM via createChartDOM
                legend: { display: metrics.length > 1, position: 'top', labels: { color: '#d1d5db'} },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatFinancialValue(context.parsed.y, false, true)}`; // Use currency formatting
                        }
                    }
                }
            },
            scales: {
                x: { 
                    type: 'time', 
                    time: { unit: 'month', tooltipFormat: 'MMM YYYY', displayFormats: { month: 'MMM yy' } }, 
                    ticks: { color: '#d1d5db', maxRotation: 0, autoSkipPadding: 20 }, 
                    grid: { color: 'rgba(255,255,255,0.05)' } 
                },
                y: { 
                    ticks: { color: '#d1d5db', callback: (value) => '$' + formatFinancialValue(value, false, true) }, 
                    grid: { color: 'rgba(255,255,255,0.1)' } 
                }
            }
        };

    } else { // Bar chart for financial statements/key metrics
        const labels = reversedData.map(d => d.date || d.calendarYear || 'N/A');
        const datasets = metrics.map((metricKey, index) => {
            const barColors = ['rgba(139, 92, 246, 0.7)', 'rgba(236, 72, 153, 0.7)', 'rgba(16, 185, 129, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(245, 158, 11, 0.7)'];
            const borderColors = ['rgb(139, 92, 246)', 'rgb(236, 72, 153)', 'rgb(16, 185, 129)', 'rgb(59, 130, 246)', 'rgb(245, 158, 11)'];
            return {
                label: camelCaseToTitleCase(metricKey),
                data: reversedData.map(d => { const val = d[metricKey]; return typeof val === 'number' ? val : null; }),
                backgroundColor: barColors[index % barColors.length],
                borderColor: borderColors[index % borderColors.length],
                borderWidth: 1
            };
        });
        chartData = { labels: labels, datasets: datasets };
        chartOptions = { // Standard bar chart options
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: false }, // Title is in the DOM
                legend: { position: 'top', labels: { color: '#d1d5db', font: {size: 12}, usePointStyle: true } },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                const metricKey = metrics[context.datasetIndex];
                                const isPercentageKey = metricKey.toLowerCase().includes('growth') || metricKey.toLowerCase().includes('yield') || metricKey.toLowerCase().includes('ratio') || metricKey.toLowerCase().includes('margin') || metricKey.toLowerCase().includes('rate') || metricKey === 'payoutRatio' || metricKey === 'returnOnEquity';
                                label += formatFinancialValue(context.parsed.y, isPercentageKey);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#d1d5db', font: {size: 12}, callback: (value) => formatFinancialValue(value) }, grid: { color: 'rgba(255,255,255,0.1)'} },
                x: { ticks: { color: '#d1d5db', font: {size: 12} }, grid: { color: 'rgba(255,255,255,0.05)'} }
            }
        };
    }

    const chart = new Chart(ctx, { type: chartType, data: chartData, options: chartOptions });
    activeVisualizeCharts.push(chart);
}

// Helper function (can be shared if using modules or ensure consistency)
function camelCaseToTitleCase(text) {
    if (typeof text !== 'string') return '';
    if (text === 'eps') return 'EPS';
    if (text === 'ebitda') return 'EBITDA';
    if (text === 'peRatio') return 'P/E Ratio';
    if (text === 'pbRatio') return 'P/B Ratio';
    const result = text.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
    return result.trim();
}

// Updated financial value formatter (can also be shared/synced with script.js)
function formatFinancialValue(value, isExplicitPercentage = false, isCurrency = false) {
    if (value === null || typeof value === 'undefined') return 'N/A';
    if (typeof value === 'string' && value.trim() === '') return 'N/A';
    if (typeof value !== 'number') return String(value); // If not a number after checks, stringify

    if (isExplicitPercentage) {
        return (value * 100).toFixed(2) + '%';
    }
    
    const absValue = Math.abs(value);
    let formattedValue = "";

    if (absValue < 0.001 && value !== 0 && !isCurrency) return value.toExponential(2); // Avoid for currency
    
    if (absValue >= 1e12) formattedValue = (value / 1e12).toFixed(2) + ' T';
    else if (absValue >= 1e9) formattedValue = (value / 1e9).toFixed(2) + ' B';
    else if (absValue >= 1e6) formattedValue = (value / 1e6).toFixed(2) + ' M';
    else {
        // For numbers less than a million, or currency
        formattedValue = value.toLocaleString(undefined, { 
            minimumFractionDigits: isCurrency ? 2 : (absValue < 10 && absValue !== 0 ? 2 : 0), // More precision for small non-currency ratios/numbers
            maximumFractionDigits: 2 
        });
    }
    return isCurrency ? '$' + formattedValue : formattedValue;
}

// Dummy chart for testing if Chart.js is available
/*
function tryRenderDummyChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || !Chart) {
        console.warn('Canvas or Chart.js not found for dummy chart.');
        return;
    }
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
            datasets: [{
                label: 'Sample Data',
                data: [10, 20, 15, 25, 30],
                borderColor: 'var(--primary-color)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false }}
        }
    });
}
*/

// TODO: Helper function to fetch financial data (similar to script.js but perhaps more generic for historical)
// TODO: Helper function to create individual charts
// TODO: Helper function to manage/destroy active chart instances 