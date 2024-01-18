// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console2} from "forge-std/Test.sol";
import {TokenSwapBridgeL1} from "../src/Ethereum/TokenSwapBridgeL1.sol";

contract TokenSwapBridgeL1Test is Test {
    TokenSwapBridgeL1 public swapBridgeL1;

    function setUp() public {
        swapBridgeL1 = new TokenSwapBridgeL1();
    }

    function test_init() public {
        swapBridgeL1.test();
    }

}
