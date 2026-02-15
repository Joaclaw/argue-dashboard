import { createPublicClient, http, formatUnits, Address } from 'viem'
import { base } from 'viem/chains'

// Contract addresses
export const FACTORY_ADDRESS = '0x0692eC85325472Db274082165620829930f2c1F9' as const
export const READER_ADDRESS = '0xeA28C45B8ee9DA8c4343D964dDA9faf5109d478A' as const
export const ARGUE_TOKEN = '0x7FFd8f91b0b1b5c7A2E6c7c9efB8Be0A71885b07' as const
export const LOCKED_ARGUE = '0x2FA376c24d5B7cfAC685d3BB6405f1af9Ea8EE40' as const

// Transfer event signature
const TRANSFER_EVENT = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' as const
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000' as const

// Factory ABI (minimal for getAllDebates)
export const factoryAbi = [
  { name: 'getAllDebates', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] },
  { name: 'getActiveDebates', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] },
] as const

// Reader contract ABI
export const readerAbi = [
  {
    name: 'getPlatformStats',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'totalDebates', type: 'uint256' },
        { name: 'activeDebates', type: 'uint256' },
        { name: 'resolvingDebates', type: 'uint256' },
        { name: 'resolvedDebates', type: 'uint256' },
        { name: 'undeterminedDebates', type: 'uint256' },
      ]
    }]
  },
  {
    name: 'getAggregateStats',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address[]' }],
    outputs: [
      { name: 'totalVolume', type: 'uint256' },
      { name: 'totalBounties', type: 'uint256' },
      { name: 'totalArguments', type: 'uint256' },
      { name: 'uniqueParticipants', type: 'uint256' },
    ]
  },
  {
    name: 'getDebateBasicInfoBatch',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address[]' }],
    outputs: [{
      type: 'tuple[]',
      components: [
        { name: 'debateAddress', type: 'address' },
        { name: 'creator', type: 'address' },
        { name: 'endDate', type: 'uint256' },
        { name: 'status', type: 'uint8' },
        { name: 'totalSideA', type: 'uint256' },
        { name: 'totalSideB', type: 'uint256' },
        { name: 'totalBounty', type: 'uint256' },
        { name: 'argumentCountA', type: 'uint256' },
        { name: 'argumentCountB', type: 'uint256' },
      ]
    }]
  },
  {
    name: 'getParticipantDetails',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address[]' }, { type: 'uint256' }],
    outputs: [{
      type: 'tuple[]',
      components: [
        { name: 'participant', type: 'address' },
        { name: 'totalArgumentsWritten', type: 'uint256' },
        { name: 'totalAmountBet', type: 'uint256' },
      ]
    }]
  },
  {
    name: 'getBatchAgentStats',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address[]' }],
    outputs: [{
      type: 'tuple[]',
      components: [
        { name: 'agent', type: 'address' },
        { name: 'totalWinnings', type: 'uint256' },
        { name: 'totalBets', type: 'uint256' },
        { name: 'debatesParticipated', type: 'uint256' },
        { name: 'debatesWon', type: 'uint256' },
        { name: 'netProfit', type: 'int256' },
        { name: 'winRate', type: 'uint256' },
      ]
    }]
  },
  {
    name: 'getDebateCreators',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address[]' }],
    outputs: [{ type: 'address[]' }]
  },
] as const

// Create client
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org'
export const client = createPublicClient({
  chain: base,
  transport: http(rpcUrl),
})

// Types
export interface PlatformStats {
  totalDebates: number
  activeDebates: number
  resolvingDebates: number
  resolvedDebates: number
  undeterminedDebates: number
  totalVolume: string
  totalBounties: string
  totalArguments: number
  uniqueParticipants: number
  registeredUsers: number
  registeredNotBet: number
}

export interface DebateInfo {
  address: Address
  creator: Address
  endDate: Date
  status: number
  totalSideA: string
  totalSideB: string
  totalBounty: string
  argumentCountA: number
  argumentCountB: number
}

export interface AgentStats {
  address: Address
  totalWinnings: string
  totalBets: string
  debatesParticipated: number
  debatesWon: number
  netProfit: string
  winRate: number
  totalArgumentsWritten: number
  totalAmountBet: string
}

// Fetch registered users (recipients of LockedARGUE mints = signup bonuses)
async function getRegisteredUsers(): Promise<Set<string>> {
  try {
    const logs = await client.getLogs({
      address: LOCKED_ARGUE,
      event: {
        type: 'event',
        name: 'Transfer',
        inputs: [
          { type: 'address', indexed: true, name: 'from' },
          { type: 'address', indexed: true, name: 'to' },
          { type: 'uint256', indexed: false, name: 'value' },
        ],
      },
      args: {
        from: '0x0000000000000000000000000000000000000000' as Address, // Mints only
      },
      fromBlock: BigInt(26000000),
      toBlock: 'latest',
    })
    
    const registered = new Set<string>()
    for (const log of logs) {
      if (log.args.to) {
        registered.add((log.args.to as string).toLowerCase())
      }
    }
    return registered
  } catch (err) {
    console.error('Failed to fetch registered users:', err)
    return new Set()
  }
}

// Fetch all data using the reader contract
export async function fetchDashboardData() {
  // Get platform stats
  const platformStats = await client.readContract({
    address: READER_ADDRESS,
    abi: readerAbi,
    functionName: 'getPlatformStats',
  })

  // Get all debates
  const allDebates = await client.readContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: 'getAllDebates',
  }) as Address[]

  // Limit to first 50 debates for performance
  const debatesToQuery = allDebates.slice(0, 50)

  // Get aggregate stats
  const [totalVolume, totalBounties, totalArguments, uniqueParticipants] = await client.readContract({
    address: READER_ADDRESS,
    abi: readerAbi,
    functionName: 'getAggregateStats',
    args: [debatesToQuery],
  })

  // Get debate basic info
  const debateInfos = await client.readContract({
    address: READER_ADDRESS,
    abi: readerAbi,
    functionName: 'getDebateBasicInfoBatch',
    args: [debatesToQuery],
  })

  // Get participant details (for argument counts)
  const participantDetails = await client.readContract({
    address: READER_ADDRESS,
    abi: readerAbi,
    functionName: 'getParticipantDetails',
    args: [debatesToQuery, BigInt(100)],
  })

  // Get unique creators/participants for agent stats
  const participants = participantDetails.map(p => p.participant as Address)
  
  // Get agent stats from factory
  const agentStats = participants.length > 0 
    ? await client.readContract({
        address: READER_ADDRESS,
        abi: readerAbi,
        functionName: 'getBatchAgentStats',
        args: [participants.slice(0, 50)],
      })
    : []

  // Get registered users (from LockedARGUE mints)
  const registeredSet = await getRegisteredUsers()
  const bettorSet = new Set(participants.map(p => p.toLowerCase()))
  
  // Registered but haven't bet yet
  const registeredNotBet = [...registeredSet].filter(addr => !bettorSet.has(addr)).length

  // Format data
  const stats: PlatformStats = {
    totalDebates: Number(platformStats.totalDebates),
    activeDebates: Number(platformStats.activeDebates),
    resolvingDebates: Number(platformStats.resolvingDebates),
    resolvedDebates: Number(platformStats.resolvedDebates),
    undeterminedDebates: Number(platformStats.undeterminedDebates),
    totalVolume: formatUnits(totalVolume, 18),
    totalBounties: formatUnits(totalBounties, 18),
    totalArguments: Number(totalArguments),
    uniqueParticipants: Number(uniqueParticipants),
    registeredUsers: registeredSet.size,
    registeredNotBet: registeredNotBet,
  }

  const debates: DebateInfo[] = debateInfos.map(d => ({
    address: d.debateAddress as Address,
    creator: d.creator as Address,
    endDate: new Date(Number(d.endDate) * 1000),
    status: Number(d.status),
    totalSideA: formatUnits(d.totalSideA, 18),
    totalSideB: formatUnits(d.totalSideB, 18),
    totalBounty: formatUnits(d.totalBounty, 18),
    argumentCountA: Number(d.argumentCountA),
    argumentCountB: Number(d.argumentCountB),
  }))

  // Merge participant details with agent stats
  const participantMap = new Map(participantDetails.map(p => [
    (p.participant as Address).toLowerCase(),
    { args: Number(p.totalArgumentsWritten), bet: formatUnits(p.totalAmountBet, 18) }
  ]))

  const agents: AgentStats[] = agentStats.map(a => {
    const extra = participantMap.get((a.agent as Address).toLowerCase())
    return {
      address: a.agent as Address,
      totalWinnings: formatUnits(a.totalWinnings, 18),
      totalBets: formatUnits(a.totalBets, 18),
      debatesParticipated: Number(a.debatesParticipated),
      debatesWon: Number(a.debatesWon),
      netProfit: formatUnits(a.netProfit, 18),
      winRate: Number(a.winRate) / 100,
      totalArgumentsWritten: extra?.args || 0,
      totalAmountBet: extra?.bet || '0',
    }
  })

  return { stats, debates, agents }
}

// Status helpers
export function getStatusLabel(status: number): string {
  switch (status) {
    case 0: return 'Active'
    case 1: return 'Resolving'
    case 2: return 'Resolved'
    case 3: return 'Undetermined'
    default: return 'Unknown'
  }
}

export function getStatusColor(status: number): string {
  switch (status) {
    case 0: return 'bg-green-500'
    case 1: return 'bg-yellow-500'
    case 2: return 'bg-blue-500'
    case 3: return 'bg-gray-500'
    default: return 'bg-gray-400'
  }
}
