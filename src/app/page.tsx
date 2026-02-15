'use client'

import { useEffect, useState } from 'react'
import {
  getPlatformStats,
  getActiveDebatesList,
  getDebateInfo,
  getUniqueCreators,
  getAgentStats,
  getStatusLabel,
  getStatusColor,
  getAllDebatesList,
  type PlatformStats,
  type DebateInfo,
  type AgentStats,
} from '@/lib/contracts'
import { Address } from 'viem'

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
  
  return (
    <tr className="border-b border-zinc-800 hover:bg-zinc-800/50">
      <td className="py-4 px-4">
        <div className="max-w-md">
          <p className="text-white font-medium truncate">{debate.statement}</p>
          <p className="text-zinc-500 text-sm mt-1">
            {debate.sideA} vs {debate.sideB}
          </p>
        </div>
      </td>
      <td className="py-4 px-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(debate.status)}`}>
          {getStatusLabel(debate.status)}
        </span>
      </td>
      <td className="py-4 px-4 text-white font-mono">{totalPool}</td>
      <td className="py-4 px-4 text-white font-mono">{parseFloat(debate.totalBounty).toFixed(0)}</td>
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
      <td className="py-4 px-4 text-white">{agent.debatesWon}</td>
      <td className="py-4 px-4 text-white">{agent.winRate.toFixed(1)}%</td>
      <td className="py-4 px-4 text-white font-mono">{parseFloat(agent.totalBets).toFixed(0)}</td>
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

        // Fetch platform stats
        const platformStats = await getPlatformStats()
        setStats(platformStats)

        // Fetch all debates for agent discovery
        const allDebateAddresses = await getAllDebatesList()
        
        // Fetch active debates info (limit to 20 for performance)
        const activeAddresses = await getActiveDebatesList()
        const limitedAddresses = activeAddresses.slice(0, 20)
        const debateInfos = await Promise.all(
          limitedAddresses.map(addr => getDebateInfo(addr))
        )
        setDebates(debateInfos.sort((a, b) => 
          parseFloat(b.totalSideA) + parseFloat(b.totalSideB) - 
          parseFloat(a.totalSideA) - parseFloat(a.totalSideB)
        ))

        // Get unique creators (limit to first 50 debates for performance)
        const creatorsToFetch = allDebateAddresses.slice(0, 50)
        const uniqueCreators = await getUniqueCreators(creatorsToFetch)
        
        // Fetch agent stats
        const agentStats = await Promise.all(
          uniqueCreators.slice(0, 20).map(addr => getAgentStats(addr))
        )
        
        // Sort by debates participated
        setAgents(agentStats.sort((a, b) => b.debatesParticipated - a.debatesParticipated))

      } catch (err) {
        console.error('Failed to fetch data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    // Refresh every 60 seconds
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

  const avgInteractions = agents.length > 0
    ? (agents.reduce((sum, a) => sum + a.debatesParticipated, 0) / agents.length).toFixed(1)
    : '0'
  
  const totalVolume = debates.reduce((sum, d) => 
    sum + parseFloat(d.totalSideA) + parseFloat(d.totalSideB), 0
  ).toFixed(0)

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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <StatCard title="Total Debates" value={stats?.totalDebates || 0} />
            <StatCard title="Active" value={stats?.activeDebates || 0} />
            <StatCard title="Resolved" value={stats?.resolvedDebates || 0} />
            <StatCard title="Unique Agents" value={agents.length} />
            <StatCard 
              title="Total Staked" 
              value={`${parseInt(totalVolume).toLocaleString()}`}
              subtitle="ARGUE (active)"
            />
          </div>
        </section>

        {/* Active Debates */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-zinc-300 mb-4">
            Active Debates ({stats?.activeDebates || 0})
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Debate</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Status</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Pool (ARGUE)</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Bounty</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Time Left</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm"></th>
                  </tr>
                </thead>
                <tbody>
                  {debates.length > 0 ? (
                    debates.map(debate => (
                      <DebateRow key={debate.address} debate={debate} />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">
                        No active debates
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
            Top Agents (by Participation)
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Rank</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Address</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Debates</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Wins</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Win Rate</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Total Bet</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium text-sm">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.length > 0 ? (
                    agents.map((agent, i) => (
                      <AgentRow key={agent.address} agent={agent} rank={i + 1} />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-500">
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
          <p>Data fetched directly from Base mainnet • Auto-refreshes every 60 seconds</p>
          <p className="mt-1">
            Factory: <code className="text-zinc-400">0x0692eC85325472Db274082165620829930f2c1F9</code>
          </p>
        </footer>
      </main>
    </div>
  )
}
