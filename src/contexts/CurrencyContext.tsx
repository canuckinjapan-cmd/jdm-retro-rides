import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type CurrencyCode = 'GBP' | 'AUD' | 'JPY' | 'USD';

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  rates: Record<string, number>;
  convertPrice: (priceJPY: number) => { value: number; formatted: string };
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<CurrencyCode>('JPY');
  const [rates, setRates] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/JPY');
        const data = await response.json();
        setRates(data.rates);
      } catch (error) {
        console.error("Failed to fetch exchange rates", error);
      }
    };
    fetchRates();
  }, []);

  const convertPrice = (priceJPY: number) => {
    if (currency === 'JPY' || !rates[currency]) {
      return { 
        value: priceJPY, 
        formatted: new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(priceJPY) 
      };
    }
    
    const converted = priceJPY * rates[currency];
    const styles: Record<CurrencyCode, string> = {
      GBP: 'en-GB',
      AUD: 'en-AU',
      USD: 'en-US',
      JPY: 'ja-JP'
    };

    return {
      value: converted,
      formatted: new Intl.NumberFormat(styles[currency], { style: 'currency', currency: currency }).format(converted)
    };
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, convertPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
