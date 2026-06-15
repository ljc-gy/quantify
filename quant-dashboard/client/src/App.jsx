import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import TitleBar from './components/TitleBar';
import PositionTrend from './components/PositionTrend';
import VolumeMonitor from './components/VolumeMonitor';
import HistoricalReturns from './components/HistoricalReturns';
import ReturnComparison from './components/ReturnComparison';
import RiskMetrics from './components/RiskMetrics';
import RiskWarning from './components/RiskWarning';
import HexMetrics from './components/HexMetrics';
import RevenueCard from './components/RevenueCard';
import AssetAllocationPage from './pages/AssetAllocation';
import RiskControlPage from './pages/RiskControl';
import AlertPage from './pages/AlertPage';
import PositionManagement from './pages/PositionManagement';
import QuantAnalysis from './pages/QuantAnalysis';
import PortfolioManagement from './pages/PortfolioManagement';
import StrategyRecommendation from './pages/StrategyRecommendation';
import FundManagement from './pages/FundManagement';
import StockAnalysis from './pages/StockAnalysis';
import TradeJournal from './pages/TradeJournal';
import SentimentTracker from './pages/SentimentTracker';
import usePortfolioData from './hooks/usePortfolioData';
import { useApiData } from './hooks/useApiData';
import { useTitle } from './hooks/useTitle';
import { useWebSocket } from './hooks/useWebSocket';
import { fetchRiskAssessment } from './services/api';

/* ================================================================
   Dashboard page (route: /)
   ================================================================ */

function DashboardContent({ portfolio }) {
  const { positions, totalMarketVal, totalPnl, dayPnlPct } = portfolio;
  return (
    <div className="flex-1 overflow-auto p-5">
      <div className="grid h-full gap-5" style={{ gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: 'repeat(3, 1fr)' }}>
        <PositionTrend positions={positions} totalMarketVal={totalMarketVal} />
        <RiskWarning positions={positions} />
        <div style={{ gridRow: 'span 3' }} className="flex flex-col gap-5 min-h-0">
          <div className="flex-1 min-h-0">
            <HexMetrics positions={positions} totalMarketVal={totalMarketVal} totalPnl={totalPnl} dayPnlPct={dayPnlPct} />
          </div>
          <div className="flex-1 min-h-0">
            <RevenueCard positions={positions} totalMarketVal={totalMarketVal} totalPnl={totalPnl} dayPnlPct={dayPnlPct} />
          </div>
        </div>
        <VolumeMonitor />
        <HistoricalReturns positions={positions} totalPnl={totalPnl} />
        <ReturnComparison positions={positions} totalMarketVal={totalMarketVal} />
        <RiskMetrics positions={positions} />
      </div>
    </div>
  );
}

function DashboardPage({ portfolio, wsConnected, onRefresh }) {
  useTitle('实时监控');
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <TitleBar onRefresh={onRefresh} wsConnected={wsConnected} pageTitle="实时监控系统" />
      <DashboardContent portfolio={portfolio} />
    </div>
  );
}

/* ================================================================
   Asset page wrapper (route: /asset) — needs TitleBar
   ================================================================ */

function AssetPage({ wsConnected, onRefresh }) {
  useTitle('资产配置');
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <TitleBar onRefresh={onRefresh} wsConnected={wsConnected} pageTitle="资产配置" />
      <AssetAllocationPage />
    </div>
  );
}

/* ================================================================
   App shell — Sidebar + ErrorBoundary + Routes
   ================================================================ */

export default function App() {
  const { data: riskData, refresh: refreshRisk } = useApiData(fetchRiskAssessment);
  const { tickData, snapshotData, connected } = useWebSocket(['000001', '300750', '002594', '688981', '300059']);
  const portfolio = usePortfolioData();
  const effectiveRiskData = snapshotData ?? riskData?.snapshot;

  return (
    <div className="flex h-screen w-screen bg-gradient-to-br from-[#0a0e17] via-[#0f1629] to-[#121a2f] text-cyber-white overflow-hidden">
      <div className="pointer-events-none fixed inset-0 bg-grid" />
      <Sidebar />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<DashboardPage portfolio={portfolio} wsConnected={connected} onRefresh={refreshRisk} />} />
          <Route path="/asset" element={<AssetPage wsConnected={connected} onRefresh={refreshRisk} />} />
          <Route path="/quant" element={<QuantAnalysis />} />
          <Route path="/risk" element={<RiskControlPage />} />
          <Route path="/alert" element={<AlertPage />} />
          <Route path="/position" element={<PositionManagement />} />
          <Route path="/portfolio" element={<PortfolioManagement />} />
          <Route path="/fund" element={<FundManagement />} />
          <Route path="/stock" element={<StockAnalysis />} />
          <Route path="/journal" element={<TradeJournal />} />
          <Route path="/sentiment" element={<SentimentTracker />} />
          <Route path="/strategy" element={<StrategyRecommendation />} />
        </Routes>
      </ErrorBoundary>
    </div>
  );
}
