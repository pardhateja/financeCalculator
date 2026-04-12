// Multi-Method FIRE Calculator - Enhanced Version
// Implements 5 different FIRE calculation methodologies with detailed breakdowns

class MultiMethodFIRECalculator {
    constructor() {
        this.inputs = {};
        this.results = {};
        this.initializeEventListeners();
        this.initializeTabs();
    }

    initializeEventListeners() {
        const calculateBtn = document.getElementById('calculateBtn');
        const resetBtn = document.getElementById('resetBtn');

        calculateBtn.addEventListener('click', () => this.calculateAllMethods());
        resetBtn.addEventListener('click', () => this.resetToDefaults());

        // Auto-calculate on input change
        const inputs = document.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            input.addEventListener('input', this.debounce(() => this.calculateAllMethods(), 500));
        });
    }

    initializeTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tabBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const method = e.target.dataset.method;
                this.filterMethods(method);
            });
        });
    }

    filterMethods(method) {
        const methodCards = document.querySelectorAll('.method-card');
        
        if (method === 'all') {
            methodCards.forEach(card => card.classList.remove('hidden'));
        } else {
            methodCards.forEach(card => {
                if (card.dataset.method === method) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            });
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    getInputValues() {
        this.inputs = {
            currentAge: parseFloat(document.getElementById('currentAge').value) || 30,
            retirementAge: parseFloat(document.getElementById('retirementAge').value) || 45,
            lifeExpectancy: parseFloat(document.getElementById('lifeExpectancy').value) || 85,
            currentNetWorth: parseFloat(document.getElementById('currentNetWorth').value) || 0,
            monthlyInvestment: parseFloat(document.getElementById('monthlyInvestment').value) || 0,
            annualIncome: parseFloat(document.getElementById('annualIncome').value) || 0,
            monthlyExpenses: parseFloat(document.getElementById('monthlyExpenses').value) || 0,
            annualExpenses: parseFloat(document.getElementById('annualExpenses').value) || 0,
            annualSavings: parseFloat(document.getElementById('annualSavings').value) || 0,
            emergencyFund: parseFloat(document.getElementById('emergencyFund').value) || 0,
            expectedReturn: parseFloat(document.getElementById('expectedReturn').value) || 10,
            postRetirementReturn: parseFloat(document.getElementById('postRetirementReturn').value) || 7,
            inflationRate: parseFloat(document.getElementById('inflationRate').value) || 6,
            taxRate: parseFloat(document.getElementById('taxRate').value) || 20,
            assetAllocation: parseFloat(document.getElementById('assetAllocation').value) || 70,
            pensionIncome: parseFloat(document.getElementById('pensionIncome').value) || 0,
            healthcareCosts: parseFloat(document.getElementById('healthcareCosts').value) || 0,
            oneTimeLumpsum: parseFloat(document.getElementById('oneTimeLumpsum').value) || 0,
            expenseGrowth: parseFloat(document.getElementById('expenseGrowth').value) || 3,
            salaryGrowth: parseFloat(document.getElementById('salaryGrowth').value) || 5,
            partTimeIncome: parseFloat(document.getElementById('partTimeIncome').value) || 0
        };
    }

    calculateAllMethods() {
        this.getInputValues();
        
        const yearsToRetirement = this.inputs.retirementAge - this.inputs.currentAge;
        const retirementYears = this.inputs.lifeExpectancy - this.inputs.retirementAge;
        
        // Calculate inflation-adjusted expenses
        const futureAnnualExpenses = this.inputs.annualExpenses * 
            Math.pow(1 + this.inputs.expenseGrowth / 100, yearsToRetirement);
        
        // Add healthcare costs
        const totalAnnualExpensesAtRetirement = futureAnnualExpenses + this.inputs.healthcareCosts;
        
        // Subtract pension and part-time income
        const netAnnualExpenses = totalAnnualExpensesAtRetirement - 
            this.inputs.pensionIncome - this.inputs.partTimeIncome;

        // Method 1: Traditional 4% Rule
        const traditional = this.calculateTraditional4Percent(netAnnualExpenses, yearsToRetirement, futureAnnualExpenses);
        
        // Method 2: Trinity Study Method
        const trinity = this.calculateTrinityStudy(netAnnualExpenses, retirementYears, yearsToRetirement, futureAnnualExpenses);
        
        // Method 3: Bengen Method
        const bengen = this.calculateBengenMethod(netAnnualExpenses, yearsToRetirement, futureAnnualExpenses);
        
        // Method 4: Modern Portfolio Theory
        const modern = this.calculateModernPortfolio(netAnnualExpenses, yearsToRetirement, futureAnnualExpenses);
        
        // Method 5: Conservative FIRE
        const conservative = this.calculateConservative(netAnnualExpenses, yearsToRetirement, futureAnnualExpenses);

        this.results = {
            traditional,
            trinity,
            bengen,
            modern,
            conservative
        };

        this.displayAllResults();
        this.updateComparisonTable();
        this.generateRecommendations();
    }

    // Method 1: Traditional 4% Rule
    calculateTraditional4Percent(netAnnualExpenses, yearsToRetirement, futureExpenses) {
        const fireNumber = netAnnualExpenses * 25 + this.inputs.oneTimeLumpsum;
        const yearsToFire = this.calculateYearsToReach(fireNumber);
        const monthlyNeeded = this.calculateMonthlyInvestmentNeeded(fireNumber, yearsToRetirement);
        
        const breakdown = [
            `<div><span class="step-label">Step 1:</span> Future Annual Expenses = ${this.formatCurrency(futureExpenses)}</div>`,
            `<div><span class="step-label">Step 2:</span> Add Healthcare = ${this.formatCurrency(this.inputs.healthcareCosts)}</div>`,
            `<div><span class="step-label">Step 3:</span> Subtract Passive Income = ${this.formatCurrency(this.inputs.pensionIncome + this.inputs.partTimeIncome)}</div>`,
            `<div><span class="step-label">Step 4:</span> Net Expenses = <span class="step-value">${this.formatCurrency(netAnnualExpenses)}</span></div>`,
            `<div><span class="step-label">Step 5:</span> FIRE Number = Net Expenses × 25 = <span class="step-value">${this.formatCurrency(fireNumber)}</span></div>`,
            `<div><span class="step-label">Current Net Worth:</span> ${this.formatCurrency(this.inputs.currentNetWorth)}</div>`,
            `<div><span class="step-label">Gap to Close:</span> <span class="step-value">${this.formatCurrency(Math.max(0, fireNumber - this.inputs.currentNetWorth))}</span></div>`
        ];
        
        return {
            fireNumber,
            yearsToFire,
            fireAge: this.inputs.currentAge + yearsToFire,
            withdrawalRate: 4.0,
            monthlyNeeded,
            breakdown: breakdown.join('')
        };
    }

    // Method 2: Trinity Study Method
    calculateTrinityStudy(netAnnualExpenses, retirementYears, yearsToRetirement, futureExpenses) {
        let withdrawalRate;
        if (retirementYears >= 30) {
            withdrawalRate = 3.5;
        } else if (retirementYears >= 20) {
            withdrawalRate = 4.0;
        } else {
            withdrawalRate = 5.0;
        }
        
        const fireNumber = (netAnnualExpenses / (withdrawalRate / 100)) + this.inputs.oneTimeLumpsum;
        const yearsToFire = this.calculateYearsToReach(fireNumber);
        const monthlyNeeded = this.calculateMonthlyInvestmentNeeded(fireNumber, yearsToRetirement);
        
        const breakdown = [
            `<div><span class="step-label">Retirement Duration:</span> ${retirementYears} years</div>`,
            `<div><span class="step-label">Assigned SWR:</span> ${withdrawalRate}% (based on duration)</div>`,
            `<div><span class="step-label">Future Annual Expenses:</span> ${this.formatCurrency(futureExpenses)}</div>`,
            `<div><span class="step-label">Net Expenses:</span> ${this.formatCurrency(netAnnualExpenses)}</div>`,
            `<div><span class="step-label">Formula:</span> FIRE Number = Expenses ÷ (SWR ÷ 100)</div>`,
            `<div><span class="step-label">FIRE Number:</span> <span class="step-value">${this.formatCurrency(fireNumber)}</span></div>`,
            `<div><span class="step-label">Gap to Close:</span> <span class="step-value">${this.formatCurrency(Math.max(0, fireNumber - this.inputs.currentNetWorth))}</span></div>`
        ];
        
        return {
            fireNumber,
            yearsToFire,
            fireAge: this.inputs.currentAge + yearsToFire,
            withdrawalRate,
            monthlyNeeded,
            breakdown: breakdown.join('')
        };
    }

    // Method 3: Bengen Method
    calculateBengenMethod(netAnnualExpenses, yearsToRetirement, futureExpenses) {
        const initialWithdrawalRate = 4.3;
        const fireNumber = (netAnnualExpenses / (initialWithdrawalRate / 100)) + this.inputs.oneTimeLumpsum;
        const yearsToFire = this.calculateYearsToReach(fireNumber);
        const initialWithdrawal = fireNumber * (initialWithdrawalRate / 100);
        const monthlyNeeded = this.calculateMonthlyInvestmentNeeded(fireNumber, yearsToRetirement);
        
        const breakdown = [
            `<div><span class="step-label">Method:</span> William Bengen's 1994 research</div>`,
            `<div><span class="step-label">Initial SWR:</span> 4.3%</div>`,
            `<div><span class="step-label">Net Annual Expenses:</span> ${this.formatCurrency(netAnnualExpenses)}</div>`,
            `<div><span class="step-label">FIRE Number:</span> <span class="step-value">${this.formatCurrency(fireNumber)}</span></div>`,
            `<div><span class="step-label">Year 1 Withdrawal:</span> ${this.formatCurrency(initialWithdrawal)}</div>`,
            `<div><span class="step-label">Future Years:</span> Adjusted for ${this.inputs.inflationRate}% inflation</div>`,
            `<div><span class="step-label">Gap to Close:</span> <span class="step-value">${this.formatCurrency(Math.max(0, fireNumber - this.inputs.currentNetWorth))}</span></div>`
        ];
        
        return {
            fireNumber,
            yearsToFire,
            fireAge: this.inputs.currentAge + yearsToFire,
            withdrawalRate: initialWithdrawalRate,
            initialWithdrawal,
            monthlyNeeded,
            breakdown: breakdown.join('')
        };
    }

    // Method 4: Modern Portfolio Theory
    calculateModernPortfolio(netAnnualExpenses, yearsToRetirement, futureExpenses) {
        const volatilityBuffer = 0.20;
        const baseFireNumber = netAnnualExpenses * 25;
        const fireNumber = (baseFireNumber * (1 + volatilityBuffer)) + this.inputs.oneTimeLumpsum;
        const riskBuffer = fireNumber - baseFireNumber - this.inputs.oneTimeLumpsum;
        const yearsToFire = this.calculateYearsToReach(fireNumber);
        const monthlyNeeded = this.calculateMonthlyInvestmentNeeded(fireNumber, yearsToRetirement);
        
        const breakdown = [
            `<div><span class="step-label">Base Calculation:</span> ${this.formatCurrency(baseFireNumber)} (expenses × 25)</div>`,
            `<div><span class="step-label">Volatility Buffer:</span> 20% for market risk</div>`,
            `<div><span class="step-label">Risk Buffer Amount:</span> ${this.formatCurrency(riskBuffer)}</div>`,
            `<div><span class="step-label">Stock Allocation:</span> ${this.inputs.assetAllocation}%</div>`,
            `<div><span class="step-label">One-Time Expenses:</span> ${this.formatCurrency(this.inputs.oneTimeLumpsum)}</div>`,
            `<div><span class="step-label">Total FIRE Number:</span> <span class="step-value">${this.formatCurrency(fireNumber)}</span></div>`,
            `<div><span class="step-label">Gap to Close:</span> <span class="step-value">${this.formatCurrency(Math.max(0, fireNumber - this.inputs.currentNetWorth))}</span></div>`
        ];
        
        return {
            fireNumber,
            yearsToFire,
            fireAge: this.inputs.currentAge + yearsToFire,
            withdrawalRate: 4.0,
            riskBuffer,
            monthlyNeeded,
            breakdown: breakdown.join('')
        };
    }

    // Method 5: Conservative FIRE
    calculateConservative(netAnnualExpenses, yearsToRetirement, futureExpenses) {
        const conservativeRate = 3.0;
        const baseFireNumber = netAnnualExpenses / (conservativeRate / 100);
        const emergencyCushion = 0.10;
        const fireNumber = (baseFireNumber * (1 + emergencyCushion)) + this.inputs.oneTimeLumpsum;
        const yearsToFire = this.calculateYearsToReach(fireNumber);
        const monthlyNeeded = this.calculateMonthlyInvestmentNeeded(fireNumber, yearsToRetirement);
        
        const breakdown = [
            `<div><span class="step-label">Conservative SWR:</span> 3.0% (ultra-safe)</div>`,
            `<div><span class="step-label">Base FIRE Number:</span> ${this.formatCurrency(baseFireNumber)}</div>`,
            `<div><span class="step-label">Emergency Cushion:</span> 10% additional buffer</div>`,
            `<div><span class="step-label">Emergency Fund:</span> ${this.formatCurrency(this.inputs.emergencyFund)}</div>`,
            `<div><span class="step-label">One-Time Expenses:</span> ${this.formatCurrency(this.inputs.oneTimeLumpsum)}</div>`,
            `<div><span class="step-label">Total FIRE Number:</span> <span class="step-value">${this.formatCurrency(fireNumber)}</span></div>`,
            `<div><span class="step-label">Gap to Close:</span> <span class="step-value">${this.formatCurrency(Math.max(0, fireNumber - this.inputs.currentNetWorth))}</span></div>`
        ];
        
        return {
            fireNumber,
            yearsToFire,
            fireAge: this.inputs.currentAge + yearsToFire,
            withdrawalRate: conservativeRate,
            monthlyNeeded,
            breakdown: breakdown.join('')
        };
    }

    calculateMonthlyInvestmentNeeded(targetAmount, years) {
        if (years <= 0) return 0;
        
        const currentValue = this.inputs.currentNetWorth;
        const monthlyRate = this.inputs.expectedReturn / 100 / 12;
        const months = years * 12;
        
        // Future value of current investment
        const futureValueCurrent = currentValue * Math.pow(1 + monthlyRate, months);
        
        // Amount needed from future contributions
        const neededFromContributions = targetAmount - futureValueCurrent;
        
        if (neededFromContributions <= 0) return 0;
        
        // Calculate monthly payment using FV of annuity formula
        const monthlyPayment = neededFromContributions / 
            (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate));
        
        return Math.max(0, monthlyPayment);
    }

    calculateYearsToReach(targetAmount) {
        const currentValue = this.inputs.currentNetWorth;
        const monthlyInvestment = this.inputs.monthlyInvestment;
        const annualReturn = this.inputs.expectedReturn / 100;
        const salaryGrowth = this.inputs.salaryGrowth / 100;
        
        if (currentValue >= targetAmount) return 0;
        if (monthlyInvestment <= 0) return Infinity;
        
        const monthlyRate = annualReturn / 12;
        let portfolio = currentValue;
        let currentMonthly = monthlyInvestment;
        let months = 0;
        const maxMonths = 600;
        
        while (portfolio < targetAmount && months < maxMonths) {
            portfolio += currentMonthly;
            portfolio *= (1 + monthlyRate);
            months++;
            
            // Adjust for salary increase annually
            if (months % 12 === 0) {
                currentMonthly *= (1 + salaryGrowth);
            }
        }
        
        return months >= maxMonths ? Infinity : months / 12;
    }

    displayAllResults() {
        // Traditional 4%
        this.displayMethodResults('traditional', this.results.traditional);
        
        // Trinity Study
        this.displayMethodResults('trinity', this.results.trinity);
        
        // Bengen Method
        this.displayMethodResults('bengen', this.results.bengen);
        
        // Modern Portfolio
        this.displayMethodResults('modern', this.results.modern);
        
        // Conservative
        this.displayMethodResults('conservative', this.results.conservative);
    }

    displayMethodResults(method, results) {
        document.getElementById(`${method}-fire`).textContent = 
            this.formatCurrency(results.fireNumber);
        document.getElementById(`${method}-years`).textContent = 
            results.yearsToFire === Infinity ? 'N/A' : results.yearsToFire.toFixed(1) + ' years';
        document.getElementById(`${method}-age`).textContent = 
            results.fireAge === Infinity ? 'N/A' : Math.round(results.fireAge) + ' years';
        document.getElementById(`${method}-monthly`).textContent = 
            this.formatCurrency(results.monthlyNeeded);
        
        // Update breakdown
        const breakdownEl = document.querySelector(`#${method}-breakdown .breakdown-steps`);
        if (breakdownEl) {
            breakdownEl.innerHTML = results.breakdown;
        }
    }

    updateComparisonTable() {
        const tbody = document.getElementById('comparisonTableBody');
        tbody.innerHTML = '';
        
        const methods = [
            { name: 'Traditional 4%', key: 'traditional', safety: 'medium' },
            { name: 'Trinity Study', key: 'trinity', safety: 'medium' },
            { name: 'Bengen Method', key: 'bengen', safety: 'medium' },
            { name: 'Modern Portfolio', key: 'modern', safety: 'high' },
            { name: 'Conservative', key: 'conservative', safety: 'high' }
        ];
        
        methods.forEach(method => {
            const result = this.results[method.key];
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td><strong>${method.name}</strong></td>
                <td>${this.formatCurrency(result.fireNumber)}</td>
                <td>${result.yearsToFire === Infinity ? 'N/A' : result.yearsToFire.toFixed(1) + ' years'}</td>
                <td>${result.fireAge === Infinity ? 'N/A' : Math.round(result.fireAge) + ' years'}</td>
                <td><span class="safety-level safety-${method.safety}">${method.safety.toUpperCase()}</span></td>
            `;
            
            tbody.appendChild(row);
        });
    }

    generateRecommendations() {
        const recommendationDiv = document.getElementById('methodRecommendation');
        
        const savingsRate = (this.inputs.annualSavings / this.inputs.annualIncome) * 100;
        const retirementYears = this.inputs.lifeExpectancy - this.inputs.retirementAge;
        const monthlyInvestmentRate = (this.inputs.monthlyInvestment * 12 / this.inputs.annualIncome) * 100;
        
        let recommendation = '<p>';
        
        // Age-based recommendation
        if (this.inputs.currentAge < 35) {
            recommendation += '<strong>For your age group:</strong> The <strong>Traditional 4% Rule</strong> or <strong>Bengen Method</strong> may work well since you have time to weather market volatility.<br><br>';
        } else if (this.inputs.currentAge < 50) {
            recommendation += '<strong>For your age group:</strong> Consider the <strong>Trinity Study Method</strong> or <strong>Modern Portfolio Theory</strong> for a balanced approach.<br><br>';
        } else {
            recommendation += '<strong>For your age group:</strong> The <strong>Conservative FIRE</strong> method is recommended to minimize risk near retirement.<br><br>';
        }
        
        // Duration-based recommendation
        if (retirementYears > 35) {
            recommendation += '<strong>Long retirement duration:</strong> Your retirement could last 35+ years. Use the <strong>Conservative FIRE</strong> or <strong>Modern Portfolio</strong> method for extra safety.<br><br>';
        } else if (retirementYears > 25) {
            recommendation += '<strong>Standard retirement duration:</strong> The <strong>Trinity Study</strong> or <strong>Traditional 4%</strong> methods are well-suited for your timeline.<br><br>';
        } else {
            recommendation += '<strong>Shorter retirement duration:</strong> You can likely use the <strong>Trinity Study</strong> method with a higher withdrawal rate.<br><br>';
        }
        
        // Investment rate feedback
        if (monthlyInvestmentRate > 0) {
            recommendation += `<strong>Current Investment Rate:</strong> You're investing ${monthlyInvestmentRate.toFixed(1)}% of your income monthly. `;
            if (monthlyInvestmentRate >= 40) {
                recommendation += 'Excellent! This high rate will accelerate your FIRE journey.<br><br>';
            } else if (monthlyInvestmentRate >= 20) {
                recommendation += 'Good progress. Consider increasing to 40%+ for faster FIRE.<br><br>';
            } else {
                recommendation += 'Try to increase this to at least 30-40% of income.<br><br>';
            }
        }
        
        recommendation += '<ul>';
        recommendation += '<li><strong>Most Aggressive:</strong> Traditional 4% Rule - Fastest to FIRE but moderate risk</li>';
        recommendation += '<li><strong>Research-Based:</strong> Trinity Study or Bengen Method - Well-documented success rates</li>';
        recommendation += '<li><strong>Balanced:</strong> Modern Portfolio Theory - Accounts for market volatility</li>';
        recommendation += '<li><strong>Most Conservative:</strong> Conservative FIRE - Highest success probability, takes longest</li>';
        recommendation += '</ul></p>';
        
        recommendationDiv.innerHTML = recommendation;
    }

    formatCurrency(num) {
        if (num === Infinity || isNaN(num)) return 'N/A';
        return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }

    resetToDefaults() {
        document.getElementById('currentAge').value = 27;
        document.getElementById('retirementAge').value = 35;
        document.getElementById('lifeExpectancy').value = 85;
        document.getElementById('currentNetWorth').value = 5000000;
        document.getElementById('monthlyInvestment').value = 140000;
        document.getElementById('annualIncome').value = 3400000;
        document.getElementById('monthlyExpenses').value = 40000;
        document.getElementById('annualExpenses').value = 1200000;
        document.getElementById('annualSavings').value = 1680000;
        document.getElementById('emergencyFund').value = 240000;
        document.getElementById('expectedReturn').value = 12;
        document.getElementById('postRetirementReturn').value = 10;
        document.getElementById('inflationRate').value = 6;
        document.getElementById('taxRate').value = 20;
        document.getElementById('assetAllocation').value = 70;
        document.getElementById('pensionIncome').value = 0;
        document.getElementById('healthcareCosts').value = 120000;
        document.getElementById('oneTimeLumpsum').value = 0;
        document.getElementById('expenseGrowth').value = 3;
        document.getElementById('salaryGrowth').value = 5;
        document.getElementById('partTimeIncome').value = 0;

        this.calculateAllMethods();
    }
}

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const calculator = new MultiMethodFIRECalculator();
    calculator.calculateAllMethods();
});
