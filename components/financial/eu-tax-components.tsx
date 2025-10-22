"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Info,
  AlertCircle,
  CheckCircle,
  Globe,
  DollarSign,
  Percent,
  Calculator,
  Building2
} from "lucide-react";
import {
  Country,
  calculateTotalTax,
  formatCurrency,
  TAX_CONFIGS
} from "../../lib/tax-calculator";
import {
  getAllEUCountries,
  getEUTaxConfig,
  calculateEUIndividualTax,
  calculateEUCorporateTax
} from "../../lib/eu-tax-data";

// Color palette for charts
const CHART_COLORS = {
  incomeTax: "#ef4444", // red-500
  socialSecurity: "#f97316", // orange-500
  capitalGains: "#eab308", // yellow-500
  dividendTax: "#84cc16", // lime-500
  vatGst: "#06b6d4", // cyan-500
  corporateTax: "#8b5cf6", // violet-500
  netIncome: "#10b981", // emerald-500
};

/**
 * Enhanced Country Selector with EU Grouping
 */
interface CountryOption {
  value: Country;
  label: string;
  region: string;
  euMember: boolean;
  flag: string;
}

export function EUCountrySelector({
  value,
  onChange,
  className = ""
}: {
  value: Country;
  onChange: (country: Country) => void;
  className?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const euCountries = getAllEUCountries();

  const countries: CountryOption[] = useMemo(() => {
    const allCountries = Object.keys(TAX_CONFIGS) as Country[];
    
    return allCountries.map(country => ({
      value: country,
      label: country,
      region: euCountries.includes(country as any) ? "European Union" : "Other",
      euMember: euCountries.includes(country as any),
      flag: getCountryFlag(country)
    }));
  }, [euCountries]);

  const filteredCountries = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return countries.filter(c => c.label.toLowerCase().includes(query));
  }, [countries, searchQuery]);

  const groupedCountries = useMemo(() => {
    const eu = filteredCountries.filter(c => c.euMember);
    const other = filteredCountries.filter(c => !c.euMember);
    
    return [
      { region: "European Union (Enhanced Data)", countries: eu },
      { region: "Other Countries", countries: other }
    ].filter(group => group.countries.length > 0);
  }, [filteredCountries]);

  const selectedCountry = countries.find(c => c.value === value);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-2xl">{selectedCountry?.flag}</span>
          <span className="font-medium">{selectedCountry?.label}</span>
          {selectedCountry?.euMember && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
              EU Enhanced
            </span>
          )}
        </span>
        <Globe className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-hidden">
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                placeholder="Search countries..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-80">
              {groupedCountries.map(group => (
                <div key={group.region}>
                  <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide sticky top-0">
                    {group.region}
                  </div>
                  {group.countries.map(country => (
                    <button
                      key={country.value}
                      type="button"
                      onClick={() => {
                        onChange(country.value);
                        setIsOpen(false);
                        setSearchQuery("");
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors ${
                        value === country.value ? "bg-blue-50 dark:bg-blue-900/20" : ""
                      }`}
                    >
                      <span className="text-2xl">{country.flag}</span>
                      <span className="flex-1">{country.label}</span>
                      {country.euMember && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                          EU
                        </span>
                      )}
                      {value === country.value && (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Enhanced Tax Breakdown with Visual Charts
 */
export function EUTaxBreakdown({
  country,
  employmentIncome,
  capitalGains = 0,
  dividends = 0,
  businessIncome = 0
}: {
  country: Country;
  employmentIncome: number;
  capitalGains?: number;
  dividends?: number;
  businessIncome?: number;
}) {
  const [activeTab, setActiveTab] = useState<"breakdown" | "visual" | "comparison">("breakdown");

  const euCountries = getAllEUCountries();
  const isEU = euCountries.includes(country as any);

  let taxData: any;
  
  if (isEU) {
    try {
      taxData = calculateEUIndividualTax(country as any, employmentIncome, capitalGains, dividends);
    } catch (error) {
      console.error("Failed to calculate EU tax:", error);
      taxData = null;
    }
  }

  if (!taxData) {
    // Fallback to legacy calculation
    const config = TAX_CONFIGS[country];
    taxData = {
      incomeTax: 0,
      socialSecurity: 0,
      capitalGainsTax: 0,
      dividendTax: 0,
      totalTax: 0,
      effectiveRate: 0,
      netIncome: employmentIncome + capitalGains + dividends
    };
  }

  const chartData = [
    { name: "Income Tax", value: taxData.incomeTax, color: CHART_COLORS.incomeTax },
    { name: "Social Security", value: taxData.socialSecurity || 0, color: CHART_COLORS.socialSecurity },
    { name: "Capital Gains", value: taxData.capitalGainsTax || 0, color: CHART_COLORS.capitalGains },
    { name: "Dividend Tax", value: taxData.dividendTax || 0, color: CHART_COLORS.dividendTax },
    { name: "Net Income", value: taxData.netIncome, color: CHART_COLORS.netIncome }
  ].filter(item => item.value > 0);

  const totalIncome = employmentIncome + capitalGains + dividends + businessIncome;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("breakdown")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "breakdown"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Breakdown
          </div>
        </button>
        <button
          onClick={() => setActiveTab("visual")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "visual"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <BarChart className="w-4 h-4" />
            Visual
          </div>
        </button>
        {isEU && (
          <button
            onClick={() => setActiveTab("comparison")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "comparison"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              EU Insights
            </div>
          </button>
        )}
      </div>

      {/* Breakdown Tab */}
      {activeTab === "breakdown" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Income</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totalIncome, country)}
              </div>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Tax</div>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                {formatCurrency(taxData.totalTax, country)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {taxData.incomeTax > 0 && (
              <TaxLineItem
                label="Income Tax"
                amount={taxData.incomeTax}
                percentage={(taxData.incomeTax / totalIncome) * 100}
                color="red"
                country={country}
              />
            )}
            {taxData.socialSecurity > 0 && (
              <TaxLineItem
                label="Social Security"
                amount={taxData.socialSecurity}
                percentage={(taxData.socialSecurity / totalIncome) * 100}
                color="orange"
                country={country}
              />
            )}
            {taxData.capitalGainsTax > 0 && (
              <TaxLineItem
                label="Capital Gains Tax"
                amount={taxData.capitalGainsTax}
                percentage={(taxData.capitalGainsTax / totalIncome) * 100}
                color="yellow"
                country={country}
              />
            )}
            {taxData.dividendTax > 0 && (
              <TaxLineItem
                label="Dividend Tax"
                amount={taxData.dividendTax}
                percentage={(taxData.dividendTax / totalIncome) * 100}
                color="lime"
                country={country}
              />
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Effective Tax Rate</span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {taxData.effectiveRate.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="font-semibold">Net Income</span>
              <span className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(taxData.netIncome, country)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Visual Tab */}
      {activeTab === "visual" && (
        <div className="space-y-4">
          {/* Pie Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.name}: ${((entry.value / totalIncome) * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value, country)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.slice(0, -1)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value, country)} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* EU Insights Tab */}
      {activeTab === "comparison" && isEU && (
        <EUTaxInsights country={country} taxData={taxData} totalIncome={totalIncome} />
      )}
    </div>
  );
}

/**
 * Tax Line Item Component
 */
function TaxLineItem({
  label,
  amount,
  percentage,
  color,
  country
}: {
  label: string;
  amount: number;
  percentage: number;
  color: "red" | "orange" | "yellow" | "lime" | "cyan";
  country: Country;
}) {
  const colorClasses = {
    red: "bg-red-500",
    orange: "bg-orange-500",
    yellow: "bg-yellow-500",
    lime: "bg-lime-500",
    cyan: "bg-cyan-500"
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${colorClasses[color]}`} />
      <div className="flex-1 flex justify-between items-center">
        <span className="text-sm">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {percentage.toFixed(1)}%
          </span>
          <span className="font-semibold text-sm">
            {formatCurrency(amount, country)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * EU Tax Insights Component
 */
function EUTaxInsights({
  country,
  taxData,
  totalIncome
}: {
  country: Country;
  taxData: any;
  totalIncome: number;
}) {
  const euConfig = getEUTaxConfig(country as any);

  if (!euConfig) return null;

  const insights = [];

  // VAT Insight
  insights.push({
    icon: <Percent className="w-5 h-5" />,
    title: "VAT Rate",
    value: `${euConfig.vat.standardRate}%`,
    description: `Standard VAT rate in ${country}`,
    color: "blue"
  });

  // Social Security Insight
  const totalSSC = euConfig.socialSecurity.employee.rate;
  insights.push({
    icon: <DollarSign className="w-5 h-5" />,
    title: "Social Security",
    value: `${totalSSC.toFixed(1)}%`,
    description: "Total employee SSC rate",
    color: "orange"
  });

  // Dividend Tax Insight
  if (euConfig.withholdingTax.dividends.resident > 0) {
    insights.push({
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Dividend WHT",
      value: `${euConfig.withholdingTax.dividends.resident}%`,
      description: "Withholding tax on dividends",
      color: "green"
    });
  }

  // Corporate Tax Insight
  insights.push({
    icon: <Building2 className="w-5 h-5" />,
    title: "Corporate Tax",
    value: `${euConfig.corporateIncomeTax.standardRate}%`,
    description: "Standard corporate income tax",
    color: "purple"
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className={`flex items-center gap-2 text-${insight.color}-600 dark:text-${insight.color}-400 mb-1`}>
              {insight.icon}
              <span className="text-xs font-medium">{insight.title}</span>
            </div>
            <div className="text-2xl font-bold mb-1">{insight.value}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{insight.description}</div>
          </div>
        ))}
      </div>

      {/* EU-specific tips */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <div className="font-semibold text-blue-900 dark:text-blue-100">EU Tax Optimization Tips</div>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Take advantage of EU Parent-Subsidiary Directive for dividend exemptions</li>
              <li>• Consider cross-border tax planning within the EU</li>
              <li>• Review special tax regimes available in {country}</li>
              {totalIncome > 100000 && (
                <li>• High earners: Review holding company structures in EU jurisdictions</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Country Comparison Tool
 */
export function EUCountryComparison({
  countries,
  employmentIncome
}: {
  countries: Country[];
  employmentIncome: number;
}) {
  const comparisonData = useMemo(() => {
    const euCountries = getAllEUCountries();
    
    return countries.map(country => {
      const isEU = euCountries.includes(country as any);
      
      let taxData: any;
      if (isEU) {
        try {
          taxData = calculateEUIndividualTax(country as any, employmentIncome, 0, 0);
        } catch {
          taxData = null;
        }
      }
      
      return {
        country,
        flag: getCountryFlag(country),
        isEU,
        taxData: taxData || { totalTax: 0, effectiveRate: 0, netIncome: employmentIncome }
      };
    });
  }, [countries, employmentIncome]);

  const sortedData = [...comparisonData].sort((a, b) => a.taxData.effectiveRate - b.taxData.effectiveRate);

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Comparing {countries.length} countries for {formatCurrency(employmentIncome, countries[0])} employment income
      </div>

      <div className="space-y-2">
        {sortedData.map((data, idx) => (
          <div
            key={data.country}
            className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{data.flag}</span>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {data.country}
                    {data.isEU && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                        EU
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Net: {formatCurrency(data.taxData.netIncome, data.country)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {data.taxData.effectiveRate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Tax: {formatCurrency(data.taxData.totalTax, data.country)}
                </div>
              </div>
            </div>
            {idx === 0 && (
              <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Lowest tax burden
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Helper function to get country flag emoji
 */
function getCountryFlag(country: Country): string {
  const flags: Record<string, string> = {
    USA: "🇺🇸",
    UK: "🇬🇧",
    Canada: "🇨🇦",
    Germany: "🇩🇪",
    France: "🇫🇷",
    Australia: "🇦🇺",
    Japan: "🇯🇵",
    Singapore: "🇸🇬",
    UAE: "🇦🇪",
    Switzerland: "🇨🇭",
    Netherlands: "🇳🇱",
    Spain: "🇪🇸",
    Italy: "🇮🇹",
    Greece: "🇬🇷",
    Portugal: "🇵🇹",
    Brazil: "🇧🇷",
    Mexico: "🇲🇽",
    India: "🇮🇳",
    China: "🇨🇳",
    "South Korea": "🇰🇷",
    "New Zealand": "🇳🇿",
    Belgium: "🇧🇪",
    Sweden: "🇸🇪",
    Norway: "🇳🇴",
    Denmark: "🇩🇰",
    Finland: "🇫🇮",
    Austria: "🇦🇹",
    Poland: "🇵🇱",
    "Czech Republic": "🇨🇿",
    Ireland: "🇮🇪",
    Israel: "🇮🇱",
    Turkey: "🇹🇷",
    Thailand: "🇹🇭",
    Malaysia: "🇲🇾",
    Indonesia: "🇮🇩",
    Philippines: "🇵🇭",
    Vietnam: "🇻🇳",
    Argentina: "🇦🇷",
    Chile: "🇨🇱",
    Colombia: "🇨🇴",
    Peru: "🇵🇪"
  };
  
  return flags[country] || "🌍";
}
