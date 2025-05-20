# StockCompare: Stock Analysis & Comparison Website

## Description

StockCompare is a web application designed for comprehensive stock analysis and comparison. Users can search for stock tickers, view detailed financial data (including company profiles, income statements, balance sheets, cash flow statements, and key metrics), compare multiple stocks side-by-side, visualize financial trends through charts, and get AI-powered (rule-based) insights. The application features a modern, dark-themed interface with purple accents.

## Features

*   **Stock Ticker Search**: Autocomplete suggestions for stock tickers/company names using the Financial Modeling Prep (FMP) API.
*   **Detailed Financial Data Modal**:
    *   Company profile (price, industry, sector, CEO, description, etc.).
    *   Annual financial statements (Income, Balance Sheet, Cash Flow) for the last 5 periods.
    *   Key metrics and financial growth data.
    *   Interactive bar charts visualizing trends in financial statements and growth.
    *   Custom tooltips with explanations for financial metrics.
*   **Stock Comparison Page**:
    *   Compare up to 6 stocks simultaneously.
    *   Search and add stocks to a comparison list (persisted in `sessionStorage`).
    *   Detailed comparison table showing key metrics and latest annual financial data across selected stocks.
    *   Ability to chart a selected metric across all compared stocks.
    *   Tooltips for metric explanations in the table and chart dropdown.
*   **AI Stock Analysis Page**:
    *   Search for a stock to receive a rule-based "AI" analysis.
    *   Analysis includes a profile summary, highlights, and insights on valuation, profitability, financial health, growth, and potential risks.
*   **Detailed Stock Visualization Page**:
    *   Search for a stock to view multiple historical charts.
    *   Charts include:
        *   Income Statement Trends (10-year annual)
        *   Balance Sheet Trends (10-year annual)
        *   Cash Flow Trends (10-year annual)
        *   Valuation Ratios (10-year annual)
        *   Key Percentages (ROE, Dividend Yield - 10-year annual)
        *   Financial Health Ratios (10-year annual)
        *   Historical Stock Price (Last 1 year, daily)
*   **Responsive Design**: Dark theme with purple accents, aiming for a user-friendly experience.
*   **Interactive Charts**: Utilizes Chart.js for data visualization.

## Pages

*   `index.html`: Homepage with hero search, feature cards, and detailed stock data modal.
*   `compare.html`: Page for side-by-side stock comparison.
*   `ask_ai.html`: Page for generating rule-based AI analysis for a selected stock.
*   `visualize.html`: Page for displaying multiple detailed historical charts for a selected stock.

## Tech Stack

*   **Frontend**: HTML5, CSS3, JavaScript (ES6+)
*   **Charting Library**: Chart.js
*   **Icons**: Font Awesome
*   **Data Source**: [Financial Modeling Prep (FMP) API](https://financialmodelingprep.com/developer/docs/)

## Setup and API Key

1.  Clone or download the project files.
2.  **API Key**: This project requires a free API key from Financial Modeling Prep.
    *   You need to replace the placeholder API key `M3WCOsdd5MojVXueguoarO7fGe9Nkuba` with your own valid FMP API key.
    *   The API key is located at the top of the following JavaScript files:
        *   `script.js`
        *   `compare_script.js`
        *   `ask_ai_script.js`
        *   `visualize_script.js`
3.  Open `index.html` in your web browser to start the application.

## How to Use

*   **Homepage (`index.html`)**:
    *   Use the main search bar to find a stock. Suggestions will appear as you type.
    *   Click on a stock suggestion to view detailed financial information in a modal.
    *   Within the modal, toggle "Show/Hide Graphs" to see charts for the financial statements.
    *   Click the "Add to Compare" button on search results to add a stock to your comparison list for the `compare.html` page.
    *   Use the navigation bar to go to other pages.
    *   Feature cards link to "Compare", "Ask AI", and "Visualize" pages.
*   **Compare Page (`compare.html`)**:
    *   Search for stocks to add to the comparison (up to 6).
    *   Selected stocks appear as cards and in the main comparison table.
    *   Remove stocks individually or clear all.
    *   Select a metric from the dropdown and click "Chart Selected Metric" to see a bar chart comparing that metric across the chosen stocks.
*   **Ask AI Page (`ask_ai.html`)**:
    *   Search for a stock.
    *   Click on a suggestion to generate and display a rule-based analysis of the stock.
*   **Visualize Page (`visualize.html`)**:
    *   Search for a stock.
    *   Click on a suggestion to load and display various historical charts related to the stock's financials and price.

## Disclaimer

This project is for educational and demonstration purposes only. Financial data is provided by the FMP API and may have inaccuracies or delays. Always do your own research before making any investment decisions. 