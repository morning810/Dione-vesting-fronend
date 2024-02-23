import axios from "axios";
import Web3 from "web3";
import { polygonMumbai } from "viem/chains";
import { ACTIVE_CHAIN_RPC, addressesOnActiveNetwork } from "./deployedAddresses";
import VestingFactoryAbi from "./abi/VestingFactory.json";
import MultiSignWalletAbi from "./abi/MultiSign.json";
import { ALCHEMY_KEY } from "../config";

export const GolobalMainWeb3 = new Web3(ACTIVE_CHAIN_RPC);
// export const GolobalMainWeb3 = new Web3(`${polygonMumbai.rpcUrls.alchemy.http}/${ALCHEMY_KEY}`);

export const VestingFactoryContract = new GolobalMainWeb3.eth.Contract(VestingFactoryAbi, addressesOnActiveNetwork.VestingFactory);
export const MultisignContract = new GolobalMainWeb3.eth.Contract(MultiSignWalletAbi, addressesOnActiveNetwork.MultisigWallet);

export const ProposalCategory = {
    InvokeValar: 0,
    RevokeValar: 1,
    InitiativeFund: 2
};

export const getEthPrice = async () => {
    try {
        const res = await axios.get('https://api.coinbase.com/v2/exchange-rates?currency=ETH')
        return parseFloat(res.data.data.rates.USD)
    } catch (err) {
        console.error(err);
        return 0;
    }
}

export const getGoldHolders = async (tokenAddress) => {
    try {
        const res = await axios.get(`https://api.ethplorer.io/getTokenInfo/${tokenAddress}?apiKey=EK-d6Y4i-vu1omJ5-GmdJy`)
        // const res = await axios.get(`https://goerli-api.ethplorer.io/getTokenInfo/${tokenAddress}?apiKey=EK-d6Y4i-vu1omJ5-GmdJy`)
        return res.data.holdersCount;
    } catch (err) {
        console.error(err);
        return 0;
    }
}

export const getTransactionEvents = async (web3, contractAbi, receiptLogs) => {
    try {
        const ret = decodeTxLogs(web3, contractAbi, receiptLogs);
        return ret;
    } catch (error) {
        console.error('Error fetching transaction events:', error);
        return null;
    }
}

export const decodeTxLogs = (web3, abi, logs) => {
    const contract = new web3.eth.Contract(abi, '0x0000000000000000000000000000000000000000')
    const events = contract._jsonInterface.filter((o) => o.type === 'event')

    let ret = [];
    for (const ev of events) {
        const lg = logs.find((g) => g.topics[0] === ev.signature);
        if (lg) {
            const r = web3.eth.abi.decodeLog(ev.inputs, lg.data, lg.topics.slice(1));
            ret = [...ret, { ...r, name: ev.name }];
        }
    }

    return ret;
}


export function getStartOfDay(date) {
    var start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
}

export function getEndOfDay(date) {
    var end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
}


//true: success, false: failed
export const checkTxIsSucceedOrNot = async (txHash) => {
    // const query = `https://api-mainnet.etherscan.io/api?module=transaction&action=getstatus&txhash=${txHash}}&apikey=CWAP1SWHARD9KQYVE7YSF2P3R2DH2K3KGW`
    const query = `https://api-goerli.etherscan.io/api?module=transaction&action=getstatus&txhash=${txHash}}&apikey=CWAP1SWHARD9KQYVE7YSF2P3R2DH2K3KGW`
    try {
        let queryResult = await axios.get(query);
        if (queryResult?.data?.result?.isError == 1) return false;
        else return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

export const readPendingOrCloseProposals = async () => {
    try {
        let pendingNewValars = [];
        let pendingRevokeValars = [];
        let pendingInitialFundings = [];
        let closed = [];
        if (!GovernanceContract) return {
            pendingNewValars,
            pendingRevokeValars,
            pendingInitialFundings,
            closed
        }
        const totalProposals = await GovernanceContract.methods.proposalCount().call();
        // console.log("totalProposals >>> ", totalProposals);
        if (parseInt(totalProposals) === 0) {
            // console.log("no proposals ");
            return {
                pendingNewValars,
                pendingRevokeValars,
                pendingInitialFundings,
                closed
            }
        }
        for (let i = 1; i < parseInt(totalProposals) + 1; i++) {
            const proposalState = await GovernanceContract.methods.state(i).call();
            const proposal = await GovernanceContract.methods.proposals(i).call();
            // console.log("start: ", parseInt(proposal["startBlock"]), " end: ",
            //     parseInt(proposal["endBlock"]), " curBlock: ", parseInt(curBlock));

            // console.log("proposalState >>> ", proposalState);
            // console.log("proposal >>> ", proposal);

            const obj = Object.assign([], proposal)
            // console.log("obj >>> ", obj);

            // match
            if (parseInt(proposalState) === 1 || parseInt(proposalState) === 0) {
                if (parseInt(obj["category"]) === 0) pendingNewValars.push(obj);
                if (parseInt(obj["category"]) === 1) pendingRevokeValars.push(obj);
                if (parseInt(obj["category"]) === 2) pendingInitialFundings.push(obj);
            } else {
                closed.push(obj)
            }

        }
        return {
            pendingNewValars,
            pendingRevokeValars,
            pendingInitialFundings,
            closed
        }
    } catch (err) {
        console.error(err);
        return {
            pendingNewValars: [],
            pendingRevokeValars: [],
            pendingInitialFundings: [],
            closed: []
        }
    }
}


export function isValidEthereumAddress(address) {
    return /^(0x)?[0-9a-fA-F]{40}$/.test(address);
}

export function getMinEthreumAddress(address) {
    if (!address) return "";
    else {
        const minAddress = address?.toString().substring(0, 6) + "..." + address?.toString().substring(address?.toString().length - 4, address.toString().length);

        return minAddress;
    }
}

export const copyToClipBoard = (text) => {
    navigator.clipboard.writeText(text)
    showToast("Referral Link copied to Clipboard", 2000);
    console.log("copied");
}

export function formatTime(seconds) {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const sec = seconds % 60;

    let timeString = '';

    if (days > 0) {
        timeString += `${days} day${days > 1 ? 's' : ''} `;
    }

    if (hours > 0) {
        timeString += `${hours} hour${hours > 1 ? 's' : ''} `;
    }

    if (minutes > 0) {
        timeString += `${minutes} min${minutes > 1 ? 's' : ''} `;
    }

    if (sec > 0 || (days === 0 && hours === 0 && minutes === 0)) {
        timeString += `${sec} second${sec !== 1 ? 's' : ''}`;
    }

    return timeString.trim();
}

// const handlePropose = async () => {
//     if (!isConnected) {
//         toast.warn("Please connect your wallet and try again.");
//         return;
//     }
//     if (chain?.id != votingChainId) {
//         toast.warn("Please change your network of wallet into Mumbai and try again.");
//         switchNetwork(votingChainId);
//         return;
//     }
//     // if (isEmpty(candidateUsername)) {
//     //     toast.warn("Name is invalid.");
//     //     return;
//     // }
//     if (isEmpty(initiative)) {
//         toast.warn("Initiative is invalid.");
//         return;
//     }
//     if (isEmpty(ethAmount) || parseFloat(ethAmount) <= 0) {
//         toast.warn("ETH amount is invalid.");
//         return;
//     }
//     if (isEmpty(candidateAddress) || GolobalETHWeb3.utils.isAddress(candidateAddress) !== true) {
//         toast.warn("Wallet is invalid.");
//         return;
//     }
//     try {
//         let valarBal = userValarBalance;
//         if (valarBal <= 0) {
//             valarBal = await ValarContract.methods.balanceOf(address).call();
//             console.log("valarBal >>> ", valarBal)
//             if (valarBal <= 0) {
//                 toast.warn("You don't have Valar. You can't submit a proposal.");
//                 return;
//             }
//         }
//         setWorking(true);
//         const signature = await generateProposalSign(
//             {
//                 valarBalance: parseInt(valarBal),
//                 category: ProposalCategory.InitiativeFund,
//                 target: candidateAddress,
//                 amount: parseEther(ethAmount).toString()
//             }
//         );
//         console.log("signature >>> ", signature);
//         // All properties on a domain are optional
//         const proposeHash = await walletClient.writeContract({
//             address: addressesOnVotingNetwork.governanceProxy,
//             abi: abis.governance,
//             functionName: "proposeBySig",
//             args: [parseInt(userValarBalance), ProposalCategory.InitiativeFund, candidateAddress, parseEther(ethAmount).toString(), signature?.toString()],
//         });
//         console.log("proposeHash >>> ", proposeHash);
//         const receipt = await waitForTransaction({ hash: proposeHash });
//         console.log("transaction is receipted >>> ", receipt);
//         const isSucceed = await checkTxIsSucceedOrNot(proposeHash);
//         console.log("transaction is result >>> ", isSucceed);
//         if (isSucceed) {
//             toast.success("You've proposed successfully!");
//             //save to backend db
//             const logs = await getTransactionEvents(GolobalPolygonWeb3, abis.governance, receipt.logs);
//             console.log("logs >>> ", logs);
//             if (logs && logs?.length > 0) {
//                 let newProposalLog = logs[0];
//                 console.log("newProposalLog >>> ", newProposalLog);
//                 const proposalId = parseInt(newProposalLog?.id);
//                 const target = newProposalLog.target;
//                 const proposer = newProposalLog.proposer;
//                 const category = ProposalCategory.InitiativeFund;
//                 const reason = initiative;
//                 const startBlock = parseInt(newProposalLog.startBlock);
//                 const endBlock = parseInt(newProposalLog.endBlock);
//                 saveNewProposal({
//                     proposalId, target, proposer, category, reason, ethAmount: formatEther(newProposalLog?.amount), startBlock, endBlock
//                 });
//                 clearInputs();
//             }
//         } else {
//             toast.error("Transaction is failed!");
//         }
//         setWorking(false);
//     } catch (err) {
//         console.error(err);
//         setWorking(false);
//     }
// }