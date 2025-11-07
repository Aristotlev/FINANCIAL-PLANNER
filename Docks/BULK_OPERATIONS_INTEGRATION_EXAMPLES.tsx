/**
 * Example: How to add Bulk Operations to any Financial Card
 * 
 * This example shows how to integrate the BulkOperationsModal into
 * your existing financial cards (stocks, crypto, cash, etc.)
 */

"use client";

import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { BulkOperationsModal } from "@/components/ui/bulk-operations-modal";

export function StocksCardWithBulkOps() {
  const [showBulkModal, setShowBulkModal] = useState(false);

  const handleBulkSuccess = () => {
    // Refresh your data here
    console.log('Bulk operation completed!');
    // Example: refetchStocks() or refreshData()
    
    // Dispatch event to refresh card
    window.dispatchEvent(new Event('stockDataChanged'));
  };

  return (
    <div className="card">
      {/* Card Header with Bulk Operations Button */}
      <div className="card-header flex justify-between items-center">
        <h3>My Stocks</h3>
        
        {/* Add Bulk Operations Button */}
        <button
          onClick={() => setShowBulkModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
        >
          <Upload className="w-4 h-4" />
          Bulk Operations
        </button>
      </div>

      {/* Your existing card content */}
      <div className="card-body">
        {/* Stock list, charts, etc. */}
      </div>

      {/* Bulk Operations Modal */}
      {showBulkModal && (
        <BulkOperationsModal
          type="stocks"  // or 'crypto', 'cash', 'savings'
          onClose={() => setShowBulkModal(false)}
          onSuccess={handleBulkSuccess}
        />
      )}
    </div>
  );
}

// ===================================
// Example 2: Crypto Card with Bulk Operations
// ===================================

export function CryptoCardWithBulkOps() {
  const [showBulkModal, setShowBulkModal] = useState(false);

  return (
    <div className="card">
      <div className="card-header">
        <h3>Cryptocurrency</h3>
        <button onClick={() => setShowBulkModal(true)}>
          <Upload className="w-4 h-4" />
          Bulk Add/Remove
        </button>
      </div>

      {/* Card content */}

      {showBulkModal && (
        <BulkOperationsModal
          type="crypto"
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => window.dispatchEvent(new Event('cryptoDataChanged'))}
        />
      )}
    </div>
  );
}

// ===================================
// Example 3: Cash Card with Bulk Operations
// ===================================

export function CashCardWithBulkOps() {
  const [showBulkModal, setShowBulkModal] = useState(false);

  return (
    <div className="card">
      <div className="card-header">
        <h3>Cash Accounts</h3>
        <button onClick={() => setShowBulkModal(true)}>
          Bulk Import Accounts
        </button>
      </div>

      {showBulkModal && (
        <BulkOperationsModal
          type="cash"
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => window.dispatchEvent(new Event('cashDataChanged'))}
        />
      )}
    </div>
  );
}

// ===================================
// Example 4: Add to Toolbar/Action Menu
// ===================================

export function CardToolbar({ type }: { type: 'stocks' | 'crypto' | 'cash' | 'savings' }) {
  const [showBulkModal, setShowBulkModal] = useState(false);

  return (
    <>
      <div className="toolbar flex gap-2">
        {/* Regular add button */}
        <button className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Single
        </button>

        {/* Bulk operations button */}
        <button 
          onClick={() => setShowBulkModal(true)}
          className="btn-secondary"
        >
          <Upload className="w-4 h-4" />
          Bulk Import
        </button>
      </div>

      {showBulkModal && (
        <BulkOperationsModal
          type={type}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            window.dispatchEvent(new Event(`${type}DataChanged`));
            window.dispatchEvent(new Event('financialDataChanged'));
          }}
        />
      )}
    </>
  );
}

// ===================================
// Example 5: Dropdown Menu Integration
// ===================================

export function CardActionsDropdown() {
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkType, setBulkType] = useState<'stocks' | 'crypto' | 'cash' | 'savings'>('stocks');

  const openBulkModal = (type: typeof bulkType) => {
    setBulkType(type);
    setShowBulkModal(true);
  };

  return (
    <>
      <div className="dropdown-menu">
        <button onClick={() => openBulkModal('stocks')}>
          Bulk Add Stocks
        </button>
        <button onClick={() => openBulkModal('crypto')}>
          Bulk Add Crypto
        </button>
        <button onClick={() => openBulkModal('cash')}>
          Bulk Add Cash Accounts
        </button>
        <button onClick={() => openBulkModal('savings')}>
          Bulk Add Savings
        </button>
      </div>

      {showBulkModal && (
        <BulkOperationsModal
          type={bulkType}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => window.dispatchEvent(new Event('financialDataChanged'))}
        />
      )}
    </>
  );
}

// ===================================
// Example 6: CSV Template Download Only
// ===================================

export function DownloadTemplateButton({ type }: { type: string }) {
  const exportTemplate = () => {
    let csv = '';
    
    switch (type) {
      case 'stocks':
        csv = 'Symbol,Shares,EntryPrice\nAAPL,10,150.00\nMSFT,5,300.00';
        break;
      case 'crypto':
        csv = 'Symbol,Amount,EntryPrice\nBTC,0.5,45000.00\nETH,2,3000.00';
        break;
      case 'cash':
      case 'savings':
        csv = 'Name,Bank,Balance,Type\nMain Checking,Chase,5000.00,Checking';
        break;
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
  };

  return (
    <button onClick={exportTemplate} className="btn-secondary">
      Download CSV Template
    </button>
  );
}

// ===================================
// Example 7: Integration with AI Chat
// ===================================

export function AIAssistantWithBulk() {
  const [showBulkModal, setShowBulkModal] = useState(false);

  // When AI detects user wants to bulk add
  const handleAIResponse = (response: string) => {
    if (response.includes('bulk add') || response.includes('import csv')) {
      setShowBulkModal(true);
    }
  };

  return (
    <>
      {/* Your AI chat component */}
      <div className="ai-chat">
        {/* AI suggests: "Would you like to bulk add multiple stocks?" */}
        <button onClick={() => setShowBulkModal(true)}>
          Yes, open bulk import
        </button>
      </div>

      {showBulkModal && (
        <BulkOperationsModal
          type="stocks"
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => console.log('Bulk import complete!')}
        />
      )}
    </>
  );
}
