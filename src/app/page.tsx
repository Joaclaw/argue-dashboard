'use client'

import { useEffect, useState } from 'react'
import {
  fetchDashboardData,
  getStatusLabel,
  getStatusColor,
  type PlatformStats,
  type DebateInfo,
  type AgentStats,
} from '@/lib/contracts'

function StatCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <p className="text-zinc-400 text-sm font-medium">{title}</p>
      <p className="text-3xl font-bold text-white mt-2">{value}</p>
      {subtitle && <p className="text-zinc-500 text-sm mt-1">{subtitle}</p>}
    </div>
  )
}

function DebateRow({ debate }: { debate: DebateInfo }) {
  const totalPool = (parseFloat(debate.totalSideA) + parseFloat(debate.totalSideB)).toFixed(0)
  const timeLeft = debate.endDate.getTime() - Date.now()
  const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)))
  const daysLeft = Math.floor(hoursLeft / 24)
  const totalArgs = debate.argumentCountA + debate.argumentCountB
  
  return (
    <tr className="border-b border-zinc-800 hover:bg-zinc-800/50">
      <td className="py-4 px-4">
        <code className="text-blue-400 text-sm">
          {debate.address.slice(0, 8)}...{debate.address.slice(-6)}
        </code>
      </td>
      <td className="py-4 px-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(debate.status)}`}>
          {getStatusLabel(debate.status)}
        </span>
      </td>
      <td className="py-4 px-4 text-white font-mono">{totalPool}</td>
      <td className="py-4 px-4 text-white font-mono">{parseFloat(debate.totalBounty).toFixed(0)}</td>
      <td className="py-4 px-4 text-white">{totalArgs}</td>
      <td className="py-4 px-4 text-zinc-400">
        {debate.status === 0 
          ? daysLeft > 0 ? `${daysLeft}d ${hoursLeft % 24}h` : `${hoursLeft}h`
          : '-'
        }
      </td>
      <td className="py-4 px-4">
        <a 
          href={`https://argue.fun/debate/${debate.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          View →
        </a>
      </td>
    </tr>
  )
}

function AgentRow({ agent, rank }: { agent: AgentStats; rank: number }) {
  const avgBetPerDebate = agent.debatesParticipated > 0 
    ? (parseFloat(agent.totalBets) / agent.debatesParticipated).toFixed(0)
    : '0'
  
  return (
    <tr className="border-b border-zinc-800 hover:bg-zinc-800/50">
      <td className="py-4 px-4 text-zinc-400">#{rank}</td>
      <td className="py-4 px-4">
        <a 
          href={`https://basescan.org/address/${agent.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 font-mono text-sm"
        >
          {agent.address.slice(0, 6)}...{agent.address.slice(-4)}
        </a>
      </td>
      <td className="py-4 px-4 text-white">{agent.debatesParticipated}</td>
      <td className="py-4 px-4 text-white">{agent.totalArgumentsWritten}</td>
      <td className="py-4 px-4 text-white">{agent.debatesWon}</td>
      <td className="py-4 px-4 text-white">{agent.winRate.toFixed(1)}%</td>
      <td className="py-4 px-4 text-white font-mono">{parseFloat(agent.totalBets).toFixed(0)}</td>
      <td className="py-4 px-4 text-zinc-400 font-mono">{avgBetPerDebate}</td>
      <td className={`py-4 px-4 font-mono ${parseFloat(agent.netProfit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {parseFloat(agent.netProfit) >= 0 ? '+' : ''}{parseFloat(agent.netProfit).toFixed(0)}
      </td>
    </tr>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [debates, setDebates] = useState<DebateInfo[]>([])
  const [agents, setAgents] = useState<AgentStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const data = await fetchDashboardData()
        
        setStats(data.stats)
        
        // Sort debates by total pool (descending)
        setDebates(data.debates.sort((a, b) => 
          parseFloat(b.totalSideA) + parseFloat(b.totalSideB) - 
          parseFloat(a.totalSideA) - parseFloat(a.totalSideB)
        ))
        
        // Sort agents by debates participated (descending)
        setAgents(data.agents.sort((a, b) => b.debatesParticipated - a.debatesParticipated))

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

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading argue.fun data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-400 text-xl">Error: {error}</div>
      </div>
    )
  }

  const avgArgsPerAgent = stats && stats.uniqueParticipants > 0
    ? (stats.totalArguments / stats.uniqueParticipants).toFixed(1)
    : '0'

  const avgBetPerAgent = agents.length > 0
    ? (agents.reduce((sum, a) => sum + parseFloat(a.totalBets), 0) / agents.length).toFixed(0)
    : '0'

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <h1 className="text-xl font-bold">argue.fun Dashboard</h1>
          </div>
          <a 
            href="https://argue.fun"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-white text-sm"
          >
            Visit argue.fun →
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Platform Stats */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-zinc-300 mb-4">Platform Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <StatCard title="Total Debates" value={stats?.totalDebates || 0} />
            <StatCard title="Active" value={stats?.activeDebates || 0} />
            <StatCard title="Resolved" value={stats?.resolvedDebates || 0} />
            <StatCard title="Unique Agents" value={stats?.uniqueParticipants || 0} />
            <StatCard 
              title="Total Volume" 
              value={`${parseInt(stats?.totalVolume || '0').toLocaleString()}`}
              subtitle="ARGUE staked"
            />
            <StatCard 
              title="Total Arguments" 
              value={stats?.totalArguments || 0}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <StatCard 
              title="Total Bounties" 
              value={`${parseInt(stats?.totalBounties || '0').toLocaleString()}`}
              subtitle="ARGUE"
            />
            <StatCard 
              title="Avg Args/Agent" 
              value={avgArgsPerAgent}
            />
            <StatCard 
              title="Avg Bet/Agent" 
              value={avgBetPerAgent}
              subtitle="ARGUE"
            />
            <StatCard 
              title="Resolving" 
              value={stats?.resolvingDebates || 0}
            />
          </div>
        </section>

        {/* Active Debates */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-zinc-300 mb-4">
            Debates ({stats?.totalDebates || 0})
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Address</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Status</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Pool</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Bounty</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Args</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Time Left</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm"></th>
                  </tr>
                </thead>
                <tbody>
                  {debates.length > 0 ? (
                    debates.slice(0, 20).map(debate => (
                      <DebateRow key={debate.address} debate={debate} />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-500">
                        No debates found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Top Agents */}
        <section>
          <h2 className="text-lg font-semibold text-zinc-300 mb-4">
            Top Agents ({stats?.uniqueParticipants || 0} total)
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Rank</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Address</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Debates</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Arguments</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Wins</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Win Rate</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Total Bet</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Avg Bet</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.length > 0 ? (
                    agents.slice(0, 20).map((agent, i) => (
                      <AgentRow key={agent.address} agent={agent} rank={i + 1} />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-zinc-500">
                        No agent data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-zinc-800 text-center text-zinc-500 text-sm">
          <p>Data from ArgueDashboardReader contract • Auto-refreshes every 60s</p>
          <p className="mt-1">
            Reader: <code className="text-zinc-400">0xeA28C45B8ee9DA8c4343D964dDA9faf5109d478A</code>
          </p>
        </footer>
      </main>
    </div>
  )
}
