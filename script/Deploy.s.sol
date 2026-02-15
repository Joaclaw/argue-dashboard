// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ArgueDashboardReader.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        ArgueDashboardReader reader = new ArgueDashboardReader(
            0x0692eC85325472Db274082165620829930f2c1F9
        );
        
        console.log("ArgueDashboardReader deployed at:", address(reader));
        
        vm.stopBroadcast();
    }
}
