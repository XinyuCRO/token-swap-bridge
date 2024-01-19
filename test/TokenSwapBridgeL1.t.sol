// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {L1TokenSwapBridge} from "../src/Ethereum/L1TokenSwapBridge.sol";

import "lib/era-contracts/ethereum/contracts/zksync/interfaces/IZkSync.sol";
import "lib/era-contracts/ethereum/contracts/common/interfaces/IAllowList.sol";
import "lib/era-contracts/ethereum/contracts/common/AllowList.sol";

import "openzeppelin-contracts/contracts/interfaces/IERC20Metadata.sol";
import "./TestERC20Token.sol";

address constant CONTRACTS_L1_CRO_TOKEN_ADDR = 0x1c815aca8daacdf46805fbFB9F08abD1D614773D;
address constant CONTRACTS_DIAMOND_PROXY_ADDR = 0x08A064F0c455Df1806Fb02425f2C31fAFc187979;
address constant CONTRACTS_L1_ALLOW_LIST_ADDR= 0xFE67138d95B13C7196190B6669a718665b5B7ddb;

address constant owner = 0x85814a07917477B2Ad9dbc8DA1DF5850b54173Fe;

contract TokenSwapBridgeL1Test is Test {
    L1TokenSwapBridge public swapBridgeL1;
    uint256 sepoliaFork;
    string L1_RPC_URL = vm.envString("L1_RPC_URL");

    TestERC20Token public testToken;
    IERC20 public baseToken;

    AllowList public allowList;

    function setUp() public {
   
        baseToken = IERC20(CONTRACTS_L1_CRO_TOKEN_ADDR);
        vm.startPrank(owner);
        testToken = new TestERC20Token();

        console.log("balance of baseToken: ", baseToken.balanceOf(owner));
        console.log("balance of testToken: ", testToken.balanceOf(owner));

        allowList = new AllowList(owner);

        swapBridgeL1 = new L1TokenSwapBridge(
            CONTRACTS_L1_CRO_TOKEN_ADDR,
            IZkSync(CONTRACTS_DIAMOND_PROXY_ADDR),
            allowList
            // IAllowList(CONTRACTS_L1_ALLOW_LIST_ADDR)
        );

        allowList.setAccessMode(address(swapBridgeL1), IAllowList.AccessMode.Public);

        vm.stopPrank();
    }

    function test_deposit() public {

        vm.prank(owner);
        baseToken.approve(address(CONTRACTS_DIAMOND_PROXY_ADDR), 100 ether);
        vm.prank(owner);
        testToken.approve(address(swapBridgeL1), 100 ether);
        vm.prank(owner);
        console.log("allowance of base token: ", baseToken.allowance(owner, address(CONTRACTS_DIAMOND_PROXY_ADDR)));
        vm.prank(owner);
        console.log("allowance of test token: ", testToken.allowance(owner, address(swapBridgeL1)));

        vm.prank(owner);
        bytes32 l2txHash = swapBridgeL1.deposit(
            owner,
            address(testToken),
            1 ether,
            10000000,
            800,
            owner,
            0.1 ether
        );
        console.logBytes32(l2txHash);
        // vm.stopPrank();
    }

}
