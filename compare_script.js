const FMP_API_KEY = 'M3WCOsdd5MojVXueguoarO7fGe9Nkuba'; // Same API key
let selectedComparisonStocks = [];
const MAX_COMPARE_STOCKS = 6;

let allStocksDataForComparison = []; // Store the fetched data globally for this page
let comparisonMetricChartInstance = null; // To hold the specific comparison chart instance

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('compare-stock-search-input');
    const searchButton = document.getElementById('compare-stock-search-button');
    const searchResultsContainer = document.getElementById('compare-ticker-search-results');
    const selectedStocksDisplay = document.getElementById('selected-stocks-display');
    const selectedStocksCount = document.getElementById('selected-stocks-count');
    const clearComparisonBtn = document.getElementById('clear-comparison-btn');

    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => {
            const searchTerm = searchInput.value.trim();
            if (searchTerm) searchForStocksToAdd(searchTerm);
        });
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                const searchTerm = searchInput.value.trim();
                if (searchTerm) searchForStocksToAdd(searchTerm);
            }
        });
    }

    if (clearComparisonBtn) {
        clearComparisonBtn.addEventListener('click', clearAllSelectedStocks);
    }

    loadSelectedStocksFromSession(); // Load from session storage if available
    updateSelectedStocksDisplay(); // Initial display update

    const chartMetricBtn = document.getElementById('chart-selected-metric-btn');
    if (chartMetricBtn) {
        chartMetricBtn.addEventListener('click', handleChartSelectedMetric);
    }
});

async function searchForStocksToAdd(searchTerm) {
    const searchResultsContainer = document.getElementById('compare-ticker-search-results');
    searchResultsContainer.innerHTML = '<p style="padding: 1rem; text-align: center;">Loading...</p>';
    const url = `https://financialmodelingprep.com/api/v3/search-ticker?query=${encodeURIComponent(searchTerm)}&limit=5&exchange=NASDAQ,NYSE,AMEX,EURONEXT,TSX&apikey=${FMP_API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            searchResultsContainer.innerHTML = `<p style="color:red;">Error: ${errorData.message || response.statusText}</p>`;
            return;
        }
        const data = await response.json();
        displayAddTickerResults(data);
    } catch (error) {
        searchResultsContainer.innerHTML = `<p style="color:red;">Network error: ${error.message}</p>`;
    }
}

function displayAddTickerResults(results) {
    const container = document.getElementById('compare-ticker-search-results');
    container.innerHTML = '';
    if (!results || results.length === 0) {
        container.innerHTML = '<p>No tickers found.</p>';
        return;
    }
    results.forEach(stock => {
        const item = document.createElement('div');
        item.classList.add('ticker-result-item');
        item.innerHTML = `<span class="symbol">${stock.symbol}</span> <span class="name">${stock.name} (${stock.stockExchange})</span>`;
        item.addEventListener('click', () => {
            addStockToComparison(stock);
            container.innerHTML = ''; // Clear search results
            document.getElementById('compare-stock-search-input').value = ''; // Clear search input
        });
        container.appendChild(item);
    });
}

function addStockToComparison(stock) {
    if (selectedComparisonStocks.length >= MAX_COMPARE_STOCKS) {
        alert(`You can compare a maximum of ${MAX_COMPARE_STOCKS} stocks.`);
        return;
    }
    if (selectedComparisonStocks.find(s => s.symbol === stock.symbol)) {
        alert(`${stock.symbol} is already in your comparison list.`);
        return;
    }
    selectedComparisonStocks.push({ symbol: stock.symbol, name: stock.name });
    updateSelectedStocksDisplay();
    saveSelectedStocksToSession();
}

function removeStockFromComparison(symbolToRemove) {
    selectedComparisonStocks = selectedComparisonStocks.filter(s => s.symbol !== symbolToRemove);
    updateSelectedStocksDisplay();
    saveSelectedStocksToSession();
}

function updateSelectedStocksDisplay() {
    const displayDiv = document.getElementById('selected-stocks-display');
    const countSpan = document.getElementById('selected-stocks-count');
    const clearBtn = document.getElementById('clear-comparison-btn');
    displayDiv.innerHTML = '';

    if (selectedComparisonStocks.length === 0) {
        displayDiv.innerHTML = '<p style="color:var(--text-secondary);">No stocks selected for comparison yet.</p>';
        if (clearBtn) clearBtn.style.display = 'none';
    } else {
        selectedComparisonStocks.forEach(stock => {
            const card = document.createElement('div');
            card.classList.add('selected-stock-card');
            card.innerHTML = `<span>${stock.symbol}</span> <button class="remove-stock-btn" data-symbol="${stock.symbol}">&times;</button>`;
            card.querySelector('.remove-stock-btn').addEventListener('click', (e) => {
                removeStockFromComparison(e.target.dataset.symbol);
            });
            displayDiv.appendChild(card);
        });
        if (clearBtn) clearBtn.style.display = 'inline-block';
    }
    countSpan.textContent = selectedComparisonStocks.length;

    // Fetch and display comparison data if stocks are selected
    if (selectedComparisonStocks.length > 0) {
        buildAndDisplayComparisonTable();
    } else {
        document.getElementById('comparison-table-container').innerHTML = '<p style="text-align:center; color:var(--text-secondary);">Select stocks to see comparison data.</p>';
    }
}

function clearAllSelectedStocks(){
    selectedComparisonStocks = [];
    updateSelectedStocksDisplay();
    saveSelectedStocksToSession();
}

// --- Functions to save/load comparison list from session storage ---
function saveSelectedStocksToSession() {
    sessionStorage.setItem('comparisonStocks', JSON.stringify(selectedComparisonStocks));
}

function loadSelectedStocksFromSession() {
    const storedStocks = sessionStorage.getItem('comparisonStocks');
    if (storedStocks) {
        selectedComparisonStocks = JSON.parse(storedStocks);
    }
}

// --- Helper function to fetch data for a single stock and endpoint ---
async function fetchCompareDataForStock(ticker, endpoint, params = {}) {
    let url = `https://financialmodelingprep.com/api/v3/${endpoint}/${ticker}?apikey=${FMP_API_KEY}`;
    if (params.period) url += `&period=${params.period}`;
    if (params.limit) url += `&limit=${params.limit}`;

    // console.log(`Compare Fetch: ${url}`); // For debugging
    const response = await fetch(url);
    if (!response.ok) {
        let errorMessage = `Failed to fetch ${endpoint} for ${ticker}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || (errorData["Error Message"]) || errorMessage;
        } catch (e) { /* Ignore if response is not JSON */ }
        console.error(errorMessage);
        // Return null or an empty object to handle errors gracefully in Promise.all
        // Individual metric processing will need to check for this.
        return { error: errorMessage, data: endpoint.includes('statement') || endpoint.includes('metrics') || endpoint.includes('growth') ? [{}] : {} }; 
    }
    const data = await response.json();
    // FMP often returns an array even for single-item results (like latest profile or quote)
    // For consistency in data access (e.g. data[0].price), we ensure it's an array, or an object if it's a single result that isn't an array.
    // For statements, metrics, growth - they usually return arrays of periods. We take the first for latest.
    if (Array.isArray(data) && data.length > 0) {
        return data; // Return the array, latest is usually data[0]
    }
    if(!Array.isArray(data) && typeof data === 'object' && data !== null){
         return [data]; // Wrap single object in array for consistency
    }
    return [{}]; // Return array with empty object if no data or unexpected format
}

// Metrics to display in the comparison table
const comparisonMetricsConfig = [
    { category: "Profile", label: "Company Name", path: "profile.0.companyName", explanation: "Full legal name of the company." },
    { category: "Profile", label: "Exchange", path: "profile.0.exchangeShortName", explanation: "The stock exchange where the company's shares are listed." },
    { category: "Profile", label: "Sector", path: "profile.0.sector", explanation: "The broad sector of the economy to which the company belongs." },
    { category: "Profile", label: "Industry", path: "profile.0.industry", explanation: "The specific industry group within the sector the company operates in." },
    { category: "Profile", label: "Price", path: "profile.0.price", format: 'currency', explanation: "The current trading price of one share of the company's stock." },
    { category: "Profile", label: "Market Cap", path: "profile.0.mktCap", format: 'largeNumber', explanation: "Total market value of a company's outstanding shares (Current Share Price x Total Outstanding Shares)." },

    { category: "Valuation Ratios", label: "P/E Ratio (TTM)", path: "keyMetrics.0.peRatioTTM", format: 'ratio', explanation: "Price-to-Earnings ratio, measures the company's current share price relative to its per-share earnings over the trailing twelve months." },
    { category: "Valuation Ratios", label: "P/B Ratio (TTM)", path: "keyMetrics.0.priceToBookRatioTTM", format: 'ratio', explanation: "Price-to-Book ratio, compares a company's market capitalization to its book value." },
    { category: "Valuation Ratios", label: "Dividend Yield (TTM)", path: "keyMetrics.0.dividendYieldTTM", format: 'percentage', explanation: "Financial ratio (dividend/price) that shows how much a company pays out in dividends each year relative to its stock price." },
    { category: "Valuation Ratios", label: "EV/EBITDA (TTM)", path: "keyMetrics.0.enterpriseValueOverEBITDATTM", format: 'ratio', explanation: "Enterprise Value to Earnings Before Interest, Taxes, Depreciation, and Amortization. A valuation metric used to compare the relative value of different businesses." },
    
    { category: "Financial Health", label: "Debt/Equity", path: "keyMetrics.0.debtToEquity", format: 'ratio', explanation: "Measures a company's financial leverage, calculated by dividing its total liabilities by its shareholder equity." },
    { category: "Financial Health", label: "Current Ratio", path: "keyMetrics.0.currentRatio", format: 'ratio', explanation: "Liquidity ratio that measures a company's ability to pay short-term obligations (due within one year)." },
    { category: "Financial Health", label: "Return on Equity (ROE)", path: "keyMetrics.0.returnOnEquity", format: 'percentage', explanation: "Measures a company's profitability in relation to shareholders' equity." },

    { category: "Income Statement (Latest Annual)", label: "Report Date", path: "incomeStatement.0.date", explanation: "The date to which the reported financial figures correspond." },
    { category: "Income Statement (Latest Annual)", label: "Revenue", path: "incomeStatement.0.revenue", format: 'largeNumber', explanation: "Total income generated by a company from its normal business operations." },
    { category: "Income Statement (Latest Annual)", label: "Gross Profit", path: "incomeStatement.0.grossProfit", format: 'largeNumber', explanation: "Profit a company makes after deducting the costs associated with making and selling its products, or the costs associated with providing its services." },
    { category: "Income Statement (Latest Annual)", label: "Operating Income", path: "incomeStatement.0.operatingIncome", format: 'largeNumber', explanation: "Profit from business operations before interest and taxes." },
    { category: "Income Statement (Latest Annual)", label: "Net Income", path: "incomeStatement.0.netIncome", format: 'largeNumber', explanation: "A company's total earnings (or profit) after all expenses, including taxes and interest, have been deducted." },
    { category: "Income Statement (Latest Annual)", label: "EPS", path: "incomeStatement.0.eps", format: 'currency', explanation: "Earnings Per Share, the portion of a company's profit allocated to each outstanding share of common stock." },

    { category: "Balance Sheet (Latest Annual)", label: "Report Date", path: "balanceSheet.0.date", explanation: "The date to which the reported financial figures correspond." },
    { category: "Balance Sheet (Latest Annual)", label: "Total Assets", path: "balanceSheet.0.totalAssets", format: 'largeNumber', explanation: "The sum of all current and non-current assets owned by a company." },
    { category: "Balance Sheet (Latest Annual)", label: "Total Liabilities", path: "balanceSheet.0.totalLiabilities", format: 'largeNumber', explanation: "The sum of a company's short-term and long-term financial obligations." },
    { category: "Balance Sheet (Latest Annual)", label: "Total Equity", path: "balanceSheet.0.totalEquity", format: 'largeNumber', explanation: "Represents the shareholders' stake in the company. Calculated as Total Assets - Total Liabilities." },
    { category: "Balance Sheet (Latest Annual)", label: "Total Debt", path: "balanceSheet.0.totalDebt", format: 'largeNumber', explanation: "The sum of all of a company's short-term and long-term interest-bearing financial obligations." },
    { category: "Balance Sheet (Latest Annual)", label: "Cash & Equivalents", path: "balanceSheet.0.cashAndCashEquivalents", format: 'largeNumber', explanation: "The most liquid assets of a company, including currency, checks, and money market accounts." },

    { category: "Cash Flow (Latest Annual)", label: "Report Date", path: "cashFlow.0.date", explanation: "The date to which the reported financial figures correspond." },
    { category: "Cash Flow (Latest Annual)", label: "Operating Cash Flow", path: "cashFlow.0.operatingCashFlow", format: 'largeNumber', explanation: "Cash generated from a company's normal business operations." },
    { category: "Cash Flow (Latest Annual)", label: "Capital Expenditure", path: "cashFlow.0.capitalExpenditure", format: 'largeNumber', explanation: "Funds used by a company to acquire, upgrade, and maintain physical assets like property, buildings, or equipment." },
    { category: "Cash Flow (Latest Annual)", label: "Free Cash Flow", path: "cashFlow.0.freeCashFlow", format: 'largeNumber', explanation: "Cash flow available to all investors (debt and equity holders) after the company has paid all operating expenses and capital expenditures." },

    { category: "Growth Rates (YoY, Latest Annual)", label: "Report Date", path: "financialGrowth.0.date", explanation: "The date to which the reported financial figures correspond." },
    { category: "Growth Rates (YoY, Latest Annual)", label: "Revenue Growth", path: "financialGrowth.0.revenueGrowth", format: 'percentage', explanation: "The year-over-year percentage increase in a company's total revenue." },
    { category: "Growth Rates (YoY, Latest Annual)", label: "Net Income Growth", path: "financialGrowth.0.netIncomeGrowth", format: 'percentage', explanation: "The year-over-year percentage increase in a company's net income." },
    { category: "Growth Rates (YoY, Latest Annual)", label: "EPS Growth", path: "financialGrowth.0.epsgrowth", format: 'percentage', explanation: "The year-over-year percentage increase in a company's Earnings Per Share." },
    { category: "Growth Rates (YoY, Latest Annual)", label: "FCF Growth", path: "financialGrowth.0.freeCashFlowGrowth", format: 'percentage', explanation: "The year-over-year percentage increase in a company's Free Cash Flow." },
];

async function buildAndDisplayComparisonTable() {
    const container = document.getElementById('comparison-table-container');
    container.innerHTML = '<p style="text-align:center;">Loading comparison data for selected stocks...</p>';
    document.getElementById('comparison-metric-chart-container').style.display = 'none'; // Hide chart initially
    if(comparisonMetricChartInstance) comparisonMetricChartInstance.destroy(); // Destroy old chart

    if (selectedComparisonStocks.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">Select stocks to see comparison data.</p>';
        populateMetricSelectDropdown([]); // Clear or disable dropdown
        return;
    }

    const stockDataPromises = selectedComparisonStocks.map(stock => {
        return Promise.all([
            fetchCompareDataForStock(stock.symbol, 'profile'),
            fetchCompareDataForStock(stock.symbol, 'key-metrics', { period: 'annual', limit: 1 }),
            fetchCompareDataForStock(stock.symbol, 'income-statement', { period: 'annual', limit: 1 }),
            fetchCompareDataForStock(stock.symbol, 'balance-sheet-statement', { period: 'annual', limit: 1 }),
            fetchCompareDataForStock(stock.symbol, 'cash-flow-statement', { period: 'annual', limit: 1 }),
            fetchCompareDataForStock(stock.symbol, 'financial-growth', { period: 'annual', limit: 1 })
        ]).then(results => ({
            symbol: stock.symbol,
            name: stock.name,
            profile: results[0],
            keyMetrics: results[1],
            incomeStatement: results[2],
            balanceSheet: results[3],
            cashFlow: results[4],
            financialGrowth: results[5]
        })).catch(error => {
            console.error(`Error fetching all data for ${stock.symbol}:`, error);
            return { symbol: stock.symbol, name: stock.name, error: true };
        });
    });

    try {
        allStocksDataForComparison = await Promise.all(stockDataPromises); // Store fetched data globally
        
        let tableHtml = '<div style="overflow-x: auto;"><table class="financial-table comparison-data-table"><thead><tr><th>Metric</th>';
        allStocksDataForComparison.forEach(stock => {
            tableHtml += `<th>${stock.symbol}<br><span style="font-size:0.8em; color:var(--text-secondary);">${stock.name || ''}</span></th>`;
        });
        tableHtml += '</tr></thead><tbody>';
        let currentCategory = "";
        comparisonMetricsConfig.forEach(metric => {
            if (metric.category !== currentCategory) {
                currentCategory = metric.category;
                tableHtml += `<tr><td colspan="${allStocksDataForComparison.length + 1}" style="background-color: var(--border-color); color: var(--text-primary); font-weight: bold; padding: 0.5em;">${currentCategory}</td></tr>`;
            }
            tableHtml += `<tr><td title="${metric.explanation || ''}">${metric.label}</td>`;
            allStocksDataForComparison.forEach(stockData => {
                if (stockData.error) {
                    tableHtml += '<td style="color:red;">Error</td>';
                    return;
                }
                const pathParts = metric.path.split('.');
                let value = stockData;
                for (const part of pathParts) {
                    if (value && typeof value === 'object' && part in value) {
                        value = value[part];
                    } else {
                        value = null; 
                        break;
                    }
                }
                tableHtml += `<td>${formatCompareValue(value, metric.format)}</td>`;
            });
            tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table></div>';
        container.innerHTML = tableHtml;

        populateMetricSelectDropdown(comparisonMetricsConfig);

    } catch (error) {
        console.error("Error building comparison table:", error);
        container.innerHTML = '<p style="text-align:center; color:red;">Could not load comparison data. See console for details.</p>';
        populateMetricSelectDropdown([]); // Clear or disable dropdown on error
    }
}

function populateMetricSelectDropdown(metrics) {
    const selectDropdown = document.getElementById('metric-select-dropdown');
    if (!selectDropdown) return;

    selectDropdown.innerHTML = '<option value="">-- Select a Metric --</option>'; // Clear existing options
    if (metrics.length === 0 || selectedComparisonStocks.length === 0) {
        selectDropdown.disabled = true;
        return;
    }
    selectDropdown.disabled = false;

    // Filter for metrics that are typically numeric and good for charting
    const chartableMetrics = metrics.filter(metric => 
        metric.format === 'currency' || 
        metric.format === 'largeNumber' || 
        metric.format === 'percentage' || 
        metric.format === 'ratio'
    );

    let currentCategory = "";
    chartableMetrics.forEach(metric => {
        if (metric.category !== currentCategory) {
            currentCategory = metric.category;
            const optGroup = document.createElement('optgroup');
            optGroup.label = currentCategory;
            // Optionally add tooltip to optgroup as well, though browser support/display varies
            // optGroup.title = `Category: ${currentCategory}`; 
            selectDropdown.appendChild(optGroup);
        }
        const option = document.createElement('option');
        option.value = metric.path; // Use path as value for easy data retrieval
        option.textContent = metric.label;
        option.title = metric.explanation || ''; // Add tooltip to dropdown options
        // Find the optgroup to append to, or append to selectDropdown directly if no optgroup used
        const optGroupElement = selectDropdown.querySelector(`optgroup[label="${currentCategory}"]`);
        if (optGroupElement) {
            optGroupElement.appendChild(option);
        } else {
            selectDropdown.appendChild(option);
        }
    });
}

function handleChartSelectedMetric() {
    const selectedMetricPath = document.getElementById('metric-select-dropdown').value;
    const chartContainer = document.getElementById('comparison-metric-chart-container');
    
    if (!selectedMetricPath) {
        alert("Please select a metric from the dropdown to chart.");
        chartContainer.style.display = 'none';
        return;
    }
    if (allStocksDataForComparison.length === 0) {
        alert("No stocks selected or data loaded for comparison.");
        return;
    }

    const metricConfig = comparisonMetricsConfig.find(m => m.path === selectedMetricPath);
    if (!metricConfig) {
        console.error("Selected metric configuration not found.");
        return;
    }

    const chartData = {
        labels: allStocksDataForComparison.map(stock => stock.symbol),
        datasets: [{
            label: metricConfig.label,
            data: allStocksDataForComparison.map(stockData => {
                if (stockData.error) return null; // Handle cases where stock data failed to load
                const pathParts = selectedMetricPath.split('.');
                let value = stockData;
                for (const part of pathParts) {
                    if (value && typeof value === 'object' && part in value) {
                        value = value[part];
                    } else {
                        value = null;
                        break;
                    }
                }
                return (typeof value === 'number' && metricConfig.format === 'percentage') ? value * 100 : (typeof value === 'number' ? value : null);
            }),
            backgroundColor: allStocksDataForComparison.map((_, idx) => getBarChartColor(idx, 'background')),
            borderColor: allStocksDataForComparison.map((_, idx) => getBarChartColor(idx, 'border')),
            borderWidth: 1
        }]
    };

    chartContainer.style.display = 'block';
    if (comparisonMetricChartInstance) {
        comparisonMetricChartInstance.destroy();
    }

    const ctx = document.getElementById('comparisonMetricChart').getContext('2d');
    comparisonMetricChartInstance = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'x', // Stocks on X-axis, bars are vertical
            plugins: {
                title: {
                    display: true,
                    text: `Comparison: ${metricConfig.label}`,
                    color: '#f9fafb',
                    font: { size: 18, weight: 'bold' },
                    padding: { top:10, bottom:20 }
                },
                legend: { display: false }, // Legend might be redundant if only one dataset
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                if(metricConfig.format === 'percentage'){
                                    label += context.parsed.y.toFixed(2) + '%'; // Value already multiplied by 100 for percentages
                                } else {
                                    label += formatCompareValue(context.parsed.y, metricConfig.format);
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#d1d5db',
                        callback: function(value) {
                            if(metricConfig.format === 'percentage'){
                                return value.toFixed(0) + '%';
                            }
                            return formatCompareValue(value, metricConfig.format);
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    ticks: { color: '#d1d5db' },
                    grid: { display: false }
                }
            }
        }
    });
}

// Helper for bar chart colors to avoid direct use of getRandomColor for consistency per bar
function getBarChartColor(index, type) {
    const baseColors = [
        { background: 'rgba(139, 92, 246, 0.7)', border: 'rgb(139, 92, 246)' },
        { background: 'rgba(236, 72, 153, 0.7)', border: 'rgb(236, 72, 153)' },
        { background: 'rgba(16, 185, 129, 0.7)', border: 'rgb(16, 185, 129)' },
        { background: 'rgba(59, 130, 246, 0.7)', border: 'rgb(59, 130, 246)' },
        { background: 'rgba(245, 158, 11, 0.7)', border: 'rgb(245, 158, 11)' },
        { background: 'rgba(239, 68, 68, 0.7)', border: 'rgb(239, 68, 68)' }
    ];
    return baseColors[index % baseColors.length][type];
}

// Modified formatter for comparison table
function formatCompareValue(value, formatType) {
    if (value === null || typeof value === 'undefined' || String(value).trim() === '') return 'N/A';

    if (formatType === 'currency') {
        return typeof value === 'number' ? value.toFixed(2) : String(value);
    }
    if (formatType === 'largeNumber') {
        if (typeof value !== 'number') return String(value);
        if (Math.abs(value) >= 1e12) return (value / 1e12).toFixed(2) + ' T';
        if (Math.abs(value) >= 1e9) return (value / 1e9).toFixed(2) + ' B';
        if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(2) + ' M';
        return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); // No decimals for plain large numbers unless specified
    }
    if (formatType === 'percentage') {
        return typeof value === 'number' ? (value * 100).toFixed(2) + '%' : String(value);
    }
    if (formatType === 'ratio') {
        return typeof value === 'number' ? value.toFixed(2) : String(value);
    }
    return String(value); // Default to string
}

// Helper function (can be shared or duplicated from script.js if not using modules)
function camelCaseToTitleCase(text) {
    if (typeof text !== 'string') return '';
    if (text === 'eps') return 'EPS';
    if (text === 'ebitda') return 'EBITDA';
    const result = text.replace(/([A-Z]+)/g, " $1").replace(/^./, (str) => str.toUpperCase());
    return result.trim();
} 