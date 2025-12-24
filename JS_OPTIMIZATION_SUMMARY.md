# JS Execution Time Optimization

## Issue
The user reported high JS execution time (2,639 ms Total CPU Time), with specific chunks from `react-icons/gi` and `react-icons/tb` taking significant time to parse and compile.

## Changes Made

1.  **Removed `react-icons/gi` and `react-icons/tb` Dependencies**:
    -   Replaced heavy `react-icons` imports with lightweight `lucide-react` icons across multiple components.
    -   `lucide-react` is already used in the project and is much lighter.

2.  **Deleted Unused Heavy File**:
    -   Deleted `lib/trading-icons.ts` which was importing thousands of icons from `react-icons` but was unused in the project. This prevents it from being accidentally bundled or processed.

3.  **Component Updates**:
    -   `components/financial/net-worth-flow.tsx`: Replaced `TbCoin`, `TbChartLine`, `TbDiamond` with `Coins`, `LineChart`, `Diamond`.
    -   `components/financial/taxes-card.tsx`: Replaced `GiReceiveMoney` with `HandCoins`.
    -   `components/financial/crypto-card.tsx`: Removed unused `Tb` imports, replaced `TbCoin` with `Coins`.
    -   `components/financial/trading-account-card.tsx`: Replaced `TbChartCandle`, `TbChartLine` with `CandlestickChart`, `LineChart`.
    -   `components/financial/stocks-card.tsx`: Removed unused `Tb` imports.
    -   `components/financial/valuable-items-card.tsx`: Replaced `TbDiamond` with `Diamond`.
    -   `components/financial/expenses-card.tsx`: Replaced `TbReceipt` with `Receipt`.
    -   `components/financial/real-estate-card.tsx`: Replaced `TbBuilding` with `Building`.
    -   `components/financial/cash-card.tsx`: Replaced `TbCoin` with `Coins`.
    -   `components/financial/tools-card.tsx`: Replaced `TbChartCandle`, `TbChartLine` with `CandlestickChart`, `LineChart`.

## Expected Result
-   The `react-icons/gi` and `react-icons/tb` chunks should be eliminated or drastically reduced.
-   Total JS parsing and compilation time should decrease significantly.
-   LCP and TBT scores should improve.
