require("@nomiclabs/hardhat-solpp");
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-foundry");
const { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } = require("hardhat/builtin-tasks/task-names");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",

  solpp: {
    defs: {
        REQUIRED_L2_GAS_PRICE_PER_PUBDATA: 800,
        DEPLOY_L2_BRIDGE_COUNTERPART_GAS_LIMIT: 10000000
      }
     }
};

task("solpp", "Preprocess Solidity source files").setAction(async (_, hre) =>
  hre.run(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS)
);
