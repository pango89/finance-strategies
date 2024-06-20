export const round = (num: number) => Math.round(num * 100) / 100;

export const calculateSMA = (data: number[], period: number): number[] => {
    const sma: number[] = [];
    let sum = 0;

    for (let i = 0; i < period; i++) {
        sum += data[i];
        sma.push(round(sum / (i + 1)));
    }

    for (let i = period; i < data.length; i++) {
        sum += data[i] - data[i - period];
        sma.push(round(sum / period));
    }

    return sma;
};

// Helper function to calculate EMA
export const calculateEMA = (data: number[], period: number): number[] => {
    const k = 2 / (period + 1);
    const ema: number[] = [data[0]]; // Start with the first price as the first EMA value

    for (let i = 1; i < data.length; i++) {
        ema.push(data[i] * k + ema[i - 1] * (1 - k));
    }

    return ema;
}

export const calculateRSI = (prices: number[], period: number): number[] => {
    const rsi: number[] = [];
    let gainSum = 0;
    let lossSum = 0;

    for (let i = 1; i < period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) {
            gainSum += change;
        } else {
            lossSum -= change;
        }
    }

    for (let i = period; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        let gain = 0;
        let loss = 0;

        if (change > 0) {
            gain = change;
        } else {
            loss = -change;
        }

        gainSum = (gainSum * (period - 1) + gain) / period;
        lossSum = (lossSum * (period - 1) + loss) / period;

        const rs = gainSum / lossSum;
        rsi.push(round(100 - 100 / (1 + rs)));
    }

    return rsi;
};

// Helper function to calculate the Momentum
export const calculateMomentum = (prices: number[], period: number): number[] => {
    const momentum: number[] = [];

    for (let i = period; i < prices.length; i++) {
        momentum.push(prices[i] - prices[i - period]);
    }

    return momentum;
}

export const delay = async (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

export const getDurationInDays = (startDate: string, endDate: string): number => {
    const d1 = new Date(startDate);
    const d2 = new Date(endDate);

    const days = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
    return days;
}

export const dateDiffInDays = (date1: Date, date2: Date): number => {
    const oneDay = 1000 * 60 * 60 * 24;
    return (date1.getTime() - date2.getTime()) / oneDay;
}

// Function to calculate the NPV for a given rate
const npv = (rate: number, cashFlows: number[], dates: Date[]): number => {
    const startDate = dates[0];
    return cashFlows.reduce((acc, cashFlow, i) => {
        const days = dateDiffInDays(dates[i], startDate);
        return acc + (cashFlow / Math.pow(1 + rate, days / 365));
    }, 0);
}

// Function to calculate the derivative of the NPV
const npvDerivative = (rate: number, cashFlows: number[], dates: Date[]): number => {
    const startDate = dates[0];
    return cashFlows.reduce((acc, cashFlow, i) => {
        const days = dateDiffInDays(dates[i], startDate);
        const fraction = days / 365;
        return acc - (fraction * cashFlow / Math.pow(1 + rate, fraction + 1));
    }, 0);
}

// Function to calculate the XIRR
export const xirr = (cashFlows: number[], dates: Date[], guess: number = 0.1): number => {
    if (cashFlows.length === 0) return 0;

    const tol = 1e-6;
    const maxIter = 1000;
    let rate = guess;

    for (let i = 0; i < maxIter; i++) {
        const npvValue = npv(rate, cashFlows, dates);
        const derivativeValue = npvDerivative(rate, cashFlows, dates);

        if (Math.abs(npvValue) < tol) {
            return round(100 * rate);
        }

        if (derivativeValue === 0) {
            throw new Error("XIRR derivative is zero; no solution found");
        }

        rate = rate - npvValue / derivativeValue;
    }

    throw new Error("XIRR did not converge");
}

// Calculate MACD
export const calculateMACD = (prices: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number) => {
    const macdResults: {
        macd: number;
        signal: number;
        histogram: number;
    }[] = [];

    const fastEMA = calculateEMA(prices, fastPeriod);
    const slowEMA = calculateEMA(prices, slowPeriod);

    const macdLine = fastEMA.map((value, index) => value - slowEMA[index]);
    const signalLine = calculateEMA(macdLine.slice(slowPeriod - 1), signalPeriod);

    for (let i = slowPeriod - 1; i < prices.length; i++) {
        const macd = macdLine[i];
        const signal = signalLine[i - slowPeriod + 1];
        const histogram = macd - signal;
        macdResults.push({
            macd,
            signal,
            histogram
        });
    }

    return macdResults;
}

export const getFYBeginDate = (dateString: string): string => {
    // Parse the input date string
    const inputDate = new Date(dateString);

    // Extract the year and month from the input date
    const year = inputDate.getFullYear();
    const month = inputDate.getMonth() + 1; // getMonth() returns 0-based month, so add 1

    // Determine the fiscal year based on the input date
    const fy = month >= 4 ? year : year - 1;

    // Construct the fiscal year begin date as 'YYYY-04-01'
    const fyBeginDate = new Date(fy, 3, 1); // Month is 0-based, so April is 3

    // Format the fiscal year begin date to 'YYYY-MM-DD'
    const formattedDate = fyBeginDate.toISOString().split('T')[0];

    return formattedDate;
};

export const getPreviousFYEndDate = (dateString: string): string => {
    // Parse the input date string
    const inputDate = new Date(dateString);

    // Extract the year and month from the input date
    const year = inputDate.getFullYear();
    const month = inputDate.getMonth() + 1; // getMonth() returns 0-based month, so add 1

    // Determine the fiscal year based on the input date
    const fy = month >= 4 ? year : year - 1;

    // Previous fiscal year end date is always March 31st of the determined fiscal year
    const previousFyEndDate = new Date(fy, 2, 31); // Month is 0-based, so March is 2

    // Format the fiscal year end date to 'YYYY-MM-DD'
    const formattedDate = previousFyEndDate.toISOString().split('T')[0];

    return formattedDate;
};

export const addDaysToDate = (dateString: string, days: number): string => {
    // Parse the input date string
    const date = new Date(dateString);

    // Add the specified number of days
    date.setDate(date.getDate() + days);

    // Format the new date to 'YYYY-MM-DD'
    const newDateString = date.toISOString().split('T')[0];

    return newDateString;
};

export const Infinity = 9999999999