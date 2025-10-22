import { DataService } from './data-service';

export interface CommandResult {
  success: boolean;
  message: string;
  action?: string;
  data?: any;
}

export class AICommandProcessor {
  private dataService: DataService;

  constructor() {
    this.dataService = new DataService();
  }

  async processCommand(command: string): Promise<CommandResult> {
    const normalizedCommand = command.toLowerCase().trim();

    try {
      // Portfolio analysis commands
      if (this.isPortfolioAnalysisCommand(normalizedCommand)) {
        return await this.handlePortfolioAnalysis(command);
      }

      // Stock commands
      if (this.isAddStockCommand(normalizedCommand)) {
        return await this.handleAddStock(command);
      }

      if (this.isUpdateStockCommand(normalizedCommand)) {
        return await this.handleUpdateStock(command);
      }

      if (this.isSellStockCommand(normalizedCommand)) {
        return await this.handleSellStock(command);
      }

      // Crypto commands
      if (this.isAddCryptoCommand(normalizedCommand)) {
        return await this.handleAddCrypto(command);
      }

      // Cash/Savings commands
      if (this.isUpdateBalanceCommand(normalizedCommand)) {
        return await this.handleUpdateBalance(command);
      }

      if (this.isAddAccountCommand(normalizedCommand)) {
        return await this.handleAddAccount(command);
      }

      // Real estate commands
      if (this.isAddPropertyCommand(normalizedCommand)) {
        return await this.handleAddProperty(command);
      }

      if (this.isUpdatePropertyCommand(normalizedCommand)) {
        return await this.handleUpdateProperty(command);
      }

      // Trading commands
      if (this.isAddTradingPositionCommand(normalizedCommand)) {
        return await this.handleAddTradingPosition(command);
      }

      // Valuable items commands
      if (this.isAddItemCommand(normalizedCommand)) {
        return await this.handleAddItem(command);
      }

      // Expense commands
      if (this.isAddExpenseCommand(normalizedCommand)) {
        return await this.handleAddExpense(command);
      }

      // Debt/Liability commands
      if (this.isAddDebtCommand(normalizedCommand)) {
        return await this.handleAddDebt(command);
      }

      // Subscription commands
      if (this.isAddSubscriptionCommand(normalizedCommand)) {
        return await this.handleAddSubscription(command);
      }

      // Delete commands
      if (this.isDeleteCommand(normalizedCommand)) {
        return await this.handleDelete(command);
      }

      // If no specific command matched
      return {
        success: false,
        message: "I couldn't understand that command. Could you please rephrase it or type 'help' for available commands?",
      };
    } catch (error) {
      return {
        success: false,
        message: `Error processing command: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Stock command handlers
  private isAddStockCommand(command: string): boolean {
    return /add \d+ shares? of .+ at \$?[\d,]+/.test(command) ||
           /buy \d+ shares? of .+/.test(command);
  }

  private async handleAddStock(command: string): Promise<CommandResult> {
    const match = command.match(/add (\d+) shares? of ([A-Za-z]+|\w+) at \$?([\d,]+\.?\d*)/i);
    
    if (!match) {
      return {
        success: false,
        message: "Please specify: number of shares, stock symbol, and price. Example: 'Add 10 shares of AAPL at $150'",
      };
    }

    const [, shares, symbol, price] = match;
    
    // Here you would integrate with your DataService to add the stock
    // For now, returning a mock success response
    return {
      success: true,
      message: `✅ Successfully added ${shares} shares of ${symbol.toUpperCase()} at $${price}!`,
      action: 'add_stock',
      data: {
        symbol: symbol.toUpperCase(),
        shares: parseInt(shares),
        entryPoint: parseFloat(price.replace(/,/g, '')),
      },
    };
  }

  private isUpdateStockCommand(command: string): boolean {
    return /update .+ stock/.test(command) || /change .+ shares/.test(command);
  }

  private async handleUpdateStock(command: string): Promise<CommandResult> {
    return {
      success: true,
      message: "Stock update command recognized. What would you like to change?",
      action: 'update_stock',
    };
  }

  private isSellStockCommand(command: string): boolean {
    return /sell \d+ shares? of/.test(command) || /remove .+ stock/.test(command);
  }

  private async handleSellStock(command: string): Promise<CommandResult> {
    const match = command.match(/sell (\d+) shares? of ([A-Za-z]+)/i);
    
    if (!match) {
      return {
        success: false,
        message: "Please specify: number of shares and stock symbol. Example: 'Sell 5 shares of AAPL'",
      };
    }

    const [, shares, symbol] = match;
    
    return {
      success: true,
      message: `✅ Sold ${shares} shares of ${symbol.toUpperCase()}!`,
      action: 'sell_stock',
      data: { symbol: symbol.toUpperCase(), shares: parseInt(shares) },
    };
  }

  // Crypto command handlers
  private isAddCryptoCommand(command: string): boolean {
    return /add [\d.]+ [A-Z]{3,4} at/.test(command) || /buy [\d.]+ (bitcoin|ethereum|btc|eth)/.test(command);
  }

  private async handleAddCrypto(command: string): Promise<CommandResult> {
    // Check if this is adding MORE to an existing position
    const isAddingMore = /add(ing)? (more|\d+\s+more)/i.test(command);
    
    const match = command.match(/add(?:ing)?\s+(?:more\s+)?([\d.]+) ([A-Z]{3,4}) at \$?([\d,]+\.?\d*)/i);
    
    if (!match) {
      return {
        success: false,
        message: "Please specify: amount, crypto symbol, and price. Example: 'Add 0.5 BTC at $45000'",
      };
    }

    const [, amount, symbol, price] = match;
    
    return {
      success: true,
      message: `✅ Successfully added ${amount} ${symbol.toUpperCase()} at $${price}!`,
      action: isAddingMore ? 'add_more_crypto' : 'add_crypto',
      data: {
        symbol: symbol.toUpperCase(),
        amount: parseFloat(amount),
        entryPrice: parseFloat(price.replace(/,/g, '')),
      },
    };
  }

  // Balance command handlers
  private isUpdateBalanceCommand(command: string): boolean {
    return /update .+ balance to/.test(command) || /set .+ balance/.test(command);
  }

  private async handleUpdateBalance(command: string): Promise<CommandResult> {
    const match = command.match(/update ([^\s]+) (?:account )?balance to \$?([\d,]+\.?\d*)/i);
    
    if (!match) {
      return {
        success: false,
        message: "Please specify: account name and new balance. Example: 'Update savings balance to $5000'",
      };
    }

    const [, account, balance] = match;
    
    return {
      success: true,
      message: `✅ Updated ${account} account balance to $${balance}!`,
      action: 'update_balance',
      data: {
        account: account,
        balance: parseFloat(balance.replace(/,/g, '')),
      },
    };
  }

  private isAddAccountCommand(command: string): boolean {
    return /add (savings|checking|cash) account/.test(command) || /create new account/.test(command);
  }

  private async handleAddAccount(command: string): Promise<CommandResult> {
    return {
      success: true,
      message: "I'll help you add a new account. Please provide the account details.",
      action: 'add_account',
    };
  }

  // Real estate command handlers
  private isAddPropertyCommand(command: string): boolean {
    return /add property/.test(command) || /new property/.test(command);
  }

  private async handleAddProperty(command: string): Promise<CommandResult> {
    return {
      success: true,
      message: "I'll help you add a new property. Please provide the property details.",
      action: 'add_property',
    };
  }

  private isUpdatePropertyCommand(command: string): boolean {
    return /update property/.test(command) || /change property value/.test(command);
  }

  private async handleUpdateProperty(command: string): Promise<CommandResult> {
    return {
      success: true,
      message: "Property update recognized. What changes should I make?",
      action: 'update_property',
    };
  }

  // Trading command handlers
  private isAddTradingPositionCommand(command: string): boolean {
    return /add position/.test(command) || /open position/.test(command);
  }

  private async handleAddTradingPosition(command: string): Promise<CommandResult> {
    return {
      success: true,
      message: "I'll help you open a new trading position. Please provide the details.",
      action: 'add_trading_position',
    };
  }

  // Valuable items command handlers
  private isAddItemCommand(command: string): boolean {
    return /add item/.test(command) || /new item/.test(command);
  }

  private async handleAddItem(command: string): Promise<CommandResult> {
    return {
      success: true,
      message: "I'll help you add a valuable item. Please provide the item details.",
      action: 'add_item',
    };
  }

  // Expense command handlers
  private isAddExpenseCommand(command: string): boolean {
    return /add expense|new expense|track expense|add (housing|food|dining|transportation|utilities|subscription|bill)/.test(command) ||
           /night out|activities|experiences|travel|entertainment/.test(command);
  }

  private async handleAddExpense(command: string): Promise<CommandResult> {
    // Try to extract details from command
    const amountMatch = command.match(/\$?([\d,]+\.?\d*)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

    // Detect expense category from keywords
    let category = 'General';
    let description = '';
    
    if (/housing|rent|mortgage|utilities/i.test(command)) {
      category = 'Housing';
      description = 'Rent, utilities, maintenance';
    } else if (/food|dining|restaurant|grocery|groceries/i.test(command)) {
      category = 'Food & Dining';
      description = 'Groceries, restaurants, delivery';
    } else if (/transport|gas|car|uber|lyft|transit/i.test(command)) {
      category = 'Transportation';
      description = 'Gas, public transit, rideshare';
    } else if (/subscription|netflix|spotify|software|license/i.test(command)) {
      category = 'Subscriptions';
      description = 'Netflix, Spotify, software licenses';
    } else if (/utilities|electricity|water|internet|phone/i.test(command)) {
      category = 'Utilities';
      description = 'Electricity, water, internet, phone';
    } else if (/night out|bar|club|entertainment/i.test(command)) {
      category = 'Night Out';
      description = 'Bars, clubs, entertainment venues';
    } else if (/activities|experiences|events|concert/i.test(command)) {
      category = 'Activities & Experiences';
      description = 'Events, concerts, activities';
    } else if (/travel|flight|hotel|vacation/i.test(command)) {
      category = 'Travel';
      description = 'Flights, hotels, vacation expenses';
    }

    if (amount > 0) {
      return {
        success: true,
        message: `✅ I'll add a ${category} expense of $${amount.toLocaleString()}. This will help you track your spending in the Expenses & Debt card!`,
        action: 'add_expense',
        data: {
          category,
          amount,
          description
        },
      };
    }

    return {
      success: true,
      message: `I can help you track ${category} expenses. What's the monthly amount?`,
      action: 'add_expense',
    };
  }

  // Debt/Liability command handlers
  private isAddDebtCommand(command: string): boolean {
    return /add (debt|liability|loan|credit card|student loan|mortgage|auto loan|car loan|personal loan)/.test(command) ||
           /(college|student) (debt|loan)/.test(command);
  }

  private async handleAddDebt(command: string): Promise<CommandResult> {
    // Extract debt details
    const amountMatch = command.match(/\$?([\d,]+\.?\d*)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
    
    // Detect debt type
    let debtType = 'Personal Loan';
    let name = 'Debt Account';
    
    if (/(student|college) (loan|debt)/i.test(command)) {
      debtType = 'Student Loan';
      name = 'Student Loan';
    } else if (/credit card/i.test(command)) {
      debtType = 'Credit Card';
      name = 'Credit Card';
    } else if (/(auto|car) loan/i.test(command)) {
      debtType = 'Auto Loan';
      name = 'Auto Loan';
    } else if (/mortgage/i.test(command)) {
      debtType = 'Mortgage';
      name = 'Home Mortgage';
    } else if (/personal loan/i.test(command)) {
      debtType = 'Personal Loan';
      name = 'Personal Loan';
    }

    if (amount > 0) {
      return {
        success: true,
        message: `✅ I'll add a ${debtType} of $${amount.toLocaleString()} to your debt tracking. It's important to keep an eye on liabilities - knowing where you stand is the first step to crushing that debt! 💪`,
        action: 'add_debt',
        data: {
          name,
          type: debtType,
          balance: amount,
          minPayment: Math.round(amount * 0.025), // Estimate 2.5% minimum payment
          interestRate: 5.0, // Default 5% APR
          dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
          description: `${debtType} account`
        },
      };
    }

    return {
      success: true,
      message: `I can help you track that ${debtType}. What's the current balance?`,
      action: 'add_debt',
    };
  }

  // Subscription command handlers
  private isAddSubscriptionCommand(command: string): boolean {
    return /add subscription|new subscription|subscribe to/.test(command);
  }

  private async handleAddSubscription(command: string): Promise<CommandResult> {
    const amountMatch = command.match(/\$?([\d,]+\.?\d*)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

    if (amount > 0) {
      return {
        success: true,
        message: `✅ I'll add this subscription ($${amount}/month) to your Subscriptions expense category. Keep track of those recurring costs!`,
        action: 'add_subscription',
        data: {
          category: 'Subscriptions',
          amount,
          description: 'Monthly subscription service'
        },
      };
    }

    return {
      success: true,
      message: "I can help you track that subscription. What's the monthly cost?",
      action: 'add_subscription',
    };
  }

  // Delete command handlers
  private isDeleteCommand(command: string): boolean {
    return /delete/.test(command) || /remove/.test(command);
  }

  private async handleDelete(command: string): Promise<CommandResult> {
    return {
      success: true,
      message: "Delete command recognized. What would you like to remove?",
      action: 'delete',
    };
  }

  // Portfolio Analysis command handlers
  private isPortfolioAnalysisCommand(command: string): boolean {
    return /analyze (my )?portfolio/.test(command) || 
           /portfolio (analysis|breakdown|performance)/.test(command) ||
           /how('| i)s my portfolio/.test(command) ||
           /show (me )?(my )?portfolio/.test(command);
  }

  private async handlePortfolioAnalysis(command: string): Promise<CommandResult> {
    try {
      // Load all holdings from DataService (static methods)
      const cryptoHoldings = DataService.loadCryptoHoldings([]);
      const stockHoldings = DataService.loadStockHoldings([]);
      
      const allHoldings = [
        ...cryptoHoldings.map((h: any) => ({ ...h, type: 'crypto' })),
        ...stockHoldings.map((h: any) => ({ ...h, type: 'stock' }))
      ];

      if (allHoldings.length === 0) {
        return {
          success: false,
          message: "📊 You don't have any holdings in your portfolio yet. Add some stocks or crypto to get started!",
        };
      }

      return {
        success: true,
        message: "🔄 Analyzing your complete portfolio with enhanced time tracking (1h, 4h, 24h, 7d, 30d, 365d)...",
        action: 'enhanced_portfolio_analysis',
        data: { holdings: allHoldings },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error loading portfolio data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Analysis helpers
  async getPortfolioSummary(): Promise<CommandResult> {
    // This would fetch real data from DataService
    return {
      success: true,
      message: "Here's your portfolio summary...",
      action: 'portfolio_summary',
      data: {
        totalValue: 0,
        stocksValue: 0,
        cryptoValue: 0,
        realEstateValue: 0,
        cashValue: 0,
      },
    };
  }
}
