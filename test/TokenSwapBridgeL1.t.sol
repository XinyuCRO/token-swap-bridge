// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {L1TokenSwapBridge} from "../src/Ethereum/L1TokenSwapBridge.sol";

import "lib/era-contracts/ethereum/contracts/zksync/interfaces/IZkSync.sol";
import "lib/era-contracts/ethereum/contracts/common/interfaces/IAllowList.sol";

address constant CONTRACTS_L1_CRO_TOKEN_ADDR = 0x1c815aca8daacdf46805fbFB9F08abD1D614773D;
address constant CONTRACTS_DIAMOND_PROXY_ADDR = 0x08A064F0c455Df1806Fb02425f2C31fAFc187979;
address constant CONTRACTS_L1_ALLOW_LIST_ADDR= 0xFE67138d95B13C7196190B6669a718665b5B7ddb;

contract TokenSwapBridgeL1Test is Test {
    L1TokenSwapBridge public swapBridgeL1;
    uint256 sepoliaFork;
    string L1_RPC_URL = vm.envString("L1_RPC_URL");

    function setUp() public {
        swapBridgeL1 = new L1TokenSwapBridge(
            CONTRACTS_L1_CRO_TOKEN_ADDR,
            IZkSync(CONTRACTS_DIAMOND_PROXY_ADDR),
            IAllowList(CONTRACTS_L1_ALLOW_LIST_ADDR)
        );
        
        // sepoliaFork = vm.createFork(L1_RPC_URL);
    }

    function test_init() public {
        // vm.selectFork(sepoliaFork);
        // assertEq(vm.activeFork(), sepoliaFork);

        address baseTokenAddress = swapBridgeL1.baseTokenAddress();

        console.log(baseTokenAddress);

        emit log_named_address("base token: ", baseTokenAddress);

        assertEq(swapBridgeL1.baseTokenAddress(), CONTRACTS_DIAMOND_PROXY_ADDR, "baseTokenAddress");
    }

}
