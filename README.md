# Finance Calculator Suite

A comprehensive suite of financial planning calculators built with vanilla HTML, CSS, and JavaScript. Plan your path to Financial Independence and Retire Early (FIRE) using multiple calculation methods, detailed projections, and personalized recommendations.

## Calculators

### FIRE Calculator
The classic single-method FIRE calculator with 20+ input parameters across 5 categories — personal info, current finances, income & expenses, investment strategy, and additional factors like taxes, pensions, and healthcare.

### Multi-Method FIRE Calculator
Compare 5 different FIRE calculation approaches side by side:
- **Traditional 4% Rule** — Annual expenses x 25
- **Trinity Study Method** — Research-based variable withdrawal rates
- **Bengen Method (Dynamic)** — Inflation-adjusted withdrawals from William Bengen's original research
- **Modern Portfolio Theory** — Risk-adjusted approach considering volatility and asset allocation
- **Conservative FIRE** — Ultra-safe 3% withdrawal rate with buffers

### Retirement Planner
Comprehensive retirement planning with year-by-year income, expense, and investment projections.

## Features

- Real-time calculations with debouncing
- On-track/warning/danger status indicators
- Personalized recommendations engine
- Inflation and salary growth modeling
- Responsive design (desktop, tablet, mobile)
- Indian Rupee formatting

## Quick Start

Open `index.html` in any modern browser — no build tools or dependencies required.

## Tech Stack

- HTML5
- CSS3 (gradient backgrounds, responsive grid, glassmorphism)
- Vanilla JavaScript (ES6+, class-based architecture)

## Project Structure

```
financeCalculator/
├── index.html                    # Landing page with links to all calculators
├── script.js                     # FIRE calculator logic
├── styles.css                    # FIRE calculator styles
├── multi-method-calculator.html  # Multi-method FIRE calculator
├── multi-method-script.js        # Multi-method calculation logic
├── multi-method-styles.css       # Multi-method styles
├── retirement-planner/           # Retirement planner app
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── pages/
└── README.md
```

## Key Formulas

**FIRE Number:**
```
FIRE Number = Annual Expenses / Withdrawal Rate
```

**Future Value with Contributions:**
```
FV = PV * (1 + r)^n + PMT * [((1 + r)^n - 1) / r]
```

**Inflation-Adjusted Expenses:**
```
Future Expenses = Current Expenses * (1 + inflation_rate)^years
```

## Disclaimer

This calculator provides estimates for educational and planning purposes only. Market returns vary and past performance does not guarantee future results. Consult a qualified financial advisor before making major financial decisions.

## License

Free to use for personal financial planning.