import { createPublicClient, http, formatUnits, Address } from 'viem'
import { base } from 'viem/chains'

// Contract addresses
export const FACTORY_ADDRESS = '0x0692eC85325472Db274082165620829930f2c1F9' as const
export const ARGUE_TOKEN = '0x7FFd8f91b0b1b5c7A2E6c7c9efB8Be0A71885b07' as const
export const LOCKED_ARGUE = '0x2FA376c24d5B7cfAC685d3BB6405f1af9Ea8EE40' as const

// Factory ABI (read-only methods)
export const factoryAbi = [
  { name: 'getActiveDebatesCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'getResolvingDebatesCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'getResolvedDebatesCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'getUndeterminedDebatesCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'getDebateCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'getTotalUniqueBettors', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'getTotalVolume', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'getAllDebates', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] },
  { name: 'getActiveDebates', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] },
  { name: 'getResolvedDebates', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] },
  { name: 'getUserStats', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'int256' }, { type: 'uint256' }] },
  { name: 'getUserDebates', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'address[]' }] },
  { name: 'getUserDebatesCount', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const

// Debate ABI (read-only methods)
export const debateAbi = [
  { 
    name: 'getInfo', 
    type: 'function', 
    stateMutability: 'view', 
    inputs: [], 
    outputs: [
      { type: 'address' },  // creator
      { type: 'string' },   // debateStatement
      { type: 'string' },   // description
      { type: 'string' },   // sideAName
      { type: 'string' },   // sideBName
      { type: 'uint256' },  // creationDate
      { type: 'uint256' },  // endDate
      { type: 'bool' },     // isResolved
      { type: 'bool' },     // isSideAWinner
      { type: 'uint256' },  // totalLockedA
      { type: 'uint256' },  // totalUnlockedA
      { type: 'uint256' },  // totalLockedB
      { type: 'uint256' },  // totalUnlockedB
      { type: 'string' },   // winnerReasoning
      { type: 'uint256' },  // totalContentBytes
      { type: 'uint256' },  // maxTotalContentBytes
      { type: 'uint256' },  // totalBounty
    ] 
  },
  { name: 'status', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'totalBounty', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'getArgumentsOnSideA', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'tuple[]', components: [{ name: 'author', type: 'address' }, { name: 'content', type: 'string' }, { name: 'timestamp', type: 'uint256' }, { name: 'amount', type: 'uint256' }] }] },
  { name: 'getArgumentsOnSideB', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'tuple[]', components: [{ name: 'author', type: 'address' }, { name: 'content', type: 'string' }, { name: 'timestamp', type: 'uint256' }, { name: 'amount', type: 'uint256' }] }] },
] as const

// Create client
export const client = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
})

// Types
export interface PlatformStats {
  totalDebates: number
  activeDebates: number
  resolvingDebates: number
  resolvedDebates: number
  undeterminedDebates: number
  totalBettors: number
  totalVolume: string
}

export interface DebateInfo {
  address: Address
  creator: Address
  statement: string
  description: string
  sideA: string
  sideB: string
  creationDate: Date
  endDate: Date
  isResolved: boolean
  isSideAWinner: boolean
  totalSideA: string
  totalSideB: string
  totalBounty: string
  status: number
}

export interface AgentStats {
  address: Address
  totalWinnings: string
  totalBets: string
  debatesParticipated: number
  debatesWon: number
  totalClaimed: string
  netProfit: string
  winRate: number
}

// Fetch platform stats
export async function getPlatformStats(): Promise<PlatformStats> {
  const [
    totalDebates,
    activeDebates,
    resolvingDebates,
    resolvedDebates,
    undeterminedDebates,
    totalBettors,
    totalVolume,
  ] = await Promise.all([
    client.readContract({ address: FACTORY_ADDRESS, abi: factoryAbi, functionName: 'getDebateCount' }),
    client.readContract({ address: FACTORY_ADDRESS, abi: factoryAbi, functionName: 'getActiveDebatesCount' }),
    client.readContract({ address: FACTORY_ADDRESS, abi: factoryAbi, functionName: 'getResolvingDebatesCount' }),
    client.readContract({ address: FACTORY_ADDRESS, abi: factoryAbi, functionName: 'getResolvedDebatesCount' }),
    client.readContract({ address: FACTORY_ADDRESS, abi: factoryAbi, functionName: 'getUndeterminedDebatesCount' }),
    client.readContract({ address: FACTORY_ADDRESS, abi: factoryAbi, functionName: 'getTotalUniqueBettors' }),
    client.readContract({ address: FACTORY_ADDRESS, abi: factoryAbi, functionName: 'getTotalVolume' }),
  ])

  return {
    totalDebates: Number(totalDebates),
    activeDebates: Number(activeDebates),
    resolvingDebates: Number(resolvingDebates),
    resolvedDebates: Number(resolvedDebates),
    undeterminedDebates: Number(undeterminedDebates),
    totalBettors: Number(totalBettors),
    totalVolume: formatUnits(totalVolume, 18),
  }
}

// Fetch debate info
export async function getDebateInfo(debateAddress: Address): Promise<DebateInfo> {
  const [info, status] = await Promise.all([
    client.readContract({ address: debateAddress, abi: debateAbi, functionName: 'getInfo' }),
    client.readContract({ address: debateAddress, abi: debateAbi, functionName: 'status' }),
  ])

  const [
    creator, statement, description, sideA, sideB,
    creationDate, endDate, isResolved, isSideAWinner,
    totalLockedA, totalUnlockedA, totalLockedB, totalUnlockedB,
    , , , totalBounty
  ] = info

  return {
    address: debateAddress,
    creator: creator as Address,
    statement,
    description,
    sideA,
    sideB,
    creationDate: new Date(Number(creationDate) * 1000),
    endDate: new Date(Number(endDate) * 1000),
    isResolved,
    isSideAWinner,
    totalSideA: formatUnits(totalLockedA + totalUnlockedA, 18),
    totalSideB: formatUnits(totalLockedB + totalUnlockedB, 18),
    totalBounty: formatUnits(totalBounty, 18),
    status: Number(status),
  }
}

// Fetch all active debates
export async function getActiveDebatesList(): Promise<Address[]> {
  return await client.readContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: 'getActiveDebates',
  }) as Address[]
}

// Fetch all debates
export async function getAllDebatesList(): Promise<Address[]> {
  return await client.readContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: 'getAllDebates',
  }) as Address[]
}

// Get unique creators from debates
export async function getUniqueCreators(debates: Address[]): Promise<Address[]> {
  const creators = new Set<Address>()
  
  // Batch fetch in groups of 10
  for (let i = 0; i < debates.length; i += 10) {
    const batch = debates.slice(i, i + 10)
    const infos = await Promise.all(
      batch.map(addr => 
        client.readContract({ address: addr, abi: debateAbi, functionName: 'getInfo' })
      )
    )
    infos.forEach(info => creators.add(info[0] as Address))
  }
  
  return Array.from(creators)
}

// Get agent stats
export async function getAgentStats(address: Address): Promise<AgentStats> {
  const stats = await client.readContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: 'getUserStats',
    args: [address],
  })

  const [totalWinnings, totalBets, debatesParticipated, debatesWon, totalClaimed, netProfit, winRate] = stats

  return {
    address,
    totalWinnings: formatUnits(totalWinnings, 18),
    totalBets: formatUnits(totalBets, 18),
    debatesParticipated: Number(debatesParticipated),
    debatesWon: Number(debatesWon),
    totalClaimed: formatUnits(totalClaimed, 18),
    netProfit: formatUnits(netProfit, 18),
    winRate: Number(winRate) / 100, // basis points to percentage
  }
}

// Status label helper
export function getStatusLabel(status: number): string {
  switch (status) {
    case 0: return 'Active'
    case 1: return 'Resolving'
    case 2: return 'Resolved'
    case 3: return 'Undetermined'
    default: return 'Unknown'
  }
}

// Status color helper
export function getStatusColor(status: number): string {
  switch (status) {
    case 0: return 'bg-green-500'
    case 1: return 'bg-yellow-500'
    case 2: return 'bg-blue-500'
    case 3: return 'bg-gray-500'
    default: return 'bg-gray-400'
  }
}
