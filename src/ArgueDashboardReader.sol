// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ArgueDashboardReader
 * @notice Read-only contract for aggregating argue.fun platform data
 * @dev Deployed on Base mainnet, reads from Factory and Debate contracts
 */

interface IDebateFactory {
    function getDebateCount() external view returns (uint256);
    function getActiveDebatesCount() external view returns (uint256);
    function getResolvedDebatesCount() external view returns (uint256);
    function getResolvingDebatesCount() external view returns (uint256);
    function getUndeterminedDebatesCount() external view returns (uint256);
    function getAllDebates() external view returns (address[] memory);
    function getActiveDebates() external view returns (address[] memory);
    function getUserStats(address user) external view returns (
        uint256 totalWinnings,
        uint256 totalBets,
        uint256 debatesParticipated,
        uint256 debatesWon,
        uint256 totalClaimed,
        int256 netProfit,
        uint256 winRate
    );
}

interface IDebate {
    struct Argument {
        address author;
        string content;
        uint256 timestamp;
        uint256 amount;
    }
    
    function getInfo() external view returns (
        address creator,
        string memory debateStatement,
        string memory description,
        string memory sideAName,
        string memory sideBName,
        uint256 creationDate,
        uint256 endDate,
        bool isResolved,
        bool isSideAWinner,
        uint256 totalLockedA,
        uint256 totalUnlockedA,
        uint256 totalLockedB,
        uint256 totalUnlockedB,
        string memory winnerReasoning,
        uint256 totalContentBytes,
        uint256 maxTotalContentBytes,
        uint256 totalBounty
    );
    
    function status() external view returns (uint8);
    function getArgumentsOnSideA() external view returns (Argument[] memory);
    function getArgumentsOnSideB() external view returns (Argument[] memory);
    function totalBounty() external view returns (uint256);
}

contract ArgueDashboardReader {
    IDebateFactory public immutable factory;
    
    struct PlatformStats {
        uint256 totalDebates;
        uint256 activeDebates;
        uint256 resolvingDebates;
        uint256 resolvedDebates;
        uint256 undeterminedDebates;
    }
    
    struct DebateBasicInfo {
        address debateAddress;
        address creator;
        uint256 endDate;
        uint8 status;
        uint256 totalSideA;
        uint256 totalSideB;
        uint256 totalBounty;
        uint256 argumentCountA;
        uint256 argumentCountB;
    }
    
    struct AgentStats {
        address agent;
        uint256 totalWinnings;
        uint256 totalBets;
        uint256 debatesParticipated;
        uint256 debatesWon;
        int256 netProfit;
        uint256 winRate;
    }
    
    struct ParticipantInfo {
        address participant;
        uint256 totalArgumentsWritten;
        uint256 totalAmountBet;
    }
    
    constructor(address _factory) {
        factory = IDebateFactory(_factory);
    }
    
    /**
     * @notice Get basic platform statistics from factory
     */
    function getPlatformStats() external view returns (PlatformStats memory stats) {
        stats.totalDebates = factory.getDebateCount();
        stats.activeDebates = factory.getActiveDebatesCount();
        stats.resolvingDebates = factory.getResolvingDebatesCount();
        stats.resolvedDebates = factory.getResolvedDebatesCount();
        stats.undeterminedDebates = factory.getUndeterminedDebatesCount();
    }
    
    /**
     * @notice Get basic info for multiple debates
     */
    function getDebateBasicInfoBatch(address[] calldata debates) 
        external view returns (DebateBasicInfo[] memory infos) 
    {
        infos = new DebateBasicInfo[](debates.length);
        
        for (uint256 i = 0; i < debates.length; i++) {
            infos[i] = _getDebateBasicInfo(debates[i]);
        }
    }
    
    /**
     * @notice Get basic info for a single debate
     */
    function _getDebateBasicInfo(address debateAddr) internal view returns (DebateBasicInfo memory info) {
        IDebate debate = IDebate(debateAddr);
        
        // Get totals from getInfo
        (
            address creator,
            ,,,,, // skip strings
            uint256 endDate,
            ,,
            uint256 totalLockedA,
            uint256 totalUnlockedA,
            uint256 totalLockedB,
            uint256 totalUnlockedB,
            ,,,
            uint256 bounty
        ) = debate.getInfo();
        
        IDebate.Argument[] memory argsA = debate.getArgumentsOnSideA();
        IDebate.Argument[] memory argsB = debate.getArgumentsOnSideB();
        
        info.debateAddress = debateAddr;
        info.creator = creator;
        info.endDate = endDate;
        info.status = debate.status();
        info.totalSideA = totalLockedA + totalUnlockedA;
        info.totalSideB = totalLockedB + totalUnlockedB;
        info.totalBounty = bounty;
        info.argumentCountA = argsA.length;
        info.argumentCountB = argsB.length;
    }
    
    /**
     * @notice Get stats for multiple agents
     */
    function getBatchAgentStats(address[] calldata agents) 
        external view returns (AgentStats[] memory agentStats) 
    {
        agentStats = new AgentStats[](agents.length);
        
        for (uint256 i = 0; i < agents.length; i++) {
            (
                uint256 totalWinnings,
                uint256 totalBets,
                uint256 debatesParticipated,
                uint256 debatesWon,
                ,
                int256 netProfit,
                uint256 winRate
            ) = factory.getUserStats(agents[i]);
            
            agentStats[i] = AgentStats({
                agent: agents[i],
                totalWinnings: totalWinnings,
                totalBets: totalBets,
                debatesParticipated: debatesParticipated,
                debatesWon: debatesWon,
                netProfit: netProfit,
                winRate: winRate
            });
        }
    }
    
    /**
     * @notice Get all argument authors from debates
     */
    function getArgumentAuthors(address[] calldata debates, uint256 maxResults) 
        external view returns (address[] memory authors) 
    {
        address[] memory temp = new address[](maxResults);
        uint256 count = 0;
        
        for (uint256 i = 0; i < debates.length && count < maxResults; i++) {
            IDebate debate = IDebate(debates[i]);
            
            IDebate.Argument[] memory argsA = debate.getArgumentsOnSideA();
            IDebate.Argument[] memory argsB = debate.getArgumentsOnSideB();
            
            for (uint256 j = 0; j < argsA.length && count < maxResults; j++) {
                if (!_seen(temp, count, argsA[j].author)) {
                    temp[count++] = argsA[j].author;
                }
            }
            
            for (uint256 j = 0; j < argsB.length && count < maxResults; j++) {
                if (!_seen(temp, count, argsB[j].author)) {
                    temp[count++] = argsB[j].author;
                }
            }
        }
        
        authors = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            authors[i] = temp[i];
        }
    }
    
    /**
     * @notice Get participant details with argument counts and amounts
     */
    function getParticipantDetails(address[] calldata debates, uint256 maxResults) 
        external view returns (ParticipantInfo[] memory infos) 
    {
        address[] memory addrs = new address[](maxResults);
        uint256[] memory argCounts = new uint256[](maxResults);
        uint256[] memory amounts = new uint256[](maxResults);
        uint256 count = 0;
        
        for (uint256 i = 0; i < debates.length; i++) {
            IDebate debate = IDebate(debates[i]);
            
            IDebate.Argument[] memory argsA = debate.getArgumentsOnSideA();
            IDebate.Argument[] memory argsB = debate.getArgumentsOnSideB();
            
            count = _processArgs(argsA, addrs, argCounts, amounts, count, maxResults);
            count = _processArgs(argsB, addrs, argCounts, amounts, count, maxResults);
        }
        
        infos = new ParticipantInfo[](count);
        for (uint256 i = 0; i < count; i++) {
            infos[i] = ParticipantInfo(addrs[i], argCounts[i], amounts[i]);
        }
    }
    
    /**
     * @notice Get debate creators (unique)
     */
    function getDebateCreators(address[] calldata debates) 
        external view returns (address[] memory creators) 
    {
        address[] memory temp = new address[](debates.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < debates.length; i++) {
            IDebate debate = IDebate(debates[i]);
            (address creator,,,,,,,,,,,,,,,,) = debate.getInfo();
            
            if (!_seen(temp, count, creator)) {
                temp[count++] = creator;
            }
        }
        
        creators = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            creators[i] = temp[i];
        }
    }
    
    /**
     * @notice Calculate aggregate stats across debates
     */
    function getAggregateStats(address[] calldata debates) 
        external view returns (
            uint256 totalVolume,
            uint256 totalBounties,
            uint256 totalArguments,
            uint256 uniqueParticipants
        ) 
    {
        address[] memory seen = new address[](debates.length * 20);
        uint256 seenCount = 0;
        
        for (uint256 i = 0; i < debates.length; i++) {
            IDebate debate = IDebate(debates[i]);
            
            (,,,,,,,,,
             uint256 tLA, uint256 tUA, uint256 tLB, uint256 tUB,
             ,,, uint256 bounty
            ) = debate.getInfo();
            
            totalVolume += tLA + tUA + tLB + tUB;
            totalBounties += bounty;
            
            IDebate.Argument[] memory argsA = debate.getArgumentsOnSideA();
            IDebate.Argument[] memory argsB = debate.getArgumentsOnSideB();
            
            totalArguments += argsA.length + argsB.length;
            
            for (uint256 j = 0; j < argsA.length; j++) {
                if (!_seen(seen, seenCount, argsA[j].author)) {
                    seen[seenCount++] = argsA[j].author;
                }
            }
            for (uint256 j = 0; j < argsB.length; j++) {
                if (!_seen(seen, seenCount, argsB[j].author)) {
                    seen[seenCount++] = argsB[j].author;
                }
            }
        }
        
        uniqueParticipants = seenCount;
    }
    
    // Helper: check if address seen
    function _seen(address[] memory arr, uint256 len, address addr) internal pure returns (bool) {
        for (uint256 i = 0; i < len; i++) {
            if (arr[i] == addr) return true;
        }
        return false;
    }
    
    // Helper: process arguments array
    function _processArgs(
        IDebate.Argument[] memory args,
        address[] memory addrs,
        uint256[] memory counts,
        uint256[] memory amounts,
        uint256 count,
        uint256 max
    ) internal pure returns (uint256) {
        for (uint256 j = 0; j < args.length && count < max; j++) {
            uint256 idx = _findIdx(addrs, count, args[j].author);
            if (idx == count) {
                addrs[count] = args[j].author;
                count++;
            }
            counts[idx]++;
            amounts[idx] += args[j].amount;
        }
        return count;
    }
    
    // Helper: find index or return count
    function _findIdx(address[] memory arr, uint256 len, address addr) internal pure returns (uint256) {
        for (uint256 i = 0; i < len; i++) {
            if (arr[i] == addr) return i;
        }
        return len;
    }
}
