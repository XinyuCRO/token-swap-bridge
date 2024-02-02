import { ethers } from 'ethers';
import { AllowListFactory, L1ERC20BridgeFactory, MailboxFacetFactory, ERC20Factory, TestnetERC20TokenFactory } from '../typechain';
import * as dotenv from "dotenv";
import { IZkSyncFactory } from '../typechain/IZkSyncFactory';
import { utils, Provider as ZkSyncProvider, Wallet as ZKWallet } from 'zksync-web3';
import { IL2ERC20BridgeFactory } from '../typechain/IL2ERC20BridgeFactory';
import { undoL1ToL2Alias } from 'zksync-web3/build/src/utils';
import { IL1BridgeFactory, IL2BridgeFactory } from 'zksync-web3/build/typechain';
dotenv.config();


const CRO_ADDRESS = process.env.CONTRACTS_L1_CRO_TOKEN_ADDR!;
const L1_ERC20_BRIDGE_ADDRESS = process.env.CONTRACTS_L1_ERC20_BRIDGE_PROXY_ADDR!;
const MNEMONIC = process.env.MNEMONIC!;
const MAILBOX_ADDRESS = process.env.CONTRACTS_MAILBOX_FACET_ADDR!;
const ALLOW_LIST_ADDRESS = process.env.CONTRACTS_L1_ALLOW_LIST_ADDR!;
const ZKSYNC_ADDRESS = process.env.CONTRACTS_DIAMOND_PROXY_ADDR!;
const L2WETH_ADDRESS = process.env.CONTRACTS_L2_WETH_IMPLEMENTATION_ADDR!;
const L2ETH_ADDRESS = "0x000000000000000000000000000000000000800a";
const ERC20_ADDRESS = "0x768494eee366d14d0d1d33a11023175db80fb9a2";
// const ERC20_ADDRESS = "0x242F8d1be53bA409b74B6Fddf726482d6d0c901e"; // devToken

const DERIVE_PATH = "m/44'/60'/0'/0/0";

const L2_RPC_URL = "https://rpc-zkevm-t0.cronos.org";
const RPC_URL = process.env.ETH_CLIENT_WEB3_URL!;

const prepare = async () => {
    let wallet = ethers.Wallet.fromMnemonic(MNEMONIC, DERIVE_PATH);
    console.log("wallet: ", wallet.address);
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    wallet = wallet.connect(provider);
    console.log("balance: ", ethers.utils.formatEther(await wallet.getBalance()));
    const CRO = ERC20Factory.connect(CRO_ADDRESS, wallet);
    const L1ERC20Bridge = L1ERC20BridgeFactory.connect(L1_ERC20_BRIDGE_ADDRESS, wallet);
    const MailBox = MailboxFacetFactory.connect(MAILBOX_ADDRESS, wallet);
    const AllowList = AllowListFactory.connect(ALLOW_LIST_ADDRESS, wallet);
    const ZKSync = IZkSyncFactory.connect(ZKSYNC_ADDRESS, wallet);
    const ERC20 = TestnetERC20TokenFactory.connect(ERC20_ADDRESS, wallet)

    // console.log("Mint WETH...");
    // let tx = await WETH.mint(wallet.address, ethers.utils.parseEther("9999999999"), {
    // });
    // await tx.wait()
    const balance = await CRO.balanceOf(wallet.address);
    console.log("CRO balance: ", ethers.utils.formatEther(balance), "CRO");

    // console.log("Mint USDC...");
    // let tx = await ERC20.mint(wallet.address, ethers.utils.parseEther("100"), {
    // });
    // await tx.wait()

    const balanceERC20 = await ERC20.balanceOf(wallet.address);
    console.log("ERC20 balance: ", ethers.utils.formatEther(balanceERC20), "ERC20");

    console.log("Set access mode for L1ERC20Bridge...");
    var tx = await AllowList.setAccessMode(L1ERC20Bridge.address, 2);
    await tx.wait();
    let res = await AllowList.getAccessMode(L1ERC20Bridge.address)
    console.log("AccessMode for L1WethBridge: ", res);

    console.log("Set access mode for Mailbox...");
    tx = await AllowList.setAccessMode(MAILBOX_ADDRESS, 2);
    await tx.wait();
    res = await AllowList.getAccessMode(MAILBOX_ADDRESS)
    console.log("AccessMode for MailBox: ", res);

    console.log("Set access mode for zksync");
    tx = await AllowList.setAccessMode(ZKSYNC_ADDRESS, 2);
    await tx.wait();
    res = await AllowList.getAccessMode(ZKSYNC_ADDRESS);
    console.log("Accessmode for zksync: ", res);

    let v = await AllowList.canCall(wallet.address, MAILBOX_ADDRESS, MailBox.interface.getSighash("requestL2Transaction"))
    console.log("canCall: ", v);

    v = await AllowList.canCall(wallet.address, ZKSYNC_ADDRESS, MailBox.interface.getSighash("finalizeEthWithdrawal"))
    console.log("canCall finalizeEthWithdrawal: ", v);

    v = await AllowList.canCall(wallet.address, ZKSYNC_ADDRESS, ZKSync.interface.getSighash("requestL2Transaction"))
    console.log("canCall: ", v);

    tx = await AllowList.setDepositLimit(CRO_ADDRESS, false, ethers.utils.parseEther("9999999"))
    await tx.wait();
    let limit = await AllowList.getTokenDepositLimitData(CRO_ADDRESS);
    console.log("deposit limit: ", limit);

    tx = await AllowList.setDepositLimit(ERC20_ADDRESS, false, ethers.utils.parseEther("9999999"))
    await tx.wait();
    limit = await AllowList.getTokenDepositLimitData(CRO_ADDRESS);
    console.log("erc20 deposit limit: ", limit);
}

const testWorkingMailBox = async () => {
    let wallet = ethers.Wallet.fromMnemonic(MNEMONIC, DERIVE_PATH);
    console.log("wallet: ", wallet.address);
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    wallet = wallet.connect(provider);
    console.log("balance: ", ethers.utils.formatEther(await wallet.getBalance()));
    const WETH = ERC20Factory.connect(CRO_ADDRESS, wallet);
    const L1ERC20Bridge = L1ERC20BridgeFactory.connect(L1_ERC20_BRIDGE_ADDRESS, wallet);
    const allowList = AllowListFactory.connect(await L1ERC20Bridge.allowList(), wallet);
    const zkSync = IZkSyncFactory.connect(ZKSYNC_ADDRESS, wallet);

    console.log("testing requestL2Transaction...");
    const MailBox = MailboxFacetFactory.connect(MAILBOX_ADDRESS, wallet);
    const DEPOSIT_L2_GAS_LIMIT = 10_000_000;

    const gasPrice = await wallet.getGasPrice();
    const contract = new ethers.Contract(ZKSYNC_ADDRESS, utils.ZKSYNC_MAIN_ABI, wallet);
    const AMOUNT_TO_DEPOSIT = ethers.utils.parseEther('1000000000000');
    const expectedCost = await contract.l2TransactionBaseCost(
        gasPrice,
        DEPOSIT_L2_GAS_LIMIT,
        utils.DEFAULT_GAS_PER_PUBDATA_LIMIT
    );
    const overrides = {
        value: AMOUNT_TO_DEPOSIT.add(expectedCost)
    };


    let tx = await contract.requestL2Transaction(
        wallet.address,
        AMOUNT_TO_DEPOSIT,
        "0x",
        DEPOSIT_L2_GAS_LIMIT,
        800,
        [],
        wallet.address, overrides
    )
    let receipt = await tx.wait();
    console.log(receipt);
}


const testMailBox = async () => {
    let wallet = ethers.Wallet.fromMnemonic(MNEMONIC, DERIVE_PATH);
    console.log("wallet: ", wallet.address);
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    wallet = wallet.connect(provider);
    console.log("balance: ", ethers.utils.formatEther(await wallet.getBalance()));
    const WETH = ERC20Factory.connect(CRO_ADDRESS, wallet);
    const L1ERC20Bridge = L1ERC20BridgeFactory.connect(L1_ERC20_BRIDGE_ADDRESS, wallet);
    const allowList = AllowListFactory.connect(await L1ERC20Bridge.allowList(), wallet);
    const zkSync = IZkSyncFactory.connect(ZKSYNC_ADDRESS, wallet);

    console.log("testing requestL2Transaction...");
    const MailBox = MailboxFacetFactory.connect(MAILBOX_ADDRESS, wallet);
    const DEPOSIT_L2_GAS_LIMIT = 10_000_000;

    const gasPrice = await wallet.getGasPrice();
    const contract = new ethers.Contract(ZKSYNC_ADDRESS, utils.ZKSYNC_MAIN_ABI, wallet);
    const AMOUNT_TO_DEPOSIT = ethers.utils.parseEther('1000000000000');
    const expectedCost = await contract.l2TransactionBaseCost(
        gasPrice,
        DEPOSIT_L2_GAS_LIMIT,
        utils.DEFAULT_GAS_PER_PUBDATA_LIMIT
    );
    const overrides = {
        value: AMOUNT_TO_DEPOSIT.add(expectedCost)
    };


    let tx = await contract.requestL2Transaction(
        ethers.constants.AddressZero,
        AMOUNT_TO_DEPOSIT,
        "0x",
        DEPOSIT_L2_GAS_LIMIT,
        800,
        [],
        wallet.address,
        overrides
    )
    let receipt = await tx.wait();
    console.log(receipt);
}

const bridgeEthL1ToL2 = async () => {
    let wallet = ethers.Wallet.fromMnemonic(MNEMONIC, DERIVE_PATH);
    console.log("Use wallet address : ", wallet.address);
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    wallet = wallet.connect(provider);
    const WETH = ERC20Factory.connect(CRO_ADDRESS, wallet);
    const l1Balance = await WETH.balanceOf(wallet.address);
    console.log("Current WETH balance on L1: ", ethers.utils.formatEther(l1Balance));

    console.log("Approve ZKSync for spending WETH...");
    const zkSync = IZkSyncFactory.connect(ZKSYNC_ADDRESS, wallet);
    let tx = await WETH.approve(zkSync.address, ethers.utils.parseEther("9999999999"));
    await tx.wait();
    let allowance = await WETH.allowance(wallet.address, zkSync.address);
    console.log("allowance: ", ethers.utils.formatEther(allowance), "WETH");

    console.log("Depositing ETH");
    const DEPOSIT_L2_GAS_LIMIT = 1_000_000;
    const gasPrice = await wallet.getGasPrice();
    const contract = new ethers.Contract(ZKSYNC_ADDRESS, utils.ZKSYNC_MAIN_ABI, wallet);
    const expectedCost = await contract.l2TransactionBaseCost(
        gasPrice,
        DEPOSIT_L2_GAS_LIMIT,
        utils.DEFAULT_GAS_PER_PUBDATA_LIMIT
    );

    console.log("expectedCost: ", ethers.utils.formatEther(expectedCost));

    const tx2 = await zkSync.requestL2Transaction(
        {
            l2Contract: '0x0000000000000000000000000000000000000000',
            l2Value: 0,
            // gasAmount: ethers.utils.parseEther("1"),
            l2GasLimit: 1_000_000,
            l2GasPerPubdataByteLimit: 800

        },
        '0x',
        [],
        wallet.address,
        ethers.utils.parseEther("1"),
        {
            gasLimit: 210000,
        }
    )

    let receipt = await tx2.wait();
    console.log(receipt);
}

const getBalance = async () => {
    let wallet = ZKWallet.fromMnemonic(MNEMONIC, DERIVE_PATH);
    const l2Provider = new ZkSyncProvider(L2_RPC_URL);
    console.log("Check balance for wallet address : ", wallet.address);
    let balance = await l2Provider.getBalance(wallet.address)
    console.log("balance on l2: ", ethers.utils.formatEther(balance));

    let wethBalance = await l2Provider.getBalance(wallet.address, "latest", L2WETH_ADDRESS);
    console.log("CRO on l2: ", ethers.utils.formatEther(wethBalance));

    let ethBalance = await l2Provider.getBalance(wallet.address, "latest", L2ETH_ADDRESS);
    console.log("ethBalance on l2: ", ethers.utils.formatEther(ethBalance));

    let l1wallet = ethers.Wallet.fromMnemonic(MNEMONIC, DERIVE_PATH);
    const l1provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    l1wallet = l1wallet.connect(l1provider);
    const WETH = ERC20Factory.connect(CRO_ADDRESS, l1wallet);
    const l1Balance = await WETH.balanceOf(l1wallet.address);
    console.log("Check balance for wallet address : ", wallet.address);
    console.log("cro balance on l1: ", ethers.utils.formatEther(l1Balance), "CRO");
    const l1ethBalance = await l1provider.getBalance(l1wallet.address)
    console.log("balance on l1: ", ethers.utils.formatEther(l1ethBalance), "ETH");

    const proxyBalance = await WETH.balanceOf(ZKSYNC_ADDRESS);
    console.log("Diamon proxy CRO balance: ", ethers.utils.formatEther(proxyBalance), "WETH");

    const ERC20 = TestnetERC20TokenFactory.connect(ERC20_ADDRESS, l1wallet);
    const l1erc20Balance = await ERC20.balanceOf(l1wallet.address);
    console.log("erc20 balance on l1: ", ethers.utils.formatEther(l1erc20Balance), "ERC20");

}

const bridgeEthL2ToL1 = async () => {
    let zkwallet = ZKWallet.fromMnemonic(MNEMONIC, DERIVE_PATH);
    console.log("wallet: ", zkwallet.address);
    const l2Provider = new ZkSyncProvider("http://127.0.0.1:3050");
    const l1Provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    zkwallet = zkwallet.connect(l2Provider);
    zkwallet = zkwallet.connectToL1(l1Provider);
    const withdrawL2 = await zkwallet.withdraw({
        token: L2ETH_ADDRESS,
        amount: ethers.utils.parseEther("1"),
        to: zkwallet.address
    });

    const receipt = await withdrawL2.waitFinalize();
    console.log("receipt: ", receipt.transactionHash);

    const { l1BatchNumber, l2MessageIndex, l2TxNumberInBlock, message, sender, proof } =
        await zkwallet.finalizeWithdrawalParams(receipt.transactionHash, 0);

    console.log("l1BatchNumber: ", l1BatchNumber);
    console.log("l2MessageIndex: ", l2MessageIndex);
    console.log("l2TxNumberInBlock: ", l2TxNumberInBlock);
    console.log("message: ", message);
    console.log("sender: ", sender);
    console.log("proof: ", proof);

    let wallet = ethers.Wallet.fromMnemonic(MNEMONIC, DERIVE_PATH);
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    wallet = wallet.connect(provider);
    const zkSync = IZkSyncFactory.connect(ZKSYNC_ADDRESS, wallet);

    let tx = await zkSync.finalizeEthWithdrawal(
        l1BatchNumber,
        l2MessageIndex,
        l2TxNumberInBlock,
        message,
        proof,
        {
            gasLimit: 410000,
        }
    )

    let finalizereceipt = await tx.wait();
    console.log(finalizereceipt);
}

const bridgeERC20L1ToL2 = async () => {
    let wallet = ethers.Wallet.fromMnemonic(MNEMONIC, DERIVE_PATH);
    console.log("Use wallet address : ", wallet.address);
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    wallet = wallet.connect(provider);
    console.log("Current wallet balance on L2: ", ethers.utils.formatEther(await wallet.getBalance()));
    const L1ERC20Bridge = L1ERC20BridgeFactory.connect(L1_ERC20_BRIDGE_ADDRESS, wallet);

    console.log("Approve Bridge for spending USDC...");
    const ERC20 = TestnetERC20TokenFactory.connect(ERC20_ADDRESS, wallet);
    let tx = await ERC20.approve(L1ERC20Bridge.address, ethers.utils.parseEther("9999999999"));
    await tx.wait();
    let allowance = await ERC20.allowance(wallet.address, L1ERC20Bridge.address);
    console.log("erc20 allowance: ", ethers.utils.formatEther(allowance), "DAI");


    console.log("Approve ZKSync for spending gas token...");
    const zkSync = IZkSyncFactory.connect(ZKSYNC_ADDRESS, wallet);
    const WETH = ERC20Factory.connect(CRO_ADDRESS, wallet);
    tx = await WETH.approve(zkSync.address, ethers.utils.parseEther("9999999999"));
    await tx.wait();
    allowance = await WETH.allowance(wallet.address, zkSync.address);
    console.log("gas token allowance allowance: ", ethers.utils.formatEther(allowance), "WETH");

    const DEPOSIT_L2_GAS_LIMIT = 10_000_000;
    const gasPrice = await wallet.getGasPrice();
    const contract = new ethers.Contract(ZKSYNC_ADDRESS, utils.ZKSYNC_MAIN_ABI, wallet);
    const expectedCost = await contract.l2TransactionBaseCost(
        gasPrice,
        DEPOSIT_L2_GAS_LIMIT,
        utils.DEFAULT_GAS_PER_PUBDATA_LIMIT
    );

    console.log("expectedCost: ", ethers.utils.formatEther(expectedCost));


    tx = await L1ERC20Bridge["deposit(address,address,uint256,uint256,uint256,address,uint256)"](
        wallet.address,
        ERC20_ADDRESS,
        ethers.utils.parseEther("1"),
        10_000_000,
        800,
        wallet.address,
        ethers.utils.parseEther("1"),
        {
            gasLimit: 2000000,
        },
    )

    let receipt = await tx.wait();
    console.log(receipt);
}

const getBalanceOfL2Bridge = async () => {

    let wallet = ZKWallet.fromMnemonic(MNEMONIC, DERIVE_PATH);
    const l2Provider = new ZkSyncProvider(L2_RPC_URL);
    const USDCL2 = "0xc2D0151FbDB47474B24758aC7FE6Fc6a90b24C3c";
    let bridgeAddress = process.env.CONTRACTS_L2_ERC20_BRIDGE_ADDR!;

    console.log("Check balance for L2ERC20Bridge address : ", bridgeAddress);
    let balance = await l2Provider.getBalance(bridgeAddress)
    console.log("balance on l2: ", ethers.utils.formatEther(balance));

    let wethBalance = await l2Provider.getBalance(bridgeAddress, "latest", USDCL2);
    console.log("USDC balance on l2: ", ethers.utils.formatEther(wethBalance));
}

const claimFailedDeposit = async () => {
    const depositHash = "0xd01f3c4b5b804ffe9eb8b5192dcb2a1f763b79a67f3919f976b7932a5bd3e36b";
    const BOOTLOADER_FORMAL_ADDRESS = '0x0000000000000000000000000000000000008001';

    // const wallet = ZKWallet.fromMnemonic(MNEMONIC, DERIVE_PATH);
    let wallet = ethers.Wallet.fromMnemonic(MNEMONIC, DERIVE_PATH);
    console.log("Use wallet address : ", wallet.address);
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    wallet = wallet.connect(provider);
    const l2Provider = new ZkSyncProvider(L2_RPC_URL);
    const receipt = await l2Provider.getTransactionReceipt(ethers.utils.hexlify(depositHash));


    const successL2ToL1LogIndex = receipt.l2ToL1Logs.findIndex(
        (l2ToL1log) => l2ToL1log.sender == BOOTLOADER_FORMAL_ADDRESS && l2ToL1log.key == depositHash
    );
    const successL2ToL1Log = receipt.l2ToL1Logs[successL2ToL1LogIndex];
    // if (successL2ToL1Log.value != ethers.constants.HashZero) {
    //     throw new Error('Cannot claim successful deposit');
    // }

    const tx = await l2Provider.getTransaction(ethers.utils.hexlify(depositHash));

    // Undo the aliasing, since the Mailbox contract set it as for contract address.
    const l1BridgeAddress = undoL1ToL2Alias(receipt.from);


    console.log("recipt.frm: ", receipt.from);
    console.log("l1BridgeAddress: ", l1BridgeAddress);

    const l2BridgeAddress = receipt.to;

    const l1Bridge = IL1BridgeFactory.connect(l1BridgeAddress, wallet);
    const l2Bridge = IL2BridgeFactory.connect(l2BridgeAddress, l2Provider);

    const calldata = l2Bridge.interface.decodeFunctionData('finalizeDeposit', tx.data);

    const proof = await l2Provider.getLogProof(depositHash, successL2ToL1LogIndex);
    return await l1Bridge.claimFailedDeposit(
        calldata['_l1Sender'],
        calldata['_l1Token'],
        depositHash,
        receipt.l1BatchNumber,
        proof.id,
        receipt.l1BatchTxIndex,
        proof.proof,
        {}
    );
}

// prepare().then(() => {main()});

// mint token, set approval, set allowlist
// prepare();

// call the bridge function
// bridgeEthL1ToL2();

// getBalance();

// bridgeEthL2ToL1();

bridgeERC20L1ToL2();

// getBalanceOfL2Bridge();

// claimFailedDeposit();
