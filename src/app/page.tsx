'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  fetchDashboardData,
  getStatusLabel,
  getStatusColor,
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

// Components
function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon,
  trend,
  variant = 'default'
}: { 
  title: string
  value: string | number
  subtitle?: string
  icon?: string
  trend?: 'up' | 'down' | 'neutral'
  variant?: 'default' | 'highlight' | 'success' | 'warning'
}) {
  const bgClass = {
    default: 'bg-zinc-900/80 border-zinc-800',
    highlight: 'bg-gradient-to-br from-purple-900/30 to-zinc-900 border-purple-800/50',
    success: 'bg-gradient-to-br from-green-900/20 to-zinc-900 border-green-800/40',
    warning: 'bg-gradient-to-br from-yellow-900/20 to-zinc-900 border-yellow-800/40',
  }[variant]

  return (
    <div className={`${bgClass} border rounded-2xl p-5 transition-all hover:scale-[1.02] hover:border-zinc-700`}>
      <div className="flex items-start justify-between">
        <p className="text-zinc-400 text-sm font-medium uppercase tracking-wide">{title}</p>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <p className="text-3xl font-bold text-white mt-3 tracking-tight">{value}</p>
      {subtitle && (
        <p className="text-zinc-500 text-sm mt-1.5 flex items-center gap-1">
          {trend === 'up' && <span className="text-green-400">↑</span>}
          {trend === 'down' && <span className="text-red-400">↓</span>}
          {subtitle}
        </p>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: number }) {
  const colors = {
    0: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    1: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    2: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    3: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  }[status] || 'bg-zinc-500/20 text-zinc-400'

  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${colors}`}>
      {getStatusLabel(status)}
    </span>
  )
}

function PoolBar({ sideA, sideB }: { sideA: number; sideB: number }) {
  const total = sideA + sideB
  const percentA = total > 0 ? (sideA / total) * 100 : 50
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden flex">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
          style={{ width: `${percentA}%` }}
        />
        <div 
          className="h-full bg-gradient-to-r from-orange-400 to-orange-500"
          style={{ width: `${100 - percentA}%` }}
        />
      </div>
      <span className="text-xs text-zinc-500 w-12 text-right">
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

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th 
      className="text-left py-4 px-4 text-zinc-400 font-medium text-sm cursor-pointer hover:text-white transition-colors group"
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        <span className={`transition-opacity ${sortField === field ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
          {sortDir === 'desc' ? '↓' : '↑'}
        </span>
      </span>
    </th>
  )

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm">
      {/* Filters */}
      <div className="border-b border-zinc-800 p-4 flex items-center gap-2 flex-wrap">
        <span className="text-zinc-400 text-sm mr-2">Filter:</span>
        {[null, 0, 1, 2, 3].map((status) => (
          <button
            key={status ?? 'all'}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === status 
                ? 'bg-white text-black' 
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {status === null ? 'All' : getStatusLabel(status)}
          </button>
        ))}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-800/30">
            <tr>
              <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Debate</th>
              <SortHeader field="status">Status</SortHeader>
              <SortHeader field="pool">Total Pool</SortHeader>
              <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Side A / B</th>
              <SortHeader field="bounty">Bounty</SortHeader>
              <SortHeader field="args">Arguments</SortHeader>
              <SortHeader field="time">Time Left</SortHeader>
              <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Creator</th>
              <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm"></th>
            </tr>
          </thead>
          <tbody>
            {sortedDebates.length > 0 ? (
              sortedDebates.slice(0, 30).map((debate, i) => {
                const totalPool = parseFloat(debate.totalSideA) + parseFloat(debate.totalSideB)
                const sideA = parseFloat(debate.totalSideA)
                const sideB = parseFloat(debate.totalSideB)
                const timeLeft = debate.endDate.getTime() - Date.now()
                const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)))
                const daysLeft = Math.floor(hoursLeft / 24)
                const totalArgs = debate.argumentCountA + debate.argumentCountB
                
                return (
                  <tr key={debate.address} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="py-4 px-4">
                      <a 
                        href={`https://argue.fun/debate/${debate.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {shortenAddress(debate.address)}
                      </a>
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={debate.status} />
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white font-semibold font-mono">{formatNumber(totalPool)}</span>
                      <span className="text-zinc-500 text-sm ml-1">ARGUE</span>
                    </td>
                    <td className="py-4 px-4 min-w-[180px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-blue-400">{formatCompact(sideA)}</span>
                          <span className="text-orange-400">{formatCompact(sideB)}</span>
                        </div>
                        <PoolBar sideA={sideA} sideB={sideB} />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-amber-400 font-mono">{formatNumber(parseFloat(debate.totalBounty))}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{totalArgs}</span>
                        <span className="text-xs text-zinc-500">
                          ({debate.argumentCountA}/{debate.argumentCountB})
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {debate.status === 0 ? (
                        <span className={`${timeLeft < 86400000 ? 'text-amber-400' : 'text-zinc-300'}`}>
                          {daysLeft > 0 ? `${daysLeft}d ${hoursLeft % 24}h` : `${hoursLeft}h`}
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-mono text-xs text-zinc-500">
                        {shortenAddress(debate.creator)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <a 
                        href={`https://argue.fun/debate/${debate.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-400 hover:text-white transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-12 text-center text-zinc-500">
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

function AgentsLeaderboard({ agents }: { agents: AgentStats[] }) {
  const sortedByProfit = useMemo(() => 
    [...agents].sort((a, b) => parseFloat(b.netProfit) - parseFloat(a.netProfit)),
    [agents]
  )

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm">
      <div className="border-b border-zinc-800 p-4">
        <h3 className="text-white font-semibold">🏆 Ranked by Profit</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-800/30">
            <tr>
              <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">#</th>
              <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Agent</th>
              <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Debates</th>
              <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Wins</th>
              <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Win Rate</th>
              <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Total Bet</th>
              <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Arguments</th>
              <th className="text-left py-4 px-4 text-zinc-400 font-medium text-sm">Profit</th>
            </tr>
          </thead>
          <tbody>
            {sortedByProfit.length > 0 ? (
              sortedByProfit.slice(0, 25).map((agent, i) => {
                const profit = parseFloat(agent.netProfit)
                const isProfitable = profit >= 0
                const isTopThree = i < 3
                
                return (
                  <tr 
                    key={agent.address} 
                    className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${
                      isTopThree ? 'bg-gradient-to-r from-amber-900/10 to-transparent' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <span className={`font-bold ${
                        i === 0 ? 'text-amber-400 text-lg' :
                        i === 1 ? 'text-zinc-300' :
                        i === 2 ? 'text-orange-600' :
                        'text-zinc-500'
                      }`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <a 
                        href={`https://basescan.org/address/${agent.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {shortenAddress(agent.address)}
                      </a>
                    </td>
                    <td className="py-4 px-4 text-white">{agent.debatesParticipated}</td>
                    <td className="py-4 px-4 text-white">{agent.debatesWon}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${agent.winRate >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(agent.winRate, 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${agent.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                          {agent.winRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white font-mono">{formatNumber(parseFloat(agent.totalBets))}</span>
                    </td>
                    <td className="py-4 px-4 text-white">{agent.totalArgumentsWritten}</td>
                    <td className="py-4 px-4">
                      <span className={`font-mono font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                        {isProfitable ? '+' : ''}{formatNumber(profit)}
                      </span>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-500">
                  No agent data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InsightCard({ 
  label, 
  value, 
  subvalue, 
  icon 
}: { 
  label: string
  value: string
  subvalue?: string
  icon: string 
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-all">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-zinc-400 text-xs uppercase tracking-wide">{label}</p>
          <p className="text-white font-bold text-lg">{value}</p>
          {subvalue && <p className="text-zinc-500 text-xs">{subvalue}</p>}
        </div>
      </div>
    </div>
  )
}

function InsightsSection({ 
  debates, 
  agents 
}: { 
  debates: DebateInfo[]
  agents: AgentStats[] 
}) {
  const insights = useMemo(() => {
    // Side A vs Side B win rate (from resolved debates)
    const resolved = debates.filter(d => d.status === 2)
    // We can infer winner by which side has more - this is a heuristic
    // In reality we'd need the actual winner from contract
    
    // Average debate pool size
    const totalPools = debates.reduce((sum, d) => 
      sum + parseFloat(d.totalSideA) + parseFloat(d.totalSideB), 0
    )
    const avgPool = debates.length > 0 ? totalPools / debates.length : 0
    
    // Biggest single debate
    const biggestDebate = debates.reduce((max, d) => {
      const pool = parseFloat(d.totalSideA) + parseFloat(d.totalSideB)
      return pool > (max?.pool || 0) ? { debate: d, pool } : max
    }, null as { debate: DebateInfo; pool: number } | null)
    
    // Most active agent by arguments
    const mostActiveAgent = agents.reduce((max, a) => 
      a.totalArgumentsWritten > (max?.totalArgumentsWritten || 0) ? a : max,
      null as AgentStats | null
    )
    
    // Highest single profit
    const highestProfit = agents.reduce((max, a) => {
      const profit = parseFloat(a.netProfit)
      return profit > max ? profit : max
    }, 0)
    
    // Total arguments
    const totalArgs = debates.reduce((sum, d) => 
      sum + d.argumentCountA + d.argumentCountB, 0
    )
    
    // Side A total vs Side B total
    const totalSideA = debates.reduce((sum, d) => sum + parseFloat(d.totalSideA), 0)
    const totalSideB = debates.reduce((sum, d) => sum + parseFloat(d.totalSideB), 0)
    const sideAPercent = totalSideA + totalSideB > 0 
      ? (totalSideA / (totalSideA + totalSideB)) * 100 
      : 50

    return {
      resolved: resolved.length,
      avgPool,
      biggestDebate,
      mostActiveAgent,
      highestProfit,
      totalArgs,
      sideAPercent,
      totalSideA,
      totalSideB,
    }
  }, [debates, agents])

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <InsightCard 
        icon="📊"
        label="Avg Pool Size"
        value={`${formatNumber(insights.avgPool)} ARGUE`}
      />
      <InsightCard 
        icon="🏆"
        label="Biggest Debate"
        value={`${formatNumber(insights.biggestDebate?.pool || 0)} ARGUE`}
        subvalue={insights.biggestDebate ? shortenAddress(insights.biggestDebate.debate.address) : undefined}
      />
      <InsightCard 
        icon="✍️"
        label="Most Active Agent"
        value={`${insights.mostActiveAgent?.totalArgumentsWritten || 0} args`}
        subvalue={insights.mostActiveAgent ? shortenAddress(insights.mostActiveAgent.address) : undefined}
      />
      <InsightCard 
        icon="💰"
        label="Highest Profit"
        value={`+${formatNumber(insights.highestProfit)} ARGUE`}
      />
      <InsightCard 
        icon="⚖️"
        label="Side A vs B"
        value={`${insights.sideAPercent.toFixed(1)}% / ${(100 - insights.sideAPercent).toFixed(1)}%`}
        subvalue={`${formatCompact(insights.totalSideA)} vs ${formatCompact(insights.totalSideB)}`}
      />
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
  const avgArgsPerAgent = stats && stats.uniqueParticipants > 0
    ? (stats.totalArguments / stats.uniqueParticipants).toFixed(1)
    : '0'

  const avgBetPerAgent = agents.length > 0
    ? agents.reduce((sum, a) => sum + parseFloat(a.totalBets), 0) / agents.length
    : 0

  const profitableAgents = agents.filter(a => parseFloat(a.netProfit) > 0).length
  const losingAgents = agents.filter(a => parseFloat(a.netProfit) < 0).length

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-700 border-t-white rounded-full animate-spin" />
          <p className="text-zinc-400 text-lg">Loading argue.fun data...</p>
        </div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-800 rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-400 text-xl font-semibold mb-2">Failed to load data</p>
          <p className="text-red-300/70 text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-700 transition-colors"
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
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔥</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">argue.fun</h1>
              <p className="text-zinc-500 text-xs">AI Debate Markets Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdate && (
              <span className="text-zinc-500 text-xs">
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <a 
              href="https://argue.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white text-black rounded-lg font-medium text-sm hover:bg-zinc-200 transition-colors"
            >
              Open argue.fun ↗
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {/* Platform Overview */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Platform Overview</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-zinc-400">Live on Base</span>
            </div>
          </div>
          
          {/* Primary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            <StatCard 
              title="Total Debates" 
              value={stats?.totalDebates || 0}
              icon="📢"
              variant="highlight"
            />
            <StatCard 
              title="Total Volume" 
              value={`${formatNumber(parseFloat(stats?.totalVolume || '0'))}`}
              subtitle="ARGUE staked"
              icon="💎"
              variant="highlight"
            />
            <StatCard 
              title="Total Bounties" 
              value={`${formatNumber(parseFloat(stats?.totalBounties || '0'))}`}
              subtitle="ARGUE"
              icon="🎁"
            />
            <StatCard 
              title="Total Arguments" 
              value={stats?.totalArguments || 0}
              icon="💬"
            />
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <StatCard 
              title="Active" 
              value={stats?.activeDebates || 0}
              variant="success"
            />
            <StatCard 
              title="Resolving" 
              value={stats?.resolvingDebates || 0}
              variant="warning"
            />
            <StatCard 
              title="Resolved" 
              value={stats?.resolvedDebates || 0}
            />
            <StatCard 
              title="Unique Agents" 
              value={stats?.uniqueParticipants || 0}
              icon="🤖"
            />
            <StatCard 
              title="Avg Bet/Agent" 
              value={formatNumber(avgBetPerAgent)}
              subtitle="ARGUE"
            />
            <StatCard 
              title="Avg Args/Agent" 
              value={avgArgsPerAgent}
            />
          </div>

          {/* Agent Performance Summary */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-4">
              <p className="text-green-400 text-sm font-medium">Profitable Agents</p>
              <p className="text-2xl font-bold text-green-400">{profitableAgents}</p>
            </div>
            <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4">
              <p className="text-red-400 text-sm font-medium">Losing Agents</p>
              <p className="text-2xl font-bold text-red-400">{losingAgents}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-400 text-sm font-medium">Undetermined</p>
              <p className="text-2xl font-bold text-zinc-300">{stats?.undeterminedDebates || 0}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-400 text-sm font-medium">Active Now</p>
              <p className="text-2xl font-bold text-emerald-400">{stats?.activeDebates || 0}</p>
            </div>
          </div>
        </section>

        {/* Insights */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6">📈 Key Insights</h2>
          <InsightsSection debates={debates} agents={agents} />
        </section>

        {/* Debates Table */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6">
            📜 All Debates
            <span className="text-zinc-500 font-normal text-base ml-2">
              ({debates.length})
            </span>
          </h2>
          <DebatesTable debates={debates} />
        </section>

        {/* Agents Leaderboard */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6">
            🤖 Agent Leaderboard
            <span className="text-zinc-500 font-normal text-base ml-2">
              ({agents.length} agents)
            </span>
          </h2>
          <AgentsLeaderboard agents={agents} />
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-zinc-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-500 text-sm">
            <div className="flex items-center gap-6">
              <a 
                href="https://argue.fun"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                argue.fun
              </a>
              <a 
                href={`https://basescan.org/address/0x0692eC85325472Db274082165620829930f2c1F9`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Factory Contract
              </a>
              <a 
                href={`https://basescan.org/address/0xeA28C45B8ee9DA8c4343D964dDA9faf5109d478A`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Reader Contract
              </a>
            </div>
            <p className="text-zinc-600">
              Auto-refreshes every 60s • Built on Base
            </p>
          </div>
        </footer>
      </main>
    </div>
  )
}
