/**
 * Bulk Operations Modal
 * Add or remove multiple assets at once
 * Requires TRADER plan or higher for import/export features
 */

"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Upload, Download, X, Lock } from "lucide-react";
import { useImportExportLimit } from "@/hooks/use-subscription";

interface BulkItem {
  symbol?: string;
  name?: string;
  shares?: number;
  amount?: number;
  entryPrice?: number;
  balance?: number;
  bank?: string;
  type?: string;
}

interface BulkOperationsModalProps {
  type: 'stocks' | 'crypto' | 'cash' | 'savings';
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkOperationsModal({ type, onClose, onSuccess }: BulkOperationsModalProps) {
  const { canUse: canUseImportExport, checking: checkingPermission, limitInfo } = useImportExportLimit();
  const [operation, setOperation] = useState<'add' | 'remove'>('add');
  const [items, setItems] = useState<BulkItem[]>([{}]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addEmptyRow = () => {
    setItems([...items, {}]);
  };

  const removeRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleBulkOperation = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/bulk-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation,
          data: {
            type,
            items: items.filter(item => Object.keys(item).length > 0),
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.message || 'Operation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const parsed: BulkItem[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const item: BulkItem = {};
      
      headers.forEach((header, idx) => {
        const value = values[idx];
        if (header === 'symbol' || header === 'name' || header === 'bank' || header === 'type') {
          (item as any)[header] = value;
        } else if (header === 'shares' || header === 'amount' || header === 'entryprice' || header === 'price' || header === 'balance') {
          (item as any)[header === 'price' ? 'entryPrice' : header === 'entryprice' ? 'entryPrice' : header] = parseFloat(value);
        }
      });
      
      if (Object.keys(item).length > 0) {
        parsed.push(item);
      }
    }
    
    setItems(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseCSV(text);
      };
      reader.readAsText(file);
    }
  };

  const exportTemplate = () => {
    if (!canUseImportExport) return; // Guard against usage
    
    let csv = '';
    if (type === 'stocks') {
      csv = 'Symbol,Shares,EntryPrice\nAAPL,10,150.00\nMSFT,5,300.00';
    } else if (type === 'crypto') {
      csv = 'Symbol,Amount,EntryPrice\nBTC,0.5,45000.00\nETH,2,3000.00';
    } else if (type === 'cash' || type === 'savings') {
      csv = 'Name,Bank,Balance,Type\nMain Checking,Chase,5000.00,Checking';
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
  };

  // Show upgrade prompt if user doesn't have permission
  if (!canUseImportExport && !checkingPermission) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-800">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Upgrade to Unlock</h2>
            <p className="text-gray-400 mb-6">
              Import/Export features are only available on <span className="text-purple-400 font-semibold">Trader</span> plan and above.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Upgrade to save time by importing CSV files and syncing with brokers instead of manual entry.
            </p>
            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-6 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors text-white"
              >
                Cancel
              </button>
              <a
                href="/pricing"
                className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-medium transition-colors text-white text-center"
              >
                View Plans
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Bulk Operations - {type.charAt(0).toUpperCase() + type.slice(1)}</h2>
            <p className="text-sm text-gray-400 mt-1">Add or remove multiple items at once</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Operation Type */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex gap-4">
            <button
              onClick={() => setOperation('add')}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
                operation === 'add'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Bulk Add
            </button>
            <button
              onClick={() => setOperation('remove')}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
                operation === 'remove'
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Trash2 className="w-5 h-5 inline mr-2" />
              Bulk Remove
            </button>
          </div>
        </div>

        {operation === 'add' && (
          <>
            {/* Import/Export */}
            <div className="p-6 border-b border-gray-800 flex gap-4">
              <label className="flex-1">
                <div className="flex items-center justify-center gap-2 py-3 px-6 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors">
                  <Upload className="w-5 h-5" />
                  <span>Import CSV</span>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <button
                onClick={exportTemplate}
                className="flex-1 py-3 px-6 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download Template
              </button>
            </div>

            {/* Items Table */}
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      {type === 'stocks' && (
                        <>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Symbol</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Shares</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Entry Price</th>
                        </>
                      )}
                      {type === 'crypto' && (
                        <>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Symbol</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Amount</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Entry Price</th>
                        </>
                      )}
                      {(type === 'cash' || type === 'savings') && (
                        <>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Bank</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Balance</th>
                        </>
                      )}
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-800/50">
                        {type === 'stocks' && (
                          <>
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                placeholder="AAPL"
                                value={item.symbol || ''}
                                onChange={(e) => updateItem(idx, 'symbol', e.target.value.toUpperCase())}
                                className="w-full bg-gray-800 rounded px-3 py-2 text-white"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                placeholder="10"
                                value={item.shares || ''}
                                onChange={(e) => updateItem(idx, 'shares', parseFloat(e.target.value))}
                                className="w-full bg-gray-800 rounded px-3 py-2 text-white"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="150.00"
                                value={item.entryPrice || ''}
                                onChange={(e) => updateItem(idx, 'entryPrice', parseFloat(e.target.value))}
                                className="w-full bg-gray-800 rounded px-3 py-2 text-white"
                              />
                            </td>
                          </>
                        )}
                        {type === 'crypto' && (
                          <>
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                placeholder="BTC"
                                value={item.symbol || ''}
                                onChange={(e) => updateItem(idx, 'symbol', e.target.value.toUpperCase())}
                                className="w-full bg-gray-800 rounded px-3 py-2 text-white"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                step="0.00000001"
                                placeholder="0.5"
                                value={item.amount || ''}
                                onChange={(e) => updateItem(idx, 'amount', parseFloat(e.target.value))}
                                className="w-full bg-gray-800 rounded px-3 py-2 text-white"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="45000.00"
                                value={item.entryPrice || ''}
                                onChange={(e) => updateItem(idx, 'entryPrice', parseFloat(e.target.value))}
                                className="w-full bg-gray-800 rounded px-3 py-2 text-white"
                              />
                            </td>
                          </>
                        )}
                        {(type === 'cash' || type === 'savings') && (
                          <>
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                placeholder="Main Checking"
                                value={item.name || ''}
                                onChange={(e) => updateItem(idx, 'name', e.target.value)}
                                className="w-full bg-gray-800 rounded px-3 py-2 text-white"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                placeholder="Chase"
                                value={item.bank || ''}
                                onChange={(e) => updateItem(idx, 'bank', e.target.value)}
                                className="w-full bg-gray-800 rounded px-3 py-2 text-white"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="5000.00"
                                value={item.balance || ''}
                                onChange={(e) => updateItem(idx, 'balance', parseFloat(e.target.value))}
                                className="w-full bg-gray-800 rounded px-3 py-2 text-white"
                              />
                            </td>
                          </>
                        )}
                        <td className="py-3 px-4">
                          <button
                            onClick={() => removeRow(idx)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={addEmptyRow}
                className="mt-4 py-2 px-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Row
              </button>
            </div>
          </>
        )}

        {/* Error Message */}
        {error && (
          <div className="mx-6 mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-6 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-6 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleBulkOperation}
            disabled={loading || items.length === 0}
            className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-lg font-medium transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : `${operation === 'add' ? 'Add' : 'Remove'} ${items.length} Items`}
          </button>
        </div>
      </div>
    </div>
  );
}
