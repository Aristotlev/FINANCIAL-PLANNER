import { 
  Wallet,
  Coins,
  TrendingUp,
  Globe,
  Building2,
  Receipt,
  Shield,
  LineChart
} from 'lucide-react';

export type BlogContentBlock = 
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] };

export type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  icon: any;
  date: string;
  readTime: string;
  color: string;
  content: BlogContentBlock[];
};

export const blogPosts: BlogPost[] = [
  {
    id: 'all-in-one-financial-dashboard',
    title: 'Why You Need an All-in-One Financial Dashboard',
    excerpt: 'Managing money across multiple apps is exhausting. Discover how consolidating your finances into one dashboard can transform your financial clarity and decision-making.',
    category: 'Product',
    icon: Wallet,
    date: 'December 15, 2024',
    readTime: '5 min read',
    color: 'emerald',
    content: [
      { type: 'paragraph', text: "If you're like most people, your financial life is scattered across a dozen different apps. Your checking account is with one bank, savings with another. Crypto on an exchange. Stocks with a broker. Expenses tracked in a spreadsheet (maybe). Sound familiar?" },
      { type: 'paragraph', text: "This fragmentation isn't just inconvenient—it's actively hurting your financial health. When you can't see your complete picture, you make decisions in a vacuum. You might feel rich because your investment account is up, while ignoring that your credit card debt is growing." },
      { type: 'heading', text: "The Problem with Fragmentation" },
      { type: 'paragraph', text: "Financial fragmentation leads to 'mental accounting' errors. You treat money differently depending on where it is stored, rather than looking at your wealth holistically. It also makes it nearly impossible to answer simple questions like 'What is my net worth?' or 'Can I afford this big purchase?' without opening five different tabs." },
      { type: 'heading', text: "The OmniFolio Solution" },
      { type: 'paragraph', text: "OmniFolio was built to solve this exact problem. We bring every aspect of your financial life—cash, savings, investments, crypto, real estate, expenses, and more—into one unified dashboard. For the first time, you can see your true net worth, track your progress, and make informed decisions based on your complete financial reality." },
      { type: 'list', items: [
        "Unified View: See all your assets and liabilities in one place.",
        "Automated Updates: No more manual spreadsheet entry.",
        "Holistic Insights: Understand how your crypto affects your overall risk profile.",
        "Better Decisions: Plan for the future with accurate data."
      ]},
      { type: 'paragraph', text: "Stop juggling apps and start managing your wealth. With OmniFolio, you get the clarity you need to build the future you want." }
    ]
  },
  {
    id: 'real-time-crypto-tracking',
    title: 'Real-Time Crypto Portfolio Tracking: Beyond the Basics',
    excerpt: 'Track your entire crypto portfolio with live prices, historical performance, and portfolio allocation insights—all without leaving OmniFolio.',
    category: 'Crypto',
    icon: Coins,
    date: 'December 10, 2024',
    readTime: '4 min read',
    color: 'amber',
    content: [
      { type: 'paragraph', text: "Cryptocurrency moves fast. Prices can swing 10% in an hour, and if you're managing multiple coins across different wallets, keeping track becomes a full-time job." },
      { type: 'paragraph', text: "Most traditional finance apps treat crypto as an afterthought, if they support it at all. They might let you manually enter a Bitcoin balance, but they don't give you the live data you need." },
      { type: 'heading', text: "Live Data, Real Insights" },
      { type: 'paragraph', text: "OmniFolio's crypto tracking pulls real-time prices for thousands of cryptocurrencies. Add your holdings once, and watch your portfolio value update automatically. See which coins are performing, how your allocation has shifted, and how crypto fits into your overall net worth." },
      { type: 'paragraph', text: "But we go beyond just showing prices. Our crypto dashboard shows you historical performance, percentage gains and losses, and how your crypto holdings compare to your traditional investments. It's the context you need to make smart decisions about your digital assets." },
      { type: 'heading', text: "Why It Matters" },
      { type: 'list', items: [
        "Volatility Management: React quickly to market moves.",
        "Portfolio Rebalancing: Know when your crypto allocation gets too high (or too low).",
        "Tax Awareness: Keep track of your cost basis and gains.",
        "Integration: See your crypto alongside your stocks and cash."
      ]},
      { type: 'paragraph', text: "Don't let your crypto investments live on an island. Bring them into your main financial dashboard with OmniFolio." }
    ]
  },
  {
    id: 'stock-investment-monitoring',
    title: 'Stock & Investment Monitoring Made Simple',
    excerpt: 'From individual stocks to ETFs and trading accounts, learn how OmniFolio helps you stay on top of your investment portfolio.',
    category: 'Investments',
    icon: TrendingUp,
    date: 'December 5, 2024',
    readTime: '4 min read',
    color: 'emerald',
    content: [
      { type: 'paragraph', text: "Your investment accounts are probably your largest financial assets—but how often do you actually check on them? And when you do, are you seeing the full picture?" },
      { type: 'paragraph', text: "Logging into a brokerage account gives you a deep dive into that specific account, but it doesn't tell you how it relates to your 401(k), your IRA, or your spouse's investments." },
      { type: 'heading', text: "The Big Picture" },
      { type: 'paragraph', text: "OmniFolio connects your stock holdings and investment accounts into your unified financial dashboard. Track individual stocks, ETFs, mutual funds, and entire brokerage accounts. See real-time values alongside your other assets." },
      { type: 'paragraph', text: "What makes this powerful is context. When your stocks are up, you can see how that affects your overall net worth. When markets dip, you can see how your diversified portfolio (including cash, real estate, and other assets) cushions the blow. It's investment tracking that actually helps you sleep at night." },
      { type: 'heading', text: "Features for Investors" },
      { type: 'list', items: [
        "Multi-Broker Support: Track assets across different platforms.",
        "Performance Metrics: See daily and total gains/losses.",
        "Asset Allocation: Visualize your split between stocks, bonds, and cash.",
        "Dividend Tracking: Keep an eye on your passive income."
      ]},
      { type: 'paragraph', text: "Invest smarter by seeing the whole board. OmniFolio gives you the visibility you need to grow your wealth." }
    ]
  },
  {
    id: 'multi-currency-support',
    title: 'Managing Money Across 30+ Currencies',
    excerpt: "Whether you earn in euros, save in dollars, or invest globally, OmniFolio's multi-currency support keeps everything in sync.",
    category: 'Features',
    icon: Globe,
    date: 'November 28, 2024',
    readTime: '3 min read',
    color: 'cyan',
    content: [
      { type: 'paragraph', text: "In today's global economy, your money doesn't stay in one currency. You might earn in euros, hold savings in dollars, invest in Japanese stocks, and own Bitcoin. Traditional finance apps weren't built for this reality." },
      { type: 'paragraph', text: "Trying to calculate your net worth when your assets are denominated in five different currencies is a nightmare of exchange rates and spreadsheet formulas." },
      { type: 'heading', text: "Seamless Conversion" },
      { type: 'paragraph', text: "OmniFolio supports 30+ currencies with real-time exchange rates. Set your preferred display currency, and we'll automatically convert all your holdings. Your British pounds, Swiss francs, and Singapore dollars all appear in your chosen currency—making it easy to see your true global net worth." },
      { type: 'paragraph', text: "This isn't just convenience—it's clarity. When you can see all your international holdings in one currency, you can finally understand your complete financial position and make better decisions about where to hold your money." },
      { type: 'heading', text: "Who Needs This?" },
      { type: 'list', items: [
        "Expats: Managing finances in home and host countries.",
        "Digital Nomads: Earning and spending in multiple currencies.",
        "Global Investors: Holding international stocks or real estate.",
        "Travelers: Keeping track of foreign cash and accounts."
      ]},
      { type: 'paragraph', text: "The world is global. Your financial dashboard should be too." }
    ]
  },
  {
    id: 'real-estate-property-tracking',
    title: 'Track Real Estate & Property Values in Your Portfolio',
    excerpt: "Your home might be your biggest asset. Learn how to include real estate in your complete financial picture.",
    category: 'Real Estate',
    icon: Building2,
    date: 'November 20, 2024',
    readTime: '4 min read',
    color: 'rose',
    content: [
      { type: 'paragraph', text: "For many people, their home is their single largest asset—yet most financial apps completely ignore it. How can you understand your net worth if you're leaving out a $500,000 property?" },
      { type: 'paragraph', text: "Real estate is illiquid, but it's a crucial part of your financial foundation. Ignoring it leads to a skewed view of your wealth." },
      { type: 'heading', text: "Property in Your Pocket" },
      { type: 'paragraph', text: "OmniFolio lets you add real estate holdings to your portfolio. Track your primary residence, rental properties, or land investments. Update values as the market changes, and see how real estate contributes to your overall wealth." },
      { type: 'paragraph', text: "This complete picture changes how you think about money. Maybe you're not as 'behind' on savings as you thought, because you've been building equity in your home. Or maybe you realize your portfolio is too concentrated in real estate and you need more liquid assets. Either way, you're making decisions based on reality, not guesswork." },
      { type: 'heading', text: "Key Benefits" },
      { type: 'list', items: [
        "Equity Tracking: See your ownership stake grow as you pay down mortgages.",
        "Asset Mix: Visualize real estate vs. stocks vs. crypto.",
        "Net Worth Accuracy: Get the true number, not just the liquid number.",
        "Multiple Properties: Manage a portfolio of rentals or vacation homes."
      ]},
      { type: 'paragraph', text: "Your home is an investment. Track it like one with OmniFolio." }
    ]
  },
  {
    id: 'expense-tracking-insights',
    title: 'Expense Tracking That Actually Helps You Save',
    excerpt: 'Understanding where your money goes is the first step to keeping more of it. See how OmniFolio makes expense tracking painless.',
    category: 'Expenses',
    icon: Receipt,
    date: 'November 15, 2024',
    readTime: '4 min read',
    color: 'orange',
    content: [
      { type: 'paragraph', text: "You know you should track your expenses. But most expense tracking apps are tedious, requiring you to manually categorize every coffee and grocery run. No wonder most people give up after a week." },
      { type: 'paragraph', text: "If tracking is too hard, you won't do it. And if you don't do it, you can't improve your spending habits." },
      { type: 'heading', text: "Effortless Insights" },
      { type: 'paragraph', text: "OmniFolio takes a different approach. We focus on giving you visibility into your spending patterns without the busywork. Log your major expenses, set budgets for categories that matter, and get insights into where your money actually goes." },
      { type: 'paragraph', text: "The real power comes from seeing expenses alongside your income and investments. When you can see that your monthly spending is eating into your investment contributions, or that cutting one subscription would fund your emergency savings, you make better choices. That's expense tracking that actually changes behavior." },
      { type: 'heading', text: "Smart Features" },
      { type: 'list', items: [
        "Category Budgets: Set limits for dining, travel, or shopping.",
        "Visual Reports: See your spending breakdown in clear charts.",
        "Trend Analysis: Spot lifestyle creep before it becomes a problem.",
        "Savings Goals: Link spending reduction directly to your goals."
      ]},
      { type: 'paragraph', text: "Take control of your cash flow. OmniFolio makes it easy to spend less and save more." }
    ]
  },
  {
    id: 'security-privacy-first',
    title: 'How We Keep Your Financial Data Secure',
    excerpt: 'Your financial data is sensitive. Learn about the security measures we use to protect your information.',
    category: 'Security',
    icon: Shield,
    date: 'November 10, 2024',
    readTime: '3 min read',
    color: 'blue',
    content: [
      { type: 'paragraph', text: "When you're trusting an app with your complete financial picture, security isn't optional—it's essential. We take this responsibility seriously." },
      { type: 'paragraph', text: "In an age of data breaches and privacy concerns, you need to know that your financial information is safe." },
      { type: 'heading', text: "Bank-Level Security" },
      { type: 'paragraph', text: "OmniFolio uses bank-level encryption for all data transmission and storage. Your information is encrypted at rest and in transit. We never sell your data to third parties, and we never will. Your financial information is yours alone." },
      { type: 'paragraph', text: "We also believe in transparency. We don't hide behind vague 'we take security seriously' statements. We use industry-standard protocols, regular security audits, and follow best practices for data protection. Because when it comes to your money, trust has to be earned." },
      { type: 'heading', text: "Our Promise" },
      { type: 'list', items: [
        "Encryption: AES-256 encryption for stored data.",
        "Privacy: No selling of user data to advertisers.",
        "Control: You own your data and can export or delete it anytime.",
        "Compliance: Adherence to global data protection standards."
      ]},
      { type: 'paragraph', text: "Your wealth deserves the best protection. With OmniFolio, your data is safe, secure, and private." }
    ]
  },
  {
    id: 'net-worth-tracking',
    title: 'The Power of Tracking Your Net Worth Over Time',
    excerpt: "Your net worth is the single most important number in personal finance. Here's why tracking it changes everything.",
    category: 'Insights',
    icon: LineChart,
    date: 'November 5, 2024',
    readTime: '5 min read',
    color: 'violet',
    content: [
      { type: 'paragraph', text: "Ask most people their net worth and they'll shrug. They might know their salary, maybe their checking account balance, but their actual net worth? No idea. This is a problem." },
      { type: 'paragraph', text: "Income is not wealth. You can earn a million dollars a year and still be broke if you spend a million and one. Net worth is the only true measure of financial health." },
      { type: 'heading', text: "The Scoreboard of Wealth" },
      { type: 'paragraph', text: "Your net worth—assets minus liabilities—is the scoreboard of your financial life. It tells you if you're actually making progress or just running in place. A high income means nothing if you're spending it all. Owning a home doesn't help if you're drowning in other debt." },
      { type: 'paragraph', text: "OmniFolio calculates your net worth automatically by summing all your assets and subtracting your liabilities. More importantly, we track it over time. Watch your net worth grow month over month, year over year. See the impact of your financial decisions. That visibility alone can transform how you think about money." },
      { type: 'heading', text: "Why Track It?" },
      { type: 'list', items: [
        "Motivation: Seeing the number go up is addictive (in a good way).",
        "Reality Check: It forces you to confront your debt.",
        "Goal Setting: It gives you a concrete target to aim for.",
        "Big Picture: It combines savings, investments, and debt payoff into one metric."
      ]},
      { type: 'paragraph', text: "Start tracking your net worth today. It's the first step to building real wealth." }
    ]
  }
];
