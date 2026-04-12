// FIRE Calculator - Advanced Financial Independence Calculator
// All calculations and logic

class FIRECalculator {
    constructor() {
        this.inputs = {};
        this.results = {};
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const calculateBtn = document.getElementById('calculateBtn');
        const resetBtn = document.getElementById('resetBtn');

        calculateBtn.addEventListener('click', () => this.calculate());
        resetBtn.addEventListener('click', () => this.resetToDefaults());

        // Auto-calculate on input change (with debounce)
        const inputs = document.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            input.addEventListener('input', this.debounce(() => this.calculate(), 500));
        });
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
            currentSavings: parseFloat(document.getElementById('currentSavings').value) || 0,
            currentInvestments: parseFloat(document.getElementById('currentInvestments').value) || 0,
            currentDebt: parseFloat(document.getElementById('currentDebt').value) || 0,
            emergencyFund: parseFloat(document.getElementById('emergencyFund').value) || 0,
            annualIncome: parseFloat(document.getElementById('annualIncome').value) || 0,
            monthlyExpenses: parseFloat(document.getElementById('monthlyExpenses').value) || 0,
            monthlySavings: parseFloat(document.getElementById('monthlySavings').value) || 0,
            annualExpenseIncrease: parseFloat(document.getElementById('annualExpenseIncrease').value) || 3,
            expectedReturn: parseFloat(document.getElementById('expectedReturn').value) || 10,
            inflationRate: parseFloat(document.getElementById('inflationRate').value) || 6,
            withdrawalRate: parseFloat(document.getElementById('withdrawalRate').value) || 4,
            postRetirementReturn: parseFloat(document.getElementById('postRetirementReturn').value) || 7,
            taxRate: parseFloat(document.getElementById('taxRate').value) || 20,
            pensionIncome: parseFloat(document.getElementById('pensionIncome').value) || 0,
            healthcareCosts: parseFloat(document.getElementById('healthcareCosts').value) || 0,
            oneTimeLargeExpense: parseFloat(document.getElementById('oneTimeLargeExpense').value) || 0,
            annualSalaryIncrease: parseFloat(document.getElementById('annualSalaryIncrease').value) || 5
        };
    }

    calculate() {
        this.getInputValues();
        
        // Validate inputs
        if (!this.validateInputs()) {
            return;
        }

        // Calculate net worth
        const currentNetWorth = this.inputs.currentSavings + 
                                this.inputs.currentInvestments - 
                                this.inputs.currentDebt;

        // Calculate annual expenses at retirement (adjusted for inflation)
        const yearsToRetirement = this.inputs.retirementAge - this.inputs.currentAge;
        const annualExpensesNow = this.inputs.monthlyExpenses * 12;
        const healthcareAnnual = this.inputs.healthcareCosts * 12;
        
        // Future value of annual expenses considering inflation
        const annualExpensesAtRetirement = annualExpensesNow * 
            Math.pow(1 + this.inputs.annualExpenseIncrease / 100, yearsToRetirement);
        
        // Add healthcare costs
        const totalAnnualExpensesAtRetirement = annualExpensesAtRetirement + healthcareAnnual;
        
        // Subtract pension income
        const pensionAnnual = this.inputs.pensionIncome * 12;
        const netAnnualExpenses = totalAnnualExpensesAtRetirement - pensionAnnual;

        // Calculate FIRE number using the 4% rule (or custom withdrawal rate)
        const fireNumber = (netAnnualExpenses / (this.inputs.withdrawalRate / 100)) + 
                          this.inputs.oneTimeLargeExpense;

        // Calculate portfolio growth with monthly contributions
        let portfolioValue = currentNetWorth;
        const monthlyReturn = this.inputs.expectedReturn / 100 / 12;
        const monthsToRetirement = yearsToRetirement * 12;
        
        // Adjust monthly savings for salary increases
        let currentMonthlySavings = this.inputs.monthlySavings;
        
        for (let month = 1; month <= monthsToRetirement; month++) {
            // Add monthly contribution
            portfolioValue += currentMonthlySavings;
            // Apply monthly return
            portfolioValue *= (1 + monthlyReturn);
            
            // Adjust savings annually for salary increase
            if (month % 12 === 0) {
                currentMonthlySavings *= (1 + this.inputs.annualSalaryIncrease / 100);
            }
        }

        // Calculate if current path reaches FIRE
        const willReachFire = portfolioValue >= fireNumber;
        
        // Calculate required monthly savings to reach FIRE number
        const requiredMonthlySavings = this.calculateRequiredSavings(
            currentNetWorth, 
            fireNumber, 
            yearsToRetirement, 
            this.inputs.expectedReturn / 100
        );

        // Calculate actual years to FIRE with current savings rate
        const actualYearsToFire = this.calculateYearsToFire(
            currentNetWorth,
            fireNumber,
            this.inputs.monthlySavings,
            this.inputs.expectedReturn / 100,
            this.inputs.annualSalaryIncrease / 100
        );

        // Store results
        this.results = {
            fireNumber: fireNumber,
            yearsToRetirement: yearsToRetirement,
            actualYearsToFire: actualYearsToFire,
            fireAge: this.inputs.currentAge + actualYearsToFire,
            requiredMonthlySavings: requiredMonthlySavings,
            portfolioValue: portfolioValue,
            annualRetirementIncome: netAnnualExpenses,
            willReachFire: willReachFire,
            savingsRate: (this.inputs.monthlySavings * 12) / this.inputs.annualIncome * 100,
            currentNetWorth: currentNetWorth
        };

        this.displayResults();
        this.generateRecommendations();
    }

    calculateRequiredSavings(currentValue, targetValue, years, annualReturn) {
        if (years <= 0) return 0;
        
        const monthlyRate = annualReturn / 12;
        const months = years * 12;
        
        // Future value of current savings
        const futureValueOfCurrent = currentValue * Math.pow(1 + monthlyRate, months);
        
        // Amount needed from contributions
        const neededFromContributions = targetValue - futureValueOfCurrent;
        
        if (neededFromContributions <= 0) return 0;
        
        // Calculate monthly payment using future value of annuity formula
        const monthlyPayment = neededFromContributions / 
            (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate));
        
        return Math.max(0, monthlyPayment);
    }

    calculateYearsToFire(currentValue, targetValue, monthlySavings, annualReturn, salaryIncrease) {
        if (currentValue >= targetValue) return 0;
        if (monthlySavings <= 0) return Infinity;
        
        const monthlyRate = annualReturn / 12;
        let portfolio = currentValue;
        let currentMonthly = monthlySavings;
        let months = 0;
        const maxMonths = 600; // 50 years max
        
        while (portfolio < targetValue && months < maxMonths) {
            portfolio += currentMonthly;
            portfolio *= (1 + monthlyRate);
            months++;
            
            // Adjust for salary increase annually
            if (months % 12 === 0) {
                currentMonthly *= (1 + salaryIncrease);
            }
        }
        
        return months >= maxMonths ? Infinity : months / 12;
    }

    validateInputs() {
        if (this.inputs.currentAge >= this.inputs.retirementAge) {
            alert('Retirement age must be greater than current age');
            return false;
        }
        
        if (this.inputs.retirementAge >= this.inputs.lifeExpectancy) {
            alert('Life expectancy should be greater than retirement age');
            return false;
        }
        
        return true;
    }

    displayResults() {
        // Format numbers as currency
        const formatCurrency = (num) => {
            if (num === Infinity || isNaN(num)) return 'N/A';
            return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
        };

        const formatNumber = (num) => {
            if (num === Infinity || isNaN(num)) return 'N/A';
            return num.toLocaleString('en-IN', { maximumFractionDigits: 1 });
        };

        document.getElementById('fireNumber').textContent = formatCurrency(this.results.fireNumber);
        document.getElementById('yearsToFire').textContent = 
            this.results.actualYearsToFire === Infinity ? 'N/A' : formatNumber(this.results.actualYearsToFire) + ' years';
        document.getElementById('fireAge').textContent = 
            this.results.fireAge === Infinity ? 'N/A' : Math.round(this.results.fireAge) + ' years';
        document.getElementById('requiredSavings').textContent = formatCurrency(this.results.requiredMonthlySavings);
        document.getElementById('retirementIncome').textContent = formatCurrency(this.results.annualRetirementIncome);
        document.getElementById('portfolioValue').textContent = formatCurrency(this.results.portfolioValue);

        // Update status card
        this.updateStatusCard();
    }

    updateStatusCard() {
        const statusCard = document.getElementById('statusCard');
        const statusTitle = document.getElementById('statusTitle');
        const statusMessage = document.getElementById('statusMessage');

        // Remove existing classes
        statusCard.classList.remove('success', 'warning', 'danger');

        if (this.results.willReachFire) {
            statusCard.classList.add('success');
            statusTitle.textContent = '🎉 On Track to FIRE!';
            statusMessage.textContent = `Excellent! Based on your current savings rate and investment returns, you're projected to reach financial independence. Your portfolio is expected to grow to ${this.formatCurrency(this.results.portfolioValue)} by age ${this.inputs.retirementAge}, which exceeds your FIRE number of ${this.formatCurrency(this.results.fireNumber)}.`;
        } else if (this.results.actualYearsToFire < this.results.yearsToRetirement + 10) {
            statusCard.classList.add('warning');
            statusTitle.textContent = '⚠️ Close to Target';
            statusMessage.textContent = `You're close to reaching FIRE, but may need to make some adjustments. With your current savings rate, you'll reach your FIRE number in approximately ${this.results.actualYearsToFire.toFixed(1)} years. Consider increasing your savings rate or adjusting your retirement expenses to reach your goal sooner.`;
        } else {
            statusCard.classList.add('danger');
            statusTitle.textContent = '📊 Needs Adjustment';
            statusMessage.textContent = `Your current plan may not reach your FIRE goal by the target age. You need to save approximately ${this.formatCurrency(this.results.requiredMonthlySavings)} per month to reach financial independence by age ${this.inputs.retirementAge}. Consider increasing your income, reducing expenses, or adjusting your retirement age.`;
        }
    }

    generateRecommendations() {
        const recommendations = [];
        const savingsRate = this.results.savingsRate;

        // Savings rate recommendations
        if (savingsRate < 20) {
            recommendations.push('Increase your savings rate to at least 20% of your income. Currently at ' + savingsRate.toFixed(1) + '%');
        } else if (savingsRate < 50) {
            recommendations.push('Good savings rate at ' + savingsRate.toFixed(1) + '%. Try to reach 50% for faster FIRE');
        } else {
            recommendations.push('Excellent savings rate of ' + savingsRate.toFixed(1) + '%! Keep up the great work!');
        }

        // Emergency fund recommendation
        const emergencyMonths = this.inputs.emergencyFund / this.inputs.monthlyExpenses;
        if (emergencyMonths < 6) {
            recommendations.push('Build an emergency fund covering 6-12 months of expenses. Currently: ' + emergencyMonths.toFixed(1) + ' months');
        }

        // Debt recommendation
        if (this.inputs.currentDebt > 0) {
            recommendations.push('Consider paying off high-interest debt before aggressive investing. Current debt: ' + this.formatCurrency(this.inputs.currentDebt));
        }

        // Investment return reality check
        if (this.inputs.expectedReturn > 12) {
            recommendations.push('Expected return of ' + this.inputs.expectedReturn + '% may be optimistic. Historical market average is 8-10%');
        }

        // Withdrawal rate check
        if (this.inputs.withdrawalRate > 4) {
            recommendations.push('Withdrawal rate above 4% may not be sustainable long-term. Consider using 3-4% for safety');
        }

        // Healthcare costs
        if (this.inputs.healthcareCosts < 10000) {
            recommendations.push('Healthcare costs in retirement may be underestimated. Plan for inflation and aging');
        }

        // Investment diversification
        recommendations.push('Diversify investments across stocks, bonds, and other assets to manage risk');

        // Tax optimization
        if (this.inputs.taxRate > 15) {
            recommendations.push('Explore tax-advantaged accounts (PPF, NPS, ELSS) to reduce tax burden');
        }

        // Income growth
        recommendations.push('Continue investing in skills and career growth to increase earning potential');

        // Display recommendations
        const recommendationsList = document.getElementById('recommendationsList');
        recommendationsList.innerHTML = '';
        recommendations.forEach(rec => {
            const li = document.createElement('li');
            li.textContent = rec;
            recommendationsList.appendChild(li);
        });
    }

    formatCurrency(num) {
        if (num === Infinity || isNaN(num)) return 'N/A';
        return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }

    resetToDefaults() {
        document.getElementById('currentAge').value = 30;
        document.getElementById('retirementAge').value = 45;
        document.getElementById('lifeExpectancy').value = 85;
        document.getElementById('currentSavings').value = 100000;
        document.getElementById('currentInvestments').value = 200000;
        document.getElementById('currentDebt').value = 0;
        document.getElementById('emergencyFund').value = 150000;
        document.getElementById('annualIncome').value = 1200000;
        document.getElementById('monthlyExpenses').value = 40000;
        document.getElementById('monthlySavings').value = 50000;
        document.getElementById('annualExpenseIncrease').value = 3;
        document.getElementById('expectedReturn').value = 10;
        document.getElementById('inflationRate').value = 6;
        document.getElementById('withdrawalRate').value = 4;
        document.getElementById('postRetirementReturn').value = 7;
        document.getElementById('taxRate').value = 20;
        document.getElementById('pensionIncome').value = 0;
        document.getElementById('healthcareCosts').value = 10000;
        document.getElementById('oneTimeLargeExpense').value = 0;
        document.getElementById('annualSalaryIncrease').value = 5;

        this.calculate();
    }
}

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const calculator = new FIRECalculator();
    // Initial calculation with default values
    calculator.calculate();
});
