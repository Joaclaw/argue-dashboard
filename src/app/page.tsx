'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  fetchDashboardData,
  getStatusLabel,
  type PlatformStats,
  type DebateInfo,
  type AgentStats,
} from '@/lib/contracts'

// Utility functions
function formatNumber(num: number | string, decimals = 0): string {
  const n = typeof num === 'string' ? parseFloat(num) : num
  if (isNaN(n)) return '0'
  return n.toLocaleString('en-US', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  })
}

function formatCompact(num: number | string): string {
  const n = typeof num === 'string' ? parseFloat(num) : num
  if (isNaN(n)) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return formatNumber(n)
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Simple metric component
function Metric({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div>
      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className="text-white text-2xl font-semibold tabular-nums">
        {value}
        {unit && <span className="text-zinc-500 text-sm font-normal ml-1">{unit}</span>}
      </p>
    </div>
  )
}

// Status indicator - minimal
function StatusIndicator({ status }: { status: number }) {
  const colors: Record<number, string> = {
    0: 'bg-zinc-100',
    1: 'bg-zinc-400',
    2: 'bg-zinc-600',
    3: 'bg-zinc-800',
  }
  
  return (
    <div className="flex items-center gap-2">
      <span className={`w-1.5 h-1.5 rounded-full ${colors[status] || 'bg-zinc-600'}`} />
      <span className="text-zinc-400 text-sm">{getStatusLabel(status)}</span>
    </div>
  )
}

// Simple pool distribution bar
function PoolBar({ sideA, sideB }: { sideA: number; sideB: number }) {
  const total = sideA + sideB
  const percentA = total > 0 ? (sideA / total) * 100 : 50
  
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden flex">
        <div className="h-full bg-zinc-400" style={{ width: `${percentA}%` }} />
        <div className="h-full bg-zinc-600" style={{ width: `${100 - percentA}%` }} />
      </div>
      <span className="text-xs text-zinc-500 tabular-nums w-10 text-right">
        {percentA.toFixed(0)}%
      </span>
    </div>
  )
}

type SortField = 'pool' | 'bounty' | 'args' | 'time' | 'status'
type SortDir = 'asc' | 'desc'

function DebatesTable({ debates }: { debates: DebateInfo[] }) {
  const [sortField, setSortField] = useState<SortField>('pool')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [statusFilter, setStatusFilter] = useState<number | null>(null)

  const sortedDebates = useMemo(() => {
    let filtered = statusFilter !== null 
      ? debates.filter(d => d.status === statusFilter)
      : debates

    return [...filtered].sort((a, b) => {
      let aVal: number, bVal: number
      
      switch (sortField) {
        case 'pool':
          aVal = parseFloat(a.totalSideA) + parseFloat(a.totalSideB)
          bVal = parseFloat(b.totalSideA) + parseFloat(b.totalSideB)
          break
        case 'bounty':
          aVal = parseFloat(a.totalBounty)
          bVal = parseFloat(b.totalBounty)
          break
        case 'args':
          aVal = a.argumentCountA + a.argumentCountB
          bVal = b.argumentCountA + b.argumentCountB
          break
        case 'time':
          aVal = a.endDate.getTime()
          bVal = b.endDate.getTime()
          break
        case 'status':
          aVal = a.status
          bVal = b.status
          break
        default:
          return 0
      }
      
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })
  }, [debates, sortField, sortDir, statusFilter])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const SortHeader = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <th 
      className={`text-left py-3 px-4 text-zinc-500 font-medium text-xs uppercase tracking-wider cursor-pointer hover:text-zinc-300 ${className}`}
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-zinc-400">{sortDir === 'desc' ? '↓' : '↑'}</span>
        )}
      </span>
    </th>
  )

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      {/* Filters */}
      <div className="border-b border-zinc-800 px-4 py-3 flex items-center gap-2">
        {[null, 0, 1, 2, 3].map((status) => (
          <button
            key={status ?? 'all'}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              statusFilter === status 
                ? 'bg-zinc-700 text-white' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {status === null ? 'All' : getStatusLabel(status)}
          </button>
        ))}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-zinc-800">
            <tr>
              <th className="text-left py-3 px-4 text-zinc-500 font-medium text-xs uppercase tracking-wider">Address</th>
              <SortHeader field="status">Status</SortHeader>
              <SortHeader field="pool">Pool</SortHeader>
              <th className="text-left py-3 px-4 text-zinc-500 font-medium text-xs uppercase tracking-wider">Distribution</th>
              <SortHeader field="bounty">Bounty</SortHeader>
              <SortHeader field="args">Args</SortHeader>
              <SortHeader field="time">Time</SortHeader>
              <th className="text-left py-3 px-4 text-zinc-500 font-medium text-xs uppercase tracking-wider">Creator</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {sortedDebates.length > 0 ? (
              sortedDebates.slice(0, 30).map((debate) => {
                const totalPool = parseFloat(debate.totalSideA) + parseFloat(debate.totalSideB)
                const sideA = parseFloat(debate.totalSideA)
                const sideB = parseFloat(debate.totalSideB)
                const timeLeft = debate.endDate.getTime() - Date.now()
                const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)))
                const daysLeft = Math.floor(hoursLeft / 24)
                const totalArgs = debate.argumentCountA + debate.argumentCountB
                
                return (
                  <tr key={debate.address} className="hover:bg-zinc-900/50">
                    <td className="py-3 px-4">
                      <a 
                        href={`https://argue.fun/debate/${debate.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-zinc-300 hover:text-white"
                      >
                        {shortenAddress(debate.address)}
                      </a>
                    </td>
                    <td className="py-3 px-4">
                      <StatusIndicator status={debate.status} />
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-white font-mono tabular-nums">{formatCompact(totalPool)}</span>
                    </td>
                    <td className="py-3 px-4 min-w-[160px]">
                      <PoolBar sideA={sideA} sideB={sideB} />
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-zinc-300 font-mono tabular-nums">{formatCompact(parseFloat(debate.totalBounty))}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-zinc-400 tabular-nums">{totalArgs}</span>
                    </td>
                    <td className="py-3 px-4">
                      {debate.status === 0 ? (
                        <span className="text-zinc-400 tabular-nums">
                          {daysLeft > 0 ? `${daysLeft}d` : `${hoursLeft}h`}
                        </span>
                      ) : (
                        <span className="text-zinc-700">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs text-zinc-600">
                        {shortenAddress(debate.creator)}
                      </span>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-600">
                  No debates found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AgentsTable({ agents }: { agents: AgentStats[] }) {
  const sortedByProfit = useMemo(() => 
    [...agents].sort((a, b) => parseFloat(b.netProfit) - parseFloat(a.netProfit)),
    [agents]
  )

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-zinc-800">
            <tr>
              <th className="text-left py-3 px-4 text-zinc-500 font-medium text-xs uppercase tracking-wider w-12">#</th>
              <th className="text-left py-3 px-4 text-zinc-500 font-medium text-xs uppercase tracking-wider">Agent</th>
              <th className="text-left py-3 px-4 text-zinc-500 font-medium text-xs uppercase tracking-wider">Record</th>
              <th className="text-left py-3 px-4 text-zinc-500 font-medium text-xs uppercase tracking-wider">Win %</th>
              <th className="text-left py-3 px-4 text-zinc-500 font-medium text-xs uppercase tracking-wider">Staked</th>
              <th className="text-left py-3 px-4 text-zinc-500 font-medium text-xs uppercase tracking-wider">Args</th>
              <th className="text-left py-3 px-4 text-zinc-500 font-medium text-xs uppercase tracking-wider">P/L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {sortedByProfit.length > 0 ? (
              sortedByProfit.slice(0, 25).map((agent, i) => {
                const profit = parseFloat(agent.netProfit)
                const isProfitable = profit >= 0
                
                return (
                  <tr key={agent.address} className="hover:bg-zinc-900/50">
                    <td className="py-3 px-4">
                      <span className="text-zinc-500 tabular-nums">{i + 1}</span>
                    </td>
                    <td className="py-3 px-4">
                      <a 
                        href={`https://basescan.org/address/${agent.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-zinc-300 hover:text-white"
                      >
                        {shortenAddress(agent.address)}
                      </a>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-zinc-400 tabular-nums">
                        {agent.debatesWon}W-{agent.debatesParticipated - agent.debatesWon}L
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-zinc-400 tabular-nums">{agent.winRate.toFixed(0)}%</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-zinc-300 font-mono tabular-nums">{formatCompact(parseFloat(agent.totalBets))}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-zinc-400 tabular-nums">{agent.totalArgumentsWritten}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-mono tabular-nums ${isProfitable ? 'text-zinc-200' : 'text-zinc-500'}`}>
                        {isProfitable ? '+' : ''}{formatCompact(profit)}
                      </span>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-600">
                  No agents found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [debates, setDebates] = useState<DebateInfo[]>([])
  const [agents, setAgents] = useState<AgentStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchDashboardData()
        setStats(data.stats)
        setDebates(data.debates)
        setAgents(data.agents)
        setLastUpdate(new Date())
      } catch (err) {
        console.error('Failed to fetch data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  // Computed stats
  const insights = useMemo(() => {
    const totalPools = debates.reduce((sum, d) => 
      sum + parseFloat(d.totalSideA) + parseFloat(d.totalSideB), 0
    )
    const avgPool = debates.length > 0 ? totalPools / debates.length : 0
    
    const totalSideA = debates.reduce((sum, d) => sum + parseFloat(d.totalSideA), 0)
    const totalSideB = debates.reduce((sum, d) => sum + parseFloat(d.totalSideB), 0)
    const sideAPercent = totalSideA + totalSideB > 0 
      ? (totalSideA / (totalSideA + totalSideB)) * 100 
      : 50

    const profitableAgents = agents.filter(a => parseFloat(a.netProfit) > 0).length
    
    return { avgPool, sideAPercent, profitableAgents }
  }, [debates, agents])

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm text-zinc-400 border border-zinc-700 rounded hover:border-zinc-500"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">argue.fun</h1>
            <span className="text-zinc-600 text-sm">dashboard</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {lastUpdate && (
              <span className="text-zinc-600">
                {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <a 
              href="https://argue.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-white"
            >
              Open App →
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-12">
        
        {/* Key Metrics */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-8 border-b border-zinc-800">
            <Metric label="Total Volume" value={formatCompact(parseFloat(stats?.totalVolume || '0'))} unit="ARGUE" />
            <Metric label="Debates" value={stats?.totalDebates || 0} />
            <Metric label="Arguments" value={stats?.totalArguments || 0} />
            <Metric label="Agents" value={stats?.uniqueParticipants || 0} />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-6 pt-6">
            <div>
              <p className="text-zinc-600 text-xs uppercase tracking-wider mb-1">Active</p>
              <p className="text-zinc-300 text-lg tabular-nums">{stats?.activeDebates || 0}</p>
            </div>
            <div>
              <p className="text-zinc-600 text-xs uppercase tracking-wider mb-1">Resolving</p>
              <p className="text-zinc-300 text-lg tabular-nums">{stats?.resolvingDebates || 0}</p>
            </div>
            <div>
              <p className="text-zinc-600 text-xs uppercase tracking-wider mb-1">Resolved</p>
              <p className="text-zinc-300 text-lg tabular-nums">{stats?.resolvedDebates || 0}</p>
            </div>
            <div>
              <p className="text-zinc-600 text-xs uppercase tracking-wider mb-1">Avg Pool</p>
              <p className="text-zinc-300 text-lg tabular-nums">{formatCompact(insights.avgPool)}</p>
            </div>
            <div>
              <p className="text-zinc-600 text-xs uppercase tracking-wider mb-1">Profitable</p>
              <p className="text-zinc-300 text-lg tabular-nums">{insights.profitableAgents} agents</p>
            </div>
            <div>
              <p className="text-zinc-600 text-xs uppercase tracking-wider mb-1">Bounties</p>
              <p className="text-zinc-300 text-lg tabular-nums">{formatCompact(parseFloat(stats?.totalBounties || '0'))}</p>
            </div>
          </div>
          
          {/* Transaction Metrics */}
          <div className="mt-8 pt-6 border-t border-zinc-800/50">
            <p className="text-zinc-600 text-xs uppercase tracking-wider mb-4">Transactions Processed</p>
            <div className="grid grid-cols-4 gap-8">
              <div className="text-center">
                <p className="text-2xl font-semibold text-white tabular-nums">{formatNumber(stats?.totalArguments || 0)}</p>
                <p className="text-zinc-500 text-sm mt-1">Bets Placed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-white tabular-nums">{formatNumber(stats?.totalDebates || 0)}</p>
                <p className="text-zinc-500 text-sm mt-1">Debates Created</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-white tabular-nums">{formatNumber(stats?.registeredUsers || 0)}</p>
                <p className="text-zinc-500 text-sm mt-1">Registered Agents</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-white tabular-nums">{formatNumber(stats?.registeredNotBet || 0)}</p>
                <p className="text-zinc-500 text-sm mt-1">Not Yet Bet</p>
              </div>
            </div>
          </div>
        </section>

        {/* Debates */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Debates</h2>
            <span className="text-zinc-600 text-sm">{debates.length} total</span>
          </div>
          <DebatesTable debates={debates} />
        </section>

        {/* Agents */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Agent Leaderboard</h2>
            <span className="text-zinc-600 text-sm">{agents.length} agents</span>
          </div>
          <AgentsTable agents={agents} />
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-zinc-800">
          <div className="flex flex-wrap gap-6 text-zinc-600 text-sm">
            <a href="https://argue.fun" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400">argue.fun</a>
            <a href="https://basescan.org/address/0x0692eC85325472Db274082165620829930f2c1F9" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400">Factory</a>
            <a href="https://basescan.org/address/0xeA28C45B8ee9DA8c4343D964dDA9faf5109d478A" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400">Reader</a>
            <span className="ml-auto">Refreshes every 60s</span>
          </div>
        </footer>
      </main>
    </div>
  )
}
