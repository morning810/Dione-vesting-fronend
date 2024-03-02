import { useEffect, useState } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import { fadeInUp } from "../assets/constants";
import Box from "@mui/material/Box";
import { DataGrid } from "@mui/x-data-grid";
import Reveal from "react-awesome-reveal";
import "react-circular-progressbar/dist/styles.css";
import { useParams } from "react-router-dom";
import StakingActivityLines from "../components/chart/StakingActivityLines";
import {
  GolobalMainWeb3,
  VestingFactoryContract,
  copyToClipBoard,
  formatTime,
  getEndOfDay,
  getMinEthreumAddress,
  getStartOfDay,
  getTransactionEvents,
  isValidEthereumAddress
} from "../chain_interaction/common";
import { formatUnits, parseUnits, formatEther, parseEther } from "viem";
import {
  useAccount,
  useWalletClient,
  useNetwork,
  useSwitchNetwork
} from "wagmi";
import { toast } from "react-toastify";
import {
  activeChainId,
  addressesOnActiveNetwork
} from "../chain_interaction/deployedAddresses";
import nativeVestingAbi from "../chain_interaction/abi/NativeVesting.json";
import tokenVestingAbi from "../chain_interaction/abi/TokenVesting.json";
import { waitForTransaction } from "@wagmi/core";
import ERC20Abi from "../chain_interaction/abi/ERC20.json";
import { CircularProgress, Backdrop } from "@mui/material";
import { IoIosLogOut } from "react-icons/io";
import {
  getSingleVestingByAddress,
  readClaimesByPage,
  saveNewClaim
} from "../backend_interaction";
import multiSignAbi from "../chain_interaction/abi/MultiSign.json";
import { RiFileCopyLine } from "react-icons/ri";
import isEmpty from "is-empty";
import { FaCheck } from "react-icons/fa";
import { FaRegCopy } from "react-icons/fa";

const PAGE_SIZE = 5;

const TransactionType = {
  Fund: 0,
  ReleaseToOwner: 1,
  ReleaseToRecipients: 2,
  Revoke: 3
};

const Vesting = () => {
  const { vesting_id } = useParams();
  const [percentage, setPercentage] = useState(45);
  const [sortModel, setSortModel] = useState([
    {
      field: "stake",
      sort: "desc"
    }
  ]);
  const [tableRows, setTableRows] = useState([]);
  const [amountTobeVested, setAmountTobeVested] = useState(0);
  const [nowTime, setNowTime] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [fee, setFee] = useState(0);
  const [feeTreasury, setFeeTreasury] = useState("");
  const [vestingName, setVestingName] = useState("");
  const [sender, setSender] = useState("");
  const [vestingPeriod, setVestingPeriod] = useState(0);
  const [vestingRate, setVestingRate] = useState(0);
  const [revokeAble, setRevokeAble] = useState(0);
  const [contractAddress, setContractAddress] = useState("");
  const [vestingToken, setVestingToken] = useState("");
  const [countdown, setCountDown] = useState(0);
  const [receipentsCount, setReceipentsCount] = useState(0);
  const [receipentWallets, setReceipentWallets] = useState([]);
  const [myReleasedAmount, setMyReleasedAmount] = useState(0);
  const [totalVestedAmount, setTotalVestedAmount] = useState(0);
  const [contractBalance, setContractBalance] = useState(0);
  const [tokenDecimals, setTokenDecimals] = useState(0);
  const [totalResultCount, setTotalResultCount] = useState(0);
  const [multiSignContractAddress, setMultiSignContractAddress] = useState("");
  const [multiSignStarted, setMultiSignStarted] = useState(false);
  const [multiSignCandidators, setMultiSignCandidators] = useState([]);
  const [multiSignLastTxId, setMultiSignLastTxId] = useState(0); //   multiSignLastTxId,    multiSignLastTxObj,    multiSignConfirmationStatus
  const [multiSignLastTxObj, setMultiSignLastTxObj] = useState({});
  const [multiSignLastTxConfirmStatus, setMultiSignLastTxConfirmStatus] =
    useState([]);
  const [multiSignIsLastTxConfimed, setMultiSignIsLastTxConfimed] =
    useState(true);
  const [multiSignMinNumOfCofirm, setMultiSignMinNumOfConfirm] = useState(0);
  const [copiedContractAddress, setCopiedContractAddress] = useState(false);
  const [vestingOwner, setVestingOwner] = useState("");
  const [multiSignType, setMultiSignType] = useState(TransactionType.Fund);

  const [pagenationModel, setPagenationModel] = useState({
    page: 0,
    pageSize: PAGE_SIZE
  });
  const { address, isConnected } = useAccount();
  const [working, setWorking] = useState(false);
  const { data: walletClient } = useWalletClient();
  const { chain } = useNetwork();
  const { isLoading: isSwitchingLoading, switchNetwork } = useSwitchNetwork();

  const columns = [
    {
      field: "receipent",
      headerName: "Recipient",
      editable: false,
      sortable: false,
      minWidth: 100,
      flex: 1,
      renderCell: (params) => {
        return (
          <div className="w-full pl-5 ">
            <a
              href={`${addressesOnActiveNetwork?.blackScanUrl}address/${params?.value}`}
              target="_blank"
              className="text-white z-10"
            >
              {getMinEthreumAddress(params?.value)}
            </a>
          </div>
        );
      }
    },
    {
      field: "amount",
      headerName: "Claimed Amount",
      editable: false,
      minWidth: 80,
      flex: 1,
      renderCell: (params) => {
        return (
          <div className="flex gap-2">
            <div className="">{Number(params?.value).toFixed(4)}</div>
          </div>
        );
      }
    },
    {
      field: "createdAt",
      headerName: "Claimed Time",
      sortable: true,
      flex: 1,
      minWidth: 110,
      renderCell: (params) => {
        return (
          <div className="flex gap-2">
            <div className="">{new Date(params?.value).toISOString()}</div>
          </div>
        );
      }
    },
    {
      field: "txHash",
      headerName: "View Detail",
      sortable: false,
      flex: 1,
      minWidth: 30,
      renderCell: (params) => {
        return (
          <div className="flex gap-2">
            <a
              href={`${addressesOnActiveNetwork.blackScanUrl}tx/${params?.value}`}
              target="_blank"
              className="text-white z-10"
            >
              <IoIosLogOut className="cursor-pointer " />
            </a>
          </div>
        );
      }
    }
  ];

  const [copySuccess, setCopySuccess] = useState("");

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess("Copied!");
    } catch (err) {
      setCopySuccess("Failed to copy!");
    }
  };

  useEffect(() => {
    console.log("========= pagenationModel:", pagenationModel);
    readLiveHistory(pagenationModel);
    readVestingPublicParams(vesting_id);

    let count = 0;
    const interval = setInterval(() => {
      const timeRemaining = getTimeRemained(startTime, endTime);
      setCountDown(timeRemaining);
      count++;
      if (count % 10 === 0) {
        console.log("========= vesting_id:", vesting_id);
        readLiveHistory(pagenationModel);

        readVestingPublicParams(vesting_id);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getTimeRemained = (startDate, endDate) => {
    const now = new Date();
    const startTime = getStartOfDay(startDate);
    const endTime = getEndOfDay(endDate);
    const timeDifference =
      now.getTime() - endTime.getTime() < 0
        ? startTime.getTime() - now.getTime() > 0
          ? endTime.getTime() - startTime.getTime()
          : endTime.getTime() - now.getTime()
        : 0;

    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor(
      (timeDifference % (1000 * 60 * 60)) / (1000 * 60)
    );
    const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);
    const remaindRate =
      (parseFloat(timeDifference?.toString()) * 100) /
      (endTime.getTime() - startTime.getTime());

    return { remaindRate, days, hours, minutes, seconds };
  };

  function getNextVestingDate(startDate, endDate, vestingPeriod) {
    let start = new Date(startDate);
    let end = new Date(endDate);
    let now = new Date();

    if (now < start) {
      return "Not started yet.";
    } else if (now > end) {
      return "Already ended.";
    }

    let nextVestingDate = new Date(start);
    while (nextVestingDate <= now) {
      nextVestingDate = new Date(
        nextVestingDate.getTime() + vestingPeriod * 1000
      );
    }

    if (nextVestingDate > end) {
      return "Already ended.";
    }

    return formatTimeDifference(now, nextVestingDate);
  }

  function formatTimeDifference(current, future) {
    let diff = future - current;
    let days = Math.floor(diff / (24 * 3600 * 1000));
    let hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
    let minutes = Math.floor((diff % (3600 * 1000)) / (60 * 1000));

    let result = "";
    if (days > 0) result += days + "D ";
    if (hours > 0 || days > 0) result += hours + "H ";
    result += minutes + "m later";

    return result;
  }

  const readVestingPublicParams = async (vesting_id) => {
    try {
      if (vesting_id && Number(vesting_id) >= 0) {
        let publicParams = await VestingFactoryContract.methods
          .readSpecificVesting(vesting_id)
          .call();
        const paramsFromDB = await getSingleVestingByAddress(
          publicParams?.target
        );

        console.log("===== publicParams:", publicParams);
        console.log("===== paramsFromDB:", paramsFromDB);

        const amountTobeVested = parseFloat(
          formatUnits(publicParams?.amount, parseInt(publicParams?.decimals))
        );
        const abi =
          publicParams?.token !== addressesOnActiveNetwork.ZeroAddress
            ? tokenVestingAbi
            : nativeVestingAbi;
        const vestingContract = new GolobalMainWeb3.eth.Contract(
          abi,
          publicParams?.target
        );

        setTokenDecimals(parseInt(publicParams?.decimals?.toString()));
        setReceipentsCount(publicParams?.recipients?.length);
        setReceipentWallets(publicParams?.recipients);
        setVestingToken(publicParams?.token);
        setContractAddress(publicParams?.target);
        setRevokeAble(publicParams?.revokable);
        setVestingRate(parseFloat(publicParams?.rate?.toString()) / 100);
        setVestingPeriod(parseInt(publicParams?.period?.toString()));
        setSender(publicParams?.owner);
        setVestingName(publicParams?.name);
        setFee(parseFloat(publicParams?.fee?.toString()) / 100);
        setFeeTreasury(publicParams?.treasury);
        console.log(
          " publicParams?.start >> ",
          publicParams?.start,
          " publicParams?.end >> ",
          publicParams?.end
        );
        setStartTime(
          new Date(parseInt(publicParams?.start?.toString()) * 1000)
        );
        setEndTime(new Date(parseInt(publicParams?.end?.toString()) * 1000));
        setAmountTobeVested(amountTobeVested);

        const totalVeAmount = await vestingContract.methods
          .vestedAmount()
          .call();
        const multiSignAddress = paramsFromDB?.multiSignAddress;
        const owner = await vestingContract.methods.owner().call();
        let candidators = [],
          numConfirm = 0,
          lastTxId = 0,
          lastTxObj,
          lastTxConfimStatus,
          isTxConfirmed = true,
          isMultiSStarted = false;
        if (
          multiSignAddress !== addressesOnActiveNetwork?.ZeroAddress &&
          isValidEthereumAddress(multiSignAddress)
        ) {
          try {
            //read multi sign candidators and minimum number of confirmation
            const multiSignCotract = new GolobalMainWeb3.eth.Contract(
              multiSignAbi,
              multiSignAddress
            );
            numConfirm = await multiSignCotract.methods.numConfirm().call();
            numConfirm = parseInt(numConfirm?.toString());
            // multiSignLastTxId,    multiSignLastTxObj,    multiSignLastTxConfirmStatus
            isMultiSStarted = await multiSignCotract.methods.isStarted().call();
            let index = 0;
            while (true) {
              try {
                let owner = await multiSignCotract.methods.owners(index).call();
                candidators.push(owner);
                index++;
              } catch (error) {
                break;
              }
            }
            if (isMultiSStarted === true) {
              lastTxId = await multiSignCotract.methods.lastTransId().call();
              lastTxId = parseInt(lastTxId?.toString());
              lastTxObj = await multiSignCotract.methods
                .transactions(lastTxId)
                .call();
              console.log("lastTxObj >>> ", lastTxObj);
              lastTxConfimStatus = [];
              isTxConfirmed = await multiSignCotract.methods
                .isTransactionConfirmed(lastTxId)
                .call();
              console.log("isTxConfirmed >>> ", isTxConfirmed);
              for (let index = 0; index < candidators?.length; index++) {
                try {
                  let confirmed = await multiSignCotract.methods
                    .isSignerConfirmed(lastTxId, candidators[index])
                    .call();
                  lastTxConfimStatus = [
                    ...lastTxConfimStatus,
                    {
                      signer: candidators[index],
                      confimration: confirmed
                    }
                  ];
                } catch (error) {
                  console.error(error);
                }
              }
              console.log("lastTxConfimStatus >>> ", lastTxConfimStatus);
            }
          } catch (err) {
            console.error(err);
          }
        }
        let contractBal = 0;
        if (publicParams?.token !== addressesOnActiveNetwork.ZeroAddress) {
          // read token balance
          const tokenContract = new GolobalMainWeb3.eth.Contract(
            ERC20Abi,
            publicParams?.token
          );
          contractBal = await tokenContract?.methods
            .balanceOf(publicParams?.target)
            .call();
          contractBal = parseFloat(
            formatUnits(
              contractBal,
              parseInt(publicParams?.decimals?.toString())
            )
          );
        } else {
          // read native balance
          contractBal = await GolobalMainWeb3?.eth.getBalance(
            publicParams?.target
          );
          contractBal = parseFloat(formatEther(contractBal));
        }
        if (address) {
          const myVeAmount = await vestingContract.methods
            .released(address)
            .call();
          setMyReleasedAmount(
            parseFloat(
              formatUnits(
                myVeAmount?.toString(),
                parseInt(publicParams?.decimals?.toString())
              )
            )
          );
        }
        setTotalVestedAmount(
          parseFloat(
            formatUnits(
              totalVeAmount,
              parseInt(publicParams?.decimals?.toString())
            )
          )
        );
        setContractBalance(contractBal);
        setMultiSignContractAddress(multiSignAddress);
        setMultiSignCandidators(candidators);
        setMultiSignMinNumOfConfirm(numConfirm);
        setMultiSignLastTxId(lastTxId);
        setMultiSignIsLastTxConfimed(isTxConfirmed);
        setMultiSignLastTxObj(lastTxObj);
        setMultiSignLastTxConfirmStatus(lastTxConfimStatus);
        setMultiSignStarted(isMultiSStarted);
        setVestingOwner(owner);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const claminMyVesting = async () => {
    try {
      if (isConnected === false) {
        toast.warn("Please connect your wallet and try again.");
        return;
      }
      if (chain?.id != activeChainId) {
        toast.warn("Please change your network of wallet into  and try again.");
        switchNetwork(activeChainId);
        return;
      }
      if (address && contractAddress) {
        setWorking(true);
        const claimHash = await walletClient.writeContract({
          address: contractAddress,
          abi:
            vestingToken !== addressesOnActiveNetwork.ZeroAddress
              ? tokenVestingAbi
              : nativeVestingAbi,
          functionName: "claim",
          args: []
        });

        const receipt = await waitForTransaction({ hash: claimHash });

        const logs = await getTransactionEvents(
          GolobalMainWeb3,
          vestingToken !== addressesOnActiveNetwork.ZeroAddress
            ? tokenVestingAbi
            : nativeVestingAbi,
          receipt.logs
        );

        if (logs && logs?.length > 0) {
          let newReleasedToRecipientLog = logs[0];

          if (newReleasedToRecipientLog?.name === "ReleasedToRecipient") {
            toast.success("You've claimed successfully.");
            saveNewClaim({
              vestingId: vesting_id,
              contract: contractAddress,
              token: vestingToken,
              tokenDecimals: tokenDecimals,
              amount: parseFloat(
                formatUnits(
                  newReleasedToRecipientLog?._amount,
                  parseInt(tokenDecimals?.toString())
                )
              ),
              receipent: newReleasedToRecipientLog?._recipient,
              txHash: claimHash
            });
          }
        } else {
          toast.error("Failed!");
        }
        setWorking(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed!");
      setWorking(false);
    }
  };

  const handlePageChange = async (newPage) => {
    setPagenationModel(newPage);
    // Add your custom operations here
    readLiveHistory(newPage);
  };

  const readLiveHistory = async (pagenationmodel) => {
    const claims = await readClaimesByPage(
      pagenationmodel.page,
      pagenationmodel.pageSize,
      vesting_id
    );

    let claimsOfpage = [];
    for (let index = 0; index < claims?.data?.length; index++) {
      claimsOfpage.push({
        ...claims?.data[index],
        id: claims?.data[index]["_id"]
      });
    }

    setTableRows(claimsOfpage);
    setTotalResultCount(claims?.totalCount);
  };

  const prepareMultiSignTx = async () => {
    try {
      if (chain?.id != activeChainId) {
        toast.warn("Please change your network of wallet into  and try again.");
        switchNetwork(activeChainId);
        return;
      }
      setWorking(true);

      console.log(" preparing >>>  ", {
        address: multiSignContractAddress,
        abi: multiSignAbi,
        functionName: "submitTransaction",
        args: [contractAddress, multiSignType, receipentWallets]
      });
      const prepareHash = await walletClient.writeContract({
        address: multiSignContractAddress,
        abi: multiSignAbi,
        functionName: "submitTransaction",
        args: [contractAddress, multiSignType, receipentWallets]
      });
      console.log(" prepareHash >>>  ", prepareHash);
      const receipt = await waitForTransaction({ hash: prepareHash });
      const logs = await getTransactionEvents(
        GolobalMainWeb3,
        multiSignAbi,
        receipt.logs
      );
      if (logs && logs?.length > 0) {
        let newPrepareLog = logs[0];
        if (newPrepareLog?.name === "TransactionSubmitted") {
          toast.success("You've initialized a new multi sign tx successfully.");
        }
      } else {
        toast.error("Failed!");
      }
      setWorking(false);
    } catch (err) {
      console.error(err);
      setWorking(false);
    }
  };

  const confirmMulisign = async (signerAddress) => {
    try {
      if (isConnected === false) return;

      if (chain?.id != activeChainId) {
        toast.warn("Please change your network of wallet into  and try again.");
        switchNetwork(activeChainId);
        return;
      }
      if (signerAddress?.toString()?.toLowerCase() !== address?.toLowerCase())
        return;
      setWorking(true);
      const confirmHash = await walletClient.writeContract({
        address: multiSignContractAddress,
        abi: multiSignAbi,
        functionName: "confirmTransaction",
        args: [multiSignLastTxId]
      });
      const receipt = await waitForTransaction({ hash: confirmHash });
      const logs = await getTransactionEvents(
        GolobalMainWeb3,
        multiSignAbi,
        receipt.logs
      );
      if (logs && logs?.length > 0) {
        let newPrepareLog = logs[0];
        if (newPrepareLog?.name === "TransactionConfirmed") {
          toast.success("You've confirmed to tx successfully.");
        }
      } else {
        toast.error("Failed!");
      }
      setWorking(false);
    } catch (err) {
      console.error(err);
      setWorking(false);
    }
  };

  const executeMultiSignTx = async () => {
    try {
      if (chain?.id != activeChainId) {
        toast.warn("Please change your network of wallet into  and try again.");
        switchNetwork(activeChainId);
        return;
      }
      let numberOfCurrentConfirms = 0;
      multiSignLastTxConfirmStatus?.map((item, index) => {
        if (item?.confimration === true)
          numberOfCurrentConfirms = Number(numberOfCurrentConfirms) + Number(1);
      });
      if (numberOfCurrentConfirms < multiSignMinNumOfCofirm) {
        toast.warn(
          "Can not excute transaction before number of confirmation exceed the required min number of confirmation."
        );
        return;
      }
      setWorking(true);
      let amountToDeposit =
        amountTobeVested - contractBalance > 0
          ? amountTobeVested - contractBalance
          : 0;
      if (vestingToken !== addressesOnActiveNetwork.ZeroAddress) {
        let amountToDepositWei = parseUnits(
          amountToDeposit?.toString(),
          tokenDecimals
        );
        const tokenContract = new GolobalMainWeb3.eth.Contract(
          ERC20Abi,
          vestingToken
        );
        let approvalsBefore = await tokenContract.methods
          .allowance(address, multiSignContractAddress)
          .call();
        approvalsBefore = formatUnits(
          approvalsBefore?.toString(),
          tokenDecimals
        );
        const needApprove =
          parseFloat(approvalsBefore?.toString()) <
            parseFloat(amountToDeposit?.toString()) && amountToDeposit > 0;
        if (needApprove === true) {
          const approveHash = await walletClient.writeContract({
            address: vestingToken,
            abi: ERC20Abi,
            functionName: "approve",
            args: [multiSignContractAddress, amountToDepositWei]
          });
          const receipt = await waitForTransaction({ hash: approveHash });
          const logs = await getTransactionEvents(
            GolobalMainWeb3,
            ERC20Abi,
            receipt.logs
          );
          if (logs && logs?.length > 0) {
            let newApproveLog = logs[0];
            if (newApproveLog?.name === "Approval") {
              toast.success(
                "You've approved tokens successfully. We will continue excution."
              );
            }
          } else {
            toast.error("Failed!");
            setWorking(false);
            return;
          }
        }
        const excuteHash = await walletClient.writeContract({
          address: multiSignContractAddress,
          abi: multiSignAbi,
          functionName: "executeTransaction",
          args: [multiSignLastTxId]
        });
        const receipt = await waitForTransaction({ hash: excuteHash });
        const logs = await getTransactionEvents(
          GolobalMainWeb3,
          multiSignAbi,
          receipt.logs
        );
        if (logs && logs?.length > 0) {
          let newPrepareLog = logs[0];
          if (newPrepareLog?.name === "TransactionExecuted") {
            toast.success("You've excuted a multi sign tx successfully.");
          }
        } else {
          toast.error("Failed!");
          setWorking(false);
          return;
        }
      } else {
        amountToDeposit = parseEther(amountToDeposit?.toString());

        const excuteHash = await walletClient.writeContract({
          address: multiSignContractAddress,
          abi: multiSignAbi,
          functionName: "executeTransaction",
          args: [multiSignLastTxId],
          value: amountToDeposit
        });
        const receipt = await waitForTransaction({ hash: excuteHash });
        const logs = await getTransactionEvents(
          GolobalMainWeb3,
          multiSignAbi,
          receipt.logs
        );
        if (logs && logs?.length > 0) {
          let newPrepareLog = logs[0];
          if (newPrepareLog?.name === "TransactionExecuted") {
            toast.success("You've excuted a multi sign tx successfully.");
          }
        } else {
          toast.error("Failed!");
          setWorking(false);
          return;
        }
      }
      setWorking(false);
    } catch (err) {
      console.error(err);
      setWorking(false);
    }
  };

  const depositRemainderFunds = async () => {
    try {
      if (chain?.id != activeChainId) {
        toast.warn("Please change your network of wallet into  and try again.");
        switchNetwork(activeChainId);
        return;
      }
      if (contractBalance >= amountTobeVested) {
        toast.info("Contract has been already filled with enough funds.");
        return;
      } else {
        let amountToDeposit = amountTobeVested - contractBalance;
        if (vestingToken !== addressesOnActiveNetwork.ZeroAddress) {
          amountToDeposit = parseUnits(
            amountToDeposit?.toString(),
            tokenDecimals
          );
          setWorking(true);
          const depositHash = await walletClient.writeContract({
            address: vestingToken,
            abi: ERC20Abi,
            functionName: "transfer",
            args: [contractAddress, amountToDeposit]
          });
          await waitForTransaction({ hash: depositHash });
        } else {
          amountToDeposit = parseEther(amountToDeposit?.toString());
          setWorking(true);
          const depositHash = await walletClient.sendTransaction({
            to: contractAddress,
            value: amountToDeposit
          });
          await waitForTransaction({ hash: depositHash });
          toast.success("Successfully deposited funds!");
        }
      }
      setWorking(false);
    } catch (err) {
      console.error(err);
      setWorking(false);
    }
  };

  const revokeFunds = async () => {
    try {
      if (chain?.id != activeChainId) {
        toast.warn("Please change your network of wallet into  and try again.");
        switchNetwork(activeChainId);
        return;
      }
      setWorking(true);
      const revokeHash = await walletClient.writeContract({
        address: contractAddress,
        abi:
          vestingToken !== addressesOnActiveNetwork.ZeroAddress
            ? tokenVestingAbi
            : nativeVestingAbi,
        functionName: "revoke",
        args: []
      });
      const receipt = await waitForTransaction({ hash: revokeHash });
      const logs = await getTransactionEvents(
        GolobalMainWeb3,
        vestingToken !== addressesOnActiveNetwork.ZeroAddress
          ? tokenVestingAbi
          : nativeVestingAbi,
        receipt.logs
      );
      if (logs && logs?.length > 0) {
        let newRevokedLog = logs[0];
        if (newRevokedLog?.name === "Revoked") {
          toast.success("You've revoked funds successfully.");
        }
      } else {
        toast.error("Failed!");
      }
      setWorking(false);
    } catch (err) {
      console.error(err);
      setWorking(false);
    }
  };

  return (
    <div className="text-white pb-20 pt-28 md:pt-0">
      <div className="flex items-center flex flex-col border border-panel-border-gray rounded-[50px] bg-[#19191920] relative">
        <div className="text-[26px] md:text-[24px] lg:text-[28px] font-semibold py-8">
          {vestingToken !== addressesOnActiveNetwork?.ZeroAddress
            ? "Locker"
            : "Vesting"}{" "}
          #{Number(vesting_id) + 1}
        </div>

        <div className="absolute -top-[25vw] -left-[15vw] md:-top-[250px] md:-left-[200px] flex w-full justify-start z-0">
          <div className="explore-pink-radial transform -rotate-90 w-[100vw] h-[100vw] md:h-[860px] md:w-[860px] opacity-50 "></div>
        </div>
        <div className="absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center z-0 ">
          <div className="vesting-darkblue-radial  h-[600px] w-[600px] opacity-60 "></div>
        </div>
        <div className="flex flex-col w-[100vw] items-center md:w-full md:grid md:grid-cols-2 pb-10 ">
          <div className=" flex flex-col items-center w-[96vw] md:ml-20 md:mx-0  md:w-auto">
            <div className=" min-h-[350px] flex flex-col gap-5  md:w-full py-10 md:w-[40vw] justify-center">
              <div className="w-full md:px-10 flex justify-between gap-9 md:gap-0">
                <div className="w-6/12 text-week-white flex justify-start">
                  {vestingToken !== addressesOnActiveNetwork?.ZeroAddress
                    ? "Locker"
                    : "Vesting"}{" "}
                  Name
                </div>
                <div className="w-6/12 text-[18px] font-semibold flex justify-start">
                  {vestingName}
                </div>
              </div>
              <div className="w-full md:px-10 flex justify-between gap-8 md:gap-0">
                <div className="flex flex-col w-6/12 items-start">
                  <div className=" text-week-white "> Contract</div>
                  <div className=" text-[18px] font-semibold z-10 flex gap-1 items-center">
                    <a
                      href={`${addressesOnActiveNetwork?.blackScanUrl}address/${contractAddress}`}
                      target="_blank"
                      className="text-white z-10"
                    >
                      {getMinEthreumAddress(contractAddress)}
                    </a>
                    <FaRegCopy
                      className="cursor-pointer hover:transform hover:scale-110"
                      onClick={() => copyToClipboard(contractAddress)}
                    />
                  </div>
                </div>
                <div className="flex flex-col w-6/12 items-start">
                  <div className=" text-week-white ">Token</div>
                  <div className=" text-[18px] font-semibold z-10 ">
                    {vestingToken !== addressesOnActiveNetwork?.ZeroAddress ? (
                      <div className="flex gap-1 items-center">
                        <a
                          href={`${addressesOnActiveNetwork?.blackScanUrl}address/${vestingToken}`}
                          target="_blank"
                          className="text-white z-10"
                        >
                          {getMinEthreumAddress(vestingToken)}
                        </a>
                        <FaRegCopy
                          className="cursor-pointer hover:transform hover:scale-110"
                          onClick={() => copyToClipboard(vestingToken)}
                        />
                      </div>
                    ) : (
                      "Native"
                    )}
                  </div>
                </div>
              </div>
              <div className="w-full md:px-10 flex justify-between gap-8 md:gap-0">
                <div className="flex flex-col w-6/12 items-start">
                  <div className=" text-week-white ">Sender</div>
                  <div className=" text-[18px] font-semibold z-10 flex gap-1 items-center">
                    <a
                      href={`${addressesOnActiveNetwork?.blackScanUrl}address/${sender}`}
                      target="_blank"
                      className="text-white z-10"
                    >
                      {getMinEthreumAddress(sender)}
                    </a>
                    <FaRegCopy
                      className="cursor-pointer hover:transform hover:scale-110"
                      onClick={() => copyToClipboard(sender)}
                    />
                  </div>
                </div>
                <div className="flex flex-col w-6/12 items-start">
                  <div className=" text-week-white ">
                    {receipentsCount > 1 ? "Recipients" : "Recipient"}
                  </div>
                  <div className=" text-[18px] font-semibold z-10">
                    {receipentsCount > 1 ? (
                      `${receipentsCount} wallets`
                    ) : (
                      <div className="flex gap-1 items-center">
                        <a
                          href={`https://testnet.odysseyscan.com/${receipentWallets[0]}`}
                          target="_blank"
                          className="text-white"
                        >
                          {getMinEthreumAddress(receipentWallets[0])}
                        </a>
                        <FaRegCopy
                          className="cursor-pointer hover:transform hover:scale-110"
                          onClick={() => copyToClipboard(receipentWallets[0])}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-full md:px-10 flex justify-between gap-14 md:gap-0">
                <div className="flex flex-col w-6/12 items-start">
                  <div className=" text-week-white max-w-[100px] text-left">
                    Expected Payout
                  </div>
                  <div className=" text-[18px] font-semibold">
                    {amountTobeVested?.toFixed(2)}
                  </div>
                </div>
                <div className="flex flex-col w-6/12 items-start">
                  <div className=" text-week-white max-w-[100px] text-left">
                    Contract Balance
                  </div>
                  <div className=" text-[18px] font-semibold">
                    {contractBalance?.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="w-full md:px-10 flex justify-between gap-14 md:gap-0">
                <div className="flex flex-col w-6/12 items-start">
                  <div className=" text-week-white ">Rate</div>
                  <div className=" text-[18px] font-semibold">
                    {vestingRate}%
                  </div>
                </div>
                <div className="flex flex-col w-6/12 items-start">
                  <div className=" text-week-white ">Period</div>
                  <div className=" text-[18px] font-semibold">
                    {formatTime(vestingPeriod)}
                  </div>
                </div>
              </div>
              <div className="w-full md:px-10 flex justify-between gap-14 md:gap-0">
                <div className="flex flex-col w-6/12 items-start">
                  <div className=" text-week-white ">Revokable</div>
                  <div className=" text-[18px] font-semibold">
                    {revokeAble ? "Yes" : "No"}
                  </div>
                </div>
                <div className="flex flex-col w-6/12 items-start">
                  <div className=" text-week-white ">Fee rate</div>
                  <div className=" text-[18px] font-semibold">{fee}%</div>
                </div>
              </div>
              <div className="w-full md:px-10 flex justify-between gap-14 md:gap-0">
                <div className="flex flex-col w-6/12 items-start">
                  <div className=" text-week-white ">Start Date</div>
                  <div className=" text-[18px] font-semibold">
                    {startTime?.toLocaleDateString()}
                  </div>
                </div>
                <div className="flex flex-col w-6/12 items-start">
                  <div className=" text-week-white ">End Date</div>
                  <div className=" text-[18px] font-semibold">
                    {endTime?.toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
            <div
              className="w-10/12 md:w-[36vw]  flex justify-between  
                    "
            >
              <div className="text-week-white">
                {vestingToken !== addressesOnActiveNetwork?.ZeroAddress
                  ? "Locked"
                  : "Vested"}{" "}
                Amount
              </div>

              <div>
                {isNaN(Number((totalVestedAmount * 100) / amountTobeVested))
                  ? 0
                  : Number(
                      (totalVestedAmount * 100) / amountTobeVested
                    )?.toFixed(2)}{" "}
                %
              </div>
            </div>
            <div className="w-10/12 md:w-[36vw] mt-1 bg-[#12101C] border-[#343143] border-2 h-[24px] rounded-full relative">
              <div
                className={`absolute top-0 left-0 bottom-0 rounded-full `}
                style={{
                  width: `${(totalVestedAmount * 100) / amountTobeVested}%`,
                  backgroundColor: `rgba(255, 64, 154, ${
                    totalVestedAmount / amountTobeVested
                  })`
                }}
              ></div>
            </div>
          </div>
          <div className="w-[100vw] md:w-auto md:col-span-1 flex flex-col gap-5 justify-center  items-center pt-5 md:border-l-[2px] md:border-l-[#ffffff6a]">
            <div className="w-[96vw]  md:w-9/12 flex justify-center items-center relative ">
              <div style={{ width: 300, height: 300 }}>
                <CircularProgressbar
                  value={getTimeRemained(startTime, endTime).remaindRate}
                  text={`${getTimeRemained(startTime, endTime).remaindRate}%`}
                  styles={buildStyles({
                    // Rotation of path and trail, in number of turns (0-1)
                    rotation: 0,
                    // Whether to use rounded or flat corners on the ends - can use 'butt' or 'round'
                    strokeLinecap: "butt",
                    // Text size
                    textSize: "16px",
                    // How long animation takes to go from one percentage to another, in seconds
                    pathTransitionDuration: 0.5,
                    // Can specify path transition in more detail, or remove it entirely
                    // pathTransition: 'none',
                    // Colors
                    pathColor: `rgba(255, 64, 154, ${
                      getTimeRemained(startTime, endTime).remaindRate
                    })`,
                    textColor: "transparent",
                    trailColor: "#ffffff12",
                    backgroundColor: "#ffffff"
                  })}
                />

                <div className="absolute z-0 top-0 left-0 right-0 bottom-0 w-full h-full flex justify-center items-center">
                  <div className="relative w-[300px] h-[300px] ">
                    <img
                      src="/vesting/Ellipse_outer.svg"
                      className="w-full h-full"
                    />
                    <div className="absolute z-0 top-0 left-0 right-0 bottom-0 w-full h-full flex justify-center items-center">
                      <div className="relative w-[252px] h-[252px] ">
                        <img
                          src="/vesting/Ellipse_outer.svg"
                          className="w-full h-full"
                        />
                        <div className="absolute z-0 top-0 left-0 right-0 bottom-0 w-full h-full flex justify-center items-center">
                          <div className="relative w-[222px] h-[222px] ">
                            <img
                              src="/vesting/Ellipse_outer.svg"
                              className="w-full h-full"
                            />

                            <div className="absolute z-0 top-0 left-0 right-0 bottom-0 w-full h-full flex justify-center items-center">
                              <div className="relative w-[120px] h-[120px] ">
                                <img
                                  src="/vesting/logo.svg"
                                  className="w-full h-full"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 left-0 right-0 bottom-0 flex text-center text-[24px] justify-center items-center z-5">
                <div
                  className="bg-[#ffffff24] border-white h-[80px] w-[90vw] md:w-[400px] md:mx-0  rounded-2xl text-center flex items-center justify-center
                                text-[30px] font-medium
                            "
                >
                  {`${getTimeRemained(startTime, endTime).days}D ${
                    getTimeRemained(startTime, endTime).hours
                  }H ${getTimeRemained(startTime, endTime).minutes}M ${
                    getTimeRemained(startTime, endTime).seconds
                  }S`}
                </div>
              </div>
            </div>
            <div className="z-10">
              <button
                className={` bg-[#ffffff12] rounded-full px-4 py-3 
                                text-white w-[200px] disabled:opacity-60
                            `}
                onClick={() => claminMyVesting()}
                disabled={
                  !address || receipentWallets?.includes(address) === false
                }
              >
                Claim
              </button>
            </div>
            <div className="flex flex-col gap-2 text-[16px]">
              <div className="text-week-white">
                My claimed amount:{" "}
                <span className="text-white">
                  {Number(myReleasedAmount)?.toFixed(4)}
                </span>
              </div>
              <div className="text-week-white">
                Next period starts:{" "}
                <span className="text-white">
                  {getNextVestingDate(startTime, endTime, vestingPeriod)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {isConnected &&
        (multiSignCandidators.findIndex(
          (item) => item?.toString().toLowerCase() === address?.toLowerCase()
        ) >= 0 ||
          address?.toLowerCase() === vestingOwner?.toLowerCase()) && (
          <div className="w-full border border-panel-border-gray rounded-[50px] bg-[#19191920] min-h-[350px] flex flex-col md:gap-5  py-10 justify-center mt-5 items-center relative ">
            <div className="absolute -top-[25vw] -left-[15vw] md:-top-[150px] md:-left-[200px] flex w-full justify-start ">
              <div className="explore-pink-radial transform -rotate-90 w-[100vw] h-[100vw] md:h-[860px] md:w-[860px] opacity-50 "></div>
            </div>
            <div className="absolute top-0 -bottom-[300px] left-0 right-0 flex justify-end items-center z-0 ">
              <div className="vesting-darkblue-radial  h-[900px] w-[900px] opacity-50 "></div>
            </div>
            <div className="w-full justify-start text-[24px] font-semibold  ml-5 px-5 text-left">
              Manage{" "}
              {vestingToken !== addressesOnActiveNetwork?.ZeroAddress
                ? "Locker"
                : "Vesting"}
            </div>
            <div className="w-[96vw] mt-10 md:mt-0  md:w-11/12 flex md:border-b md:border-b-gray-700 pb-5">
              <div className="text-[20px] font-semibolc flex flex-col w-8/12 items-center z-10">
                <div className="text-week-white">Contract Address</div>
                <div className="flex items-center gap-2  ">
                  <a
                    className="text-white text-wrap"
                    href={`${addressesOnActiveNetwork?.blackScanUrl}address/${contractAddress}`}
                    target="_blank"
                  >
                    {getMinEthreumAddress(contractAddress)}
                  </a>

                  <FaRegCopy
                    className="cursor-pointer hover:transform hover:scale-110"
                    onClick={() => copyToClipBoard(contractAddress)}
                  />
                </div>
                <div className="text-[14px] text-week-white">
                  {contractBalance < amountTobeVested ? (
                    <>
                      Please deposit more funds to this vesting contract.
                      <br /> Contract balance is less than expected amount{" "}
                      {amountTobeVested} .<br />
                      Please click "Deposit" to add funds.
                    </>
                  ) : (
                    ""
                  )}
                </div>
              </div>
              <div className="text-[20px] font-semibolc flex flex-col w-4/12 items-center">
                <div className="text-week-white">Contract Balance</div>
                <div className="">{contractBalance?.toFixed(2)}</div>
              </div>
            </div>
            {multiSignContractAddress?.toLowerCase() ===
              addressesOnActiveNetwork.ZeroAddress &&
            vestingOwner?.toLowerCase() === address?.toLowerCase() ? (
              <div className="flex justify-center gap-5 mt-2">
                <div className="w-full flex justify-center">
                  <button
                    className={` bg-[#ffffff12] rounded-full px-4 py-3 
                                text-white w-[200px] disabled:opacity-60 z-10
                            `}
                    onClick={() => revokeFunds()}
                    disabled={
                      endTime?.getTime() > new Date()?.getTime() ||
                      contractBalance <= 0
                    }
                  >
                    Revoke
                  </button>
                </div>
                {contractBalance < amountTobeVested && (
                  <div className="w-full flex justify-center">
                    <button
                      className={` bg-[#ffffff12] rounded-full px-4 py-3 
                                        text-white w-[200px] disabled:opacity-60 z-10
                                    `}
                      onClick={() => depositRemainderFunds()}
                    >
                      Deposit
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col md:gap-3 w-10/12 items-center my-2">
                <div className="w-full flex justify-center gap-5 items-center ">
                  {vestingOwner?.toLowerCase() === address?.toLowerCase() && (
                    <div className="flex items-center z-10">
                      <div className="text-[16px] font-semibold  min-w-[60px] text-week-white ">
                        Type:
                      </div>
                      <select
                        className="border-[#343143] border rounded-xl px-5 py-2 bg-transparent outline-none "
                        value={multiSignType}
                        onChange={(e) => setMultiSignType(e.target.value)}
                        disabled={
                          isEmpty(multiSignLastTxObj) == false &&
                          multiSignLastTxObj?.executed !== true
                        }
                      >
                        <option
                          className="bg-[#ffffff12] text-black py-2 border-none"
                          value={TransactionType.Fund}
                        >
                          Deposit
                        </option>
                        <option
                          className="bg-[#ffffff12] text-black py-2 border-none"
                          value={TransactionType.Revoke}
                        >
                          Revoke
                        </option>
                      </select>
                    </div>
                  )}
                  <div className="text-week-white">
                    Minimum confirmation counts:{" "}
                    <span className="text-white">
                      {" "}
                      {multiSignMinNumOfCofirm}
                    </span>
                  </div>
                </div>
                {vestingOwner?.toLowerCase() === address?.toLowerCase() && (
                  <button
                    className={` bg-[#ffffff12] rounded-full px-4 py-3 
                                text-white w-[200px]  mt-3 z-10
                            `}
                    onClick={() => prepareMultiSignTx()}
                    disabled={
                      isEmpty(multiSignLastTxObj) == false &&
                      multiSignLastTxObj?.executed !== true
                    }
                  >
                    Prepare multi sign
                  </button>
                )}
                {multiSignLastTxConfirmStatus &&
                  multiSignLastTxConfirmStatus?.length > 0 &&
                  multiSignLastTxObj?.executed === false && (
                    <div className="w-full max-h-[400px] flex flex-col items-center overflow-h-auto mt-3 z-10">
                      {multiSignLastTxConfirmStatus?.map((item, index) =>
                        item?.signer.toString()?.toLowerCase() !==
                        vestingOwner?.toLowerCase() ? (
                          <div
                            className="flex w-full flex-col items-center md:flex-row justify-between gap-5 py-2"
                            key={index}
                          >
                            <div className="w-9/12 md:hidden">
                              {getMinEthreumAddress(item?.signer)}
                            </div>
                            <div className="w-9/12 hidden md:block ">
                              {item?.signer}
                            </div>

                            <div className="w-3/12 flex justify-center md:justify-start ">
                              {item?.confimration === true ? (
                                <FaCheck className="text-green-900 w-10 h-10" />
                              ) : (
                                <button
                                  className="bg-[#ffffff12] text-white  rounded-full z-10 "
                                  onClick={() => confirmMulisign(item?.signer)}
                                >
                                  Confirm
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <></>
                        )
                      )}
                    </div>
                  )}
                {vestingOwner?.toLowerCase() === address?.toLowerCase() && (
                  <button
                    className={` bg-[#ffffff12] rounded-full px-4 py-3 
                                text-white w-[200px]  mt-3 z-10 `}
                    onClick={() => executeMultiSignTx()}
                    disabled={
                      (isEmpty(multiSignLastTxObj) == false &&
                        multiSignLastTxObj?.executed === true) ||
                      multiSignStarted === false
                    }
                  >
                    Finalize & excute
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      <div className="w-full overflow-none border border-panel-border-gray rounded-[50px] bg-[#19191920] min-h-[350px] flex flex-col gap-5 mt-5 py-10 justify-center relative ">
        <div className="absolute -top-[150px] -right-[800px] flex w-full justify-start ">
          <div className="explore-pink-radial transform -rotate-90  h-[860px] w-[860px] opacity-30 "></div>
        </div>
        <div className="absolute top-0 bottom-0 left-0 right-0 flex justify-start items-center  ">
          <div className="vesting-darkblue-radial  h-[900px] w-[900px] opacity-50 "></div>
        </div>
        <div className="text-[24px] font-semibold  ml-5 text-left">
          Live History
        </div>
        <Reveal
          keyframes={fadeInUp}
          className="onStep"
          delay={0}
          duration={800}
          triggerOnce
        >
          <div
            className="overflow-x-auto  mt-10 md:mt-0 
                                    text-white
                                "
          >
            <Box
              sx={{
                height: 400,
                width: "100%",
                minWidth: 500,
                paddingLeft: "20px",
                paddingRight: "20px"
              }}
            >
              <DataGrid
                rows={tableRows}
                rowCount={totalResultCount}
                columns={columns}
                initialState={{
                  pagination: {
                    paginationModel: {
                      pageSize: 3
                    }
                  }
                }}
                pagination
                paginationMode="server"
                paginationModel={pagenationModel}
                onPaginationModelChange={handlePageChange}
                pageSizeOptions={[PAGE_SIZE]}
                disableRowSelectionOnClick
                components={{
                  ColumnSortedAscendingIcon: () => (
                    <img
                      src={"/history/sortup.png"}
                      className="w-4 h-4"
                      alt="Ascending"
                    />
                  ),
                  ColumnSortedDescendingIcon: () => (
                    <img
                      src={"/history/sortdown.png"}
                      className="w-4 h-4"
                      alt="Descending"
                    />
                  )
                }}
                sortingOrder={["asc", "desc"]}
                sortModel={sortModel}
                onSortModelChange={(changedSortModel) => {
                  setSortModel(changedSortModel);
                }}
                sx={{
                  borderColor: "#FFFFFF08",
                  border: "none",
                  color: "white",
                  backgroundColor: "",
                  ".MuiDataGrid-sortIcon": {
                    opacity: "inherit !important"
                  },
                  "& .MuiDataGrid-cell, .MuiDataGrid-columnHeader": {
                    borderBottom: "1px solid #FFFFFF28",
                    display: "flex",
                    justifyContent: "center"
                  },
                  "& .MuiDataGrid-columnHeaders": {
                    border: "none"
                  },
                  "& .MuiDataGrid-columnHeaderTitleContainer": {
                    display: "flex",
                    justifyContent: "center"
                  },
                  "& .MuiDataGrid-iconButtonContainer": {
                    marginLeft: "2px",
                    visibility: "visible !important",
                    width: "auto !important"
                  },
                  overflowX: "visible"
                }}
              />
            </Box>
          </div>
        </Reveal>
      </div>

      <div className="overflow-none w-full border border-panel-border-gray rounded-[50px] bg-[#19191920] min-h-[400px] flex flex-col gap-5  py-10 justify-center my-5 relative">
        <div className="absolute top-0 bottom-0 left-0 right-0 flex justify-center items-center  ">
          <div className="vesting-darkblue-radial  h-[800px] w-[800px] opacity-50 "></div>
        </div>
        <StakingActivityLines
          className="max-h-[400px]"
          startTime={new Date(new Date().setDate(nowTime.getDate() - 10))}
          endTime={nowTime}
          isVesting={vestingToken === addressesOnActiveNetwork?.ZeroAddress}
          vestingId={vesting_id}
        />
      </div>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={working || isSwitchingLoading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </div>
  );
};

export default Vesting;
