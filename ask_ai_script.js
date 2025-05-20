const FMP_API_KEY = 'M3WCOsdd5MojVXueguoarO7fGe9Nkuba';

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('ai-stock-search-input');
    const searchButton = document.getElementById('ai-stock-search-button');
    const tickerResultsContainer = document.getElementById('ai-ticker-search-results');
    const analysisResultsContainer = document.getElementById('ai-analysis-results-container');

    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => {
            const searchTerm = searchInput.value.trim();
            if (searchTerm) performAISearch(searchTerm);
        });
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                const searchTerm = searchInput.value.trim();
                if (searchTerm) performAISearch(searchTerm);
            }
        });
    } else {
        console.error('AI search input or button not found.');
    }
});

async function performAISearch(searchTerm) {
    const tickerResultsContainer = document.getElementById('ai-ticker-search-results');
    const analysisResultsContainer = document.getElementById('ai-analysis-results-container');
    
    tickerResultsContainer.innerHTML = '<p style="padding: 1rem; text-align: center;">Finding stock...</p>';
    analysisResultsContainer.innerHTML = '<p style="padding: 1rem; text-align: center;">Preparing for analysis...</p>';

    // Step 1: Search for the ticker (similar to other pages)
    try {
        const searchUrl = `https://financialmodelingprep.com/api/v3/search-ticker?query=${encodeURIComponent(searchTerm)}&limit=5&exchange=NASDAQ,NYSE,AMEX,EURONEXT,TSX&apikey=${FMP_API_KEY}`;
        const response = await fetch(searchUrl);
        if (!response.ok) {
            const errorData = await response.json();
            tickerResultsContainer.innerHTML = `<p style="color:red; text-align:center;">Error: ${errorData.message || response.statusText}</p>`;
            analysisResultsContainer.innerHTML = '';
            return;
        }
        const tickerSuggestions = await response.json();
        displayAITickerSuggestions(tickerSuggestions);

    } catch (error) {
        tickerResultsContainer.innerHTML = `<p style="color:red; text-align:center;">Network error: ${error.message}</p>`;
        analysisResultsContainer.innerHTML = '';
        console.error("Network error during AI ticker search:", error);
    }
}

function displayAITickerSuggestions(results) {
    const container = document.getElementById('ai-ticker-search-results');
    container.innerHTML = '';
    if (!results || results.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">No stock tickers found.</p>';
        return;
    }

    results.forEach(stock => {
        const item = document.createElement('div');
        item.classList.add('ticker-result-item'); // Reuse existing style
        item.innerHTML = `
            <div class="ticker-result-item-content"> 
                <span class="symbol">${stock.symbol}</span>
                <span class="name">${stock.name} (${stock.stockExchange || 'N/A'})</span>
            </div>
        `;
        item.addEventListener('click', () => {
            container.innerHTML = ''; // Clear suggestions
            document.getElementById('ai-stock-search-input').value = `${stock.name} (${stock.symbol})`; // Update search bar
            fetchDataAndGenerateAIAnalysis(stock.symbol, stock.name);
        });
        container.appendChild(item);
    });
}

async function fetchDataAndGenerateAIAnalysis(ticker, companyName) {
    const analysisResultsContainer = document.getElementById('ai-analysis-results-container');
    analysisResultsContainer.innerHTML = `<h3 style="text-align:center;">Fetching data for ${companyName} (${ticker})...</h3>`;

    try {
        // Fetch all necessary data: profile, key-metrics (annual, TTM), financials (annual)
        const [profileData, keyMetricsAnnual, keyMetricsTTM, incomeStatementAnnual, balanceSheetAnnual, cashFlowAnnual, financialGrowthAnnual] = await Promise.all([
            fetchAIFinancialData(ticker, 'profile'),                            // Array, usually one item
            fetchAIFinancialData(ticker, 'key-metrics', { period: 'annual', limit: 1 }), // Array, latest annual
            fetchAIFinancialData(ticker, 'key-metrics-ttm', { limit: 1 }),             // Object TTM data
            fetchAIFinancialData(ticker, 'income-statement', { period: 'annual', limit: 1 }),
            fetchAIFinancialData(ticker, 'balance-sheet-statement', { period: 'annual', limit: 1 }),
            fetchAIFinancialData(ticker, 'cash-flow-statement', { period: 'annual', limit: 1 }),
            fetchAIFinancialData(ticker, 'financial-growth', { period: 'annual', limit: 1 })
        ]);

        analysisResultsContainer.innerHTML = `<h3 style="text-align:center;">Analyzing data for ${companyName} (${ticker})...</h3>`;

        // --- Placeholder for actual AI rule-based analysis logic ---
        const analysisOutput = generateRuleBasedAIInsights(
            ticker,
            companyName,
            profileData, 
            keyMetricsAnnual, 
            keyMetricsTTM,
            incomeStatementAnnual,
            balanceSheetAnnual,
            cashFlowAnnual,
            financialGrowthAnnual
        );
        
        displayAIAnalysis(analysisOutput);

    } catch (error) {
        analysisResultsContainer.innerHTML = `<p style="color:red; text-align:center;">Error fetching or analyzing data for ${ticker}: ${error.message}</p>`;
        console.error(`Error in fetchDataAndGenerateAIAnalysis for ${ticker}:`, error);
    }
}

async function fetchAIFinancialData(ticker, endpoint, params = {}) {
    let url = `https://financialmodelingprep.com/api/v3/${endpoint}/${ticker}?apikey=${FMP_API_KEY}`;
    if (params.period) url += `&period=${params.period}`;
    if (params.limit) url += `&limit=${params.limit}`;
    // For TTM, the API might not need period/limit, or it might be v4
    // FMP API v3 for key-metrics-ttm returns an object directly, not an array.
    // FMP API v3 for profile returns an array.

    const response = await fetch(url);
    if (!response.ok) {
        let errorMessage = response.statusText;
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || (errorData["Error Message"]) || errorMessage;
        } catch (e) { /* Ignore */ }
        throw new Error(`Failed to fetch ${endpoint} for ${ticker}: ${errorMessage}`);
    }
    const data = await response.json();
    // Handle FMP API inconsistencies: some endpoints return array for single result, some object.
    // For our use, we generally want the first element if it's an array, or the object itself.
    if (Array.isArray(data) && data.length > 0) return data; // Return array as is, processing will take first element
    if (!Array.isArray(data) && typeof data === 'object' && data !== null) return [data]; // Wrap object in array for consistency
    if (Array.isArray(data) && data.length === 0) return [{}]; // Return empty object in array if empty array from API
    return [{}]; // Default fallback for unexpected
}

function generateRuleBasedAIInsights(ticker, companyName, profile, keyMetricsA, keyMetricsTTM, incomeA, balanceA, cashflowA, growthA) {
    let insights = {
        companyName: companyName,
        symbol: ticker,
        profileSummary: "No profile summary generated yet.",
        valuation: [],
        profitability: [],
        financialHealth: [],
        growth: [],
        potentialRisks: [],
        highlights: []
    };

    const profileInfo = profile[0] || {};
    const metricsAnnual = keyMetricsA[0] || {};
    const metricsTTM = keyMetricsTTM[0] || {}; // TTM metrics are often not in an array from FMP
    const incomeAnnual = incomeA[0] || {};
    const balanceAnnual = balanceA[0] || {};
    const growthAnnual = growthA[0] || {};

    // Profile Summary
    insights.profileSummary = profileInfo.description || "No company description available.";
    if (profileInfo.sector && profileInfo.industry) {
        insights.highlights.push(`Operates in the ${profileInfo.industry} industry within the ${profileInfo.sector} sector.`);
    }
    if (profileInfo.price && profileInfo.currency) {
        insights.highlights.push(`Current stock price: ${profileInfo.price.toFixed(2)} ${profileInfo.currency}.`);
    }
    if (profileInfo.mktCap) {
        insights.highlights.push(`Market Capitalization: ${formatAINumber(profileInfo.mktCap)}.`);
    }

    // Valuation Insights (using TTM if available, fallback to annual)
    const peRatio = metricsTTM.peRatioTTM || metricsAnnual.peRatio;
    if (peRatio) {
        if (peRatio > 0 && peRatio < 15) insights.valuation.push(`P/E Ratio of ${peRatio.toFixed(2)} suggests potential undervaluation.`);
        else if (peRatio >= 15 && peRatio <= 25) insights.valuation.push(`P/E Ratio of ${peRatio.toFixed(2)} is within a typical range.`);
        else if (peRatio > 25) insights.valuation.push(`P/E Ratio of ${peRatio.toFixed(2)} may indicate overvaluation or high growth expectations.`);
        else insights.valuation.push(`P/E Ratio is ${peRatio.toFixed(2)}.`); 
    }
    const pbRatio = metricsTTM.priceToBookRatioTTM || metricsAnnual.priceToBookRatio;
    if (pbRatio) {
        if (pbRatio > 0 && pbRatio < 1) insights.valuation.push(`P/B Ratio of ${pbRatio.toFixed(2)} could indicate undervaluation.`);
        else if (pbRatio >=1 && pbRatio <=3 ) insights.valuation.push(`P/B Ratio of ${pbRatio.toFixed(2)} is in a moderate range.`);
        else if (pbRatio > 3) insights.valuation.push(`P/B Ratio of ${pbRatio.toFixed(2)} might suggest overvaluation.`);
         else insights.valuation.push(`P/B Ratio is ${pbRatio.toFixed(2)}.`);
    }
    const dividendYield = metricsTTM.dividendYieldTTM * 100 || metricsAnnual.dividendYield * 100; // FMP gives yield as decimal
    if (dividendYield) {
        if (dividendYield > 4) insights.highlights.push(`Offers a high dividend yield of ${dividendYield.toFixed(2)}%.`);
        else if (dividendYield > 0) insights.highlights.push(`Provides a dividend yield of ${dividendYield.toFixed(2)}%.`);
    }

    // Profitability
    const netProfitMargin = incomeAnnual.netIncomeRatio * 100; // FMP gives ratio as decimal
    if (netProfitMargin) {
        if (netProfitMargin > 20) insights.profitability.push(`Excellent net profit margin of ${netProfitMargin.toFixed(2)}%.`);
        else if (netProfitMargin > 10) insights.profitability.push(`Good net profit margin of ${netProfitMargin.toFixed(2)}%.`);
        else if (netProfitMargin > 0) insights.profitability.push(`Positive net profit margin of ${netProfitMargin.toFixed(2)}%.`);
        else insights.profitability.push(`Net profit margin is ${netProfitMargin.toFixed(2)}%. This indicates the company is not profitable on a net basis.`);
    }
    const roe = metricsAnnual.returnOnEquity * 100; // FMP gives ratio as decimal
    if (roe) {
        if (roe > 15) insights.profitability.push(`Strong Return on Equity (ROE) of ${roe.toFixed(2)}%.`);
        else if (roe > 5) insights.profitability.push(`Moderate Return on Equity (ROE) of ${roe.toFixed(2)}%.`);
        else insights.profitability.push(`Return on Equity (ROE) is ${roe.toFixed(2)}%.`);
    }

    // Financial Health
    const debtToEquity = metricsAnnual.debtToEquity;
    if (debtToEquity) {
        if (debtToEquity < 0.5) insights.financialHealth.push(`Low Debt-to-Equity ratio of ${debtToEquity.toFixed(2)} indicates good financial health.`);
        else if (debtToEquity <= 1) insights.financialHealth.push(`Moderate Debt-to-Equity ratio of ${debtToEquity.toFixed(2)}.`);
        else insights.financialHealth.push(`High Debt-to-Equity ratio of ${debtToEquity.toFixed(2)} suggests higher financial risk.`);
    }
    const currentRatio = metricsAnnual.currentRatio;
    if (currentRatio) {
        if (currentRatio > 2) insights.financialHealth.push(`Strong current ratio of ${currentRatio.toFixed(2)}, indicating good short-term liquidity.`);
        else if (currentRatio >= 1) insights.financialHealth.push(`Acceptable current ratio of ${currentRatio.toFixed(2)}.`);
        else insights.financialHealth.push(`Low current ratio of ${currentRatio.toFixed(2)} may suggest short-term liquidity risks.`);
    }

    // Growth (using financialGrowth statement)
    const revGrowth = growthAnnual.revenueGrowth * 100;
    if (revGrowth) {
        if (revGrowth > 15) insights.growth.push(`Excellent revenue growth of ${revGrowth.toFixed(2)}% year-over-year.`);
        else if (revGrowth > 5) insights.growth.push(`Solid revenue growth of ${revGrowth.toFixed(2)}% year-over-year.`);
        else if (revGrowth > 0) insights.growth.push(`Positive revenue growth of ${revGrowth.toFixed(2)}% year-over-year.`);
        else insights.growth.push(`Revenue declined by ${Math.abs(revGrowth).toFixed(2)}% year-over-year.`);
    }
    const netIncomeG = growthAnnual.netIncomeGrowth * 100;
    if (netIncomeG) {
        if (netIncomeG > 20) insights.growth.push(`Very strong net income growth of ${netIncomeG.toFixed(2)}% year-over-year.`);
        else if (netIncomeG > 10) insights.growth.push(`Good net income growth of ${netIncomeG.toFixed(2)}% year-over-year.`);
        else if (netIncomeG > 0) insights.growth.push(`Positive net income growth of ${netIncomeG.toFixed(2)}% year-over-year.`);
        else insights.growth.push(`Net income decreased by ${Math.abs(netIncomeG).toFixed(2)}% year-over-year.`);
        if (netIncomeG < 0 && revGrowth > 0) insights.potentialRisks.push("Net income is declining despite revenue growth, which could indicate rising costs or inefficiencies.");
    }

    // Simple Risk flags
    if (netProfitMargin < 0) insights.potentialRisks.push("Company is currently unprofitable (negative net profit margin).");
    if (debtToEquity > 1) insights.potentialRisks.push("High debt levels (Debt-to-Equity > 1) may pose a risk.");
    if (currentRatio < 1) insights.potentialRisks.push("Low current ratio (<1) suggests potential difficulty in meeting short-term obligations.");

    if (insights.valuation.length === 0) insights.valuation.push("Not enough data for a clear valuation signal.");
    if (insights.profitability.length === 0) insights.profitability.push("Profitability data limited.");
    if (insights.financialHealth.length === 0) insights.financialHealth.push("Financial health assessment limited by available data.");
    if (insights.growth.length === 0) insights.growth.push("Growth metrics limited or not showing a strong trend.");
    if (insights.highlights.length === 0) insights.highlights.push("No specific highlights generated based on available data.");

    return insights;
}

function displayAIAnalysis(insights) {
    const container = document.getElementById('ai-analysis-results-container');
    let html = `<div class="ai-analysis-content">`;
    html += `<h2>AI Analysis for ${insights.companyName} (${insights.symbol})</h2>`;

    html += `<h3><i class="fas fa-building"></i> Company Overview</h3>`;
    html += `<p>${insights.profileSummary}</p>`;

    html += `<h3><i class="fas fa-lightbulb"></i> Key Highlights</h3>`;
    if (insights.highlights.length > 0) {
        html += "<ul>";
        insights.highlights.forEach(item => html += `<li>${item}</li>`);
        html += "</ul>";
    } else {
        html += "<p>No specific highlights generated.</p>";
    }

    html += `<h3><i class="fas fa-chart-line"></i> Valuation</h3>`;
    if (insights.valuation.length > 0) {
        html += "<ul>";
        insights.valuation.forEach(item => html += `<li>${item}</li>`);
        html += "</ul>";
    } else {
        html += "<p>Valuation data not available or inconclusive.</p>";
    }

    html += `<h3><i class="fas fa-dollar-sign"></i> Profitability</h3>`;
    if (insights.profitability.length > 0) {
        html += "<ul>";
        insights.profitability.forEach(item => html += `<li>${item}</li>`);
        html += "</ul>";
    } else {
        html += "<p>Profitability data not available or inconclusive.</p>";
    }

    html += `<h3><i class="fas fa-shield-alt"></i> Financial Health</h3>`;
    if (insights.financialHealth.length > 0) {
        html += "<ul>";
        insights.financialHealth.forEach(item => html += `<li>${item}</li>`);
        html += "</ul>";
    } else {
        html += "<p>Financial health data not available or inconclusive.</p>";
    }

    html += `<h3><i class="fas fa-rocket"></i> Growth Prospects</h3>`;
    if (insights.growth.length > 0) {
        html += "<ul>";
        insights.growth.forEach(item => html += `<li>${item}</li>`);
        html += "</ul>";
    } else {
        html += "<p>Growth data not available or inconclusive.</p>";
    }

    html += `<h3><i class="fas fa-exclamation-triangle"></i> Potential Risks</h3>`;
    if (insights.potentialRisks.length > 0) {
        html += "<ul>";
        insights.potentialRisks.forEach(item => html += `<li>${item}</li>`);
        html += "</ul>";
    } else {
        html += "<p>No specific risks flagged based on this analysis.</p>";
    }

    html += "</div>";
    container.innerHTML = html;
}

// Helper function for formatting numbers in AI insights, similar to other formatters but maybe simpler for text.
function formatAINumber(value) {
    if (typeof value !== 'number') return String(value);
    if (Math.abs(value) >= 1e12) return (value / 1e12).toFixed(2) + ' Trillion';
    if (Math.abs(value) >= 1e9) return (value / 1e9).toFixed(2) + ' Billion';
    if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(2) + ' Million';
    return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Utility: Camel case to title case (can be shared if modularized later)
function camelCaseToTitleCase(text) {
    if (typeof text !== 'string') return '';
    if (text === 'eps') return 'EPS';
    if (text === 'ebitda') return 'EBITDA';
    const result = text.replace(/([A-Z]+)/g, " $1").replace(/^./, (str) => str.toUpperCase());
    return result.trim();
} 