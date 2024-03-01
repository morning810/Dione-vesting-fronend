import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import {
  Accordion,
  AccordionHeader,
  AccordionBody
} from "@material-tailwind/react";
import "react-datepicker/dist/react-datepicker.css";
import { useParams } from "react-router-dom";
import { VscGroupByRefType } from "react-icons/vsc";
import { MdOutlineGeneratingTokens } from "react-icons/md";
import { BiMessageSquareDetail } from "react-icons/bi";
import {
  useAccount,
  useWalletClient,
  useNetwork,
  useSwitchNetwork
} from "wagmi";
import { CircularProgress, Backdrop } from "@mui/material";
import { useNavigate } from "react-router-dom";
import isEmpty from "is-empty";
import { formatEther, formatUnits, parseEther, parseUnits } from "viem";
import { toast } from "react-toastify";
import { waitForTransaction } from "@wagmi/core";
import {
  GolobalMainWeb3,
  getEndOfDay,
  getStartOfDay,
  getTransactionEvents,
  isValidEthereumAddress
} from "../chain_interaction/common";
import {
  activeChainId,
  addressesOnActiveNetwork
} from "../chain_interaction/deployedAddresses";
import VestingFactoryAbi from "../chain_interaction/abi/VestingFactory.json";
import axios from "axios";
import { saveNewVesting } from "../backend_interaction";
import ERC20Abi from "../chain_interaction/abi/ERC20.json";
import Switch from "@mui/material/Switch";
import { LiaSignatureSolid } from "react-icons/lia";
import DateTimePicker from "react-datetime-picker";
import "react-datetime-picker/dist/DateTimePicker.css";
import "react-calendar/dist/Calendar.css";
import "react-clock/dist/Clock.css";

const Create = () => {
  const { isNative } = useParams();
  const [open, setOpen] = useState(0);
  const [alwaysOpen, setAlwaysOpen] = useState(true);
  const [type, setType] = useState(0);
  const [timeUnit, setTimeUnit] = useState("Month");
  const [periodTimeUnit, setPeriodTimeUnit] = useState("Month");
  const [period, setPeriod] = useState("");
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [rate, setRate] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date("12/31/2024"));
  const [multiSingers, setMultiSigners] = useState(false);
  const [signingStatus, setSigningStatus] = useState([]);
  const [fee, setFee] = useState([]);
  const [treasury, setTreasury] = useState([]);
  const [token, setToken] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [receipentsString, setReceipentsString] = useState("");
  const { isLoading: isSwitchingLoading, switchNetwork } = useSwitchNetwork();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { chain } = useNetwork();
  const [working, setWorking] = useState(false);
  const [numConfirmationRequired, setNumConfirmationRequired] = useState(1);

  const handleSignSwitchChange = (event) => {
    setEnableMultiSign(event.target.checked);
    if (event.target.checked === false) setSignCandidatorsString("");
  };
  const [enableMultisign, setEnableMultiSign] = useState(false);
  const [signCandidatorsString, setSignCandidatorsString] = useState("");

  const handleAlwaysOpen = () => setAlwaysOpen((cur) => !cur);
  const handleOpen = (value) => setOpen(open === value ? 0 : value);

  const clearInputs = () => {
    setName("");
    // setAmount("");
    // setPeriod("");
    // setRate("");
    // setReceipentsString("");
    // setToken("");
    // setEnableMultiSign(false);
    // setSignCandidatorsString("");
  };

  const getDurationOnSecondUnit = (value, timeUnit) => {
    switch (timeUnit) {
      case "second":
        return Math.ceil(value);
      case "minute":
        return Math.ceil(Number(value) * 60);
      case "hour":
        return Math.ceil(Number(value) * 60 * 60);
      case "day":
        return Math.ceil(Number(value) * 60 * 60 * 24);
      case "month":
        return Math.ceil(Number(value) * 60 * 60 * 24 * 30.5);
      case "year":
        return Math.ceil(Number(value) * 60 * 60 * 24 * 365);
      default:
        return value;
    }
  };

  const checkAndGetReceipentsList = () => {};

  function extractEthereumAddresses(inputString) {
    // Ethereum addresses typically start with 0x followed by 40 hexadecimal characters
    const ethAddressPattern = /0x[a-fA-F0-9]{40}/g;

    // Search for and return all instances that match the Ethereum address pattern
    return inputString.match(ethAddressPattern) || [];
  }

  const handleCreateContract = async () => {
    if (!isConnected) {
      toast.warn("Please connect your wallet and try again.");
      return;
    }
    if (chain?.id != activeChainId) {
      toast.warn("Please change your network of wallet into  and try again.");
      switchNetwork(activeChainId);
      return;
    }
    const filteredReceipentWallets = extractEthereumAddresses(receipentsString);

    if (filteredReceipentWallets?.length === 0) {
      toast.warn("Please input receipents wallets.");
      return;
    }
    let signCandidators = [];
    if (enableMultisign) {
      signCandidators = extractEthereumAddresses(signCandidatorsString);
      if (signCandidators?.length === 0) {
        toast.warn("Please input signers' valid wallets.");
        return;
      }
      if (isEmpty(numConfirmationRequired) || numConfirmationRequired <= 0) {
        toast.warn("Please input valid number of confirmation .");
        return;
      }
      const found = signCandidators?.find(
        (item) => item.toString().toLowerCase() === address?.toLowerCase()
      );
      if (isEmpty(found)) signCandidators = [...signCandidators, address];
    }
    if (isNative == 1) {
      if (Number(parseEther(amount)?.toString()) < 0.1) {
        toast.warn(`Amount should be equal or larger than 0.1 DIONE`);
        return;
      }
    } else {
      if (
        Number(parseUnits(amount?.toString(), tokenDecimals)?.toString()) < 0.1
      ) {
        toast.warn(`Amount should be qual or larger than 0.1 DIONE`);
        return;
      }
    }
    try {
      setWorking(true);
      const dayStartTimeOfstartDate = getStartOfDay(startDate);
      const dayEndTimeOfendDate = getEndOfDay(endDate);
      let transactionArguments = [
        name,
        isNative == 1 ? addressesOnActiveNetwork.ZeroAddress : token,
        isNative == 1
          ? parseEther(amount)?.toString()
          : parseUnits(amount?.toString(), tokenDecimals)?.toString(),
        Math.ceil(new Date(dayStartTimeOfstartDate)?.getTime() / 1000),
        Math.ceil(new Date(dayEndTimeOfendDate)?.getTime() / 1000),
        Math.ceil((Number(rate) % 100) * 100),
        getDurationOnSecondUnit(period, periodTimeUnit),
        true,
        filteredReceipentWallets
      ];
      if (enableMultisign == true) {
        transactionArguments = [
          ...transactionArguments,
          signCandidators,
          Number(numConfirmationRequired)
        ];
      }

      const createHash = await walletClient.writeContract({
        address: addressesOnActiveNetwork.VestingFactory,
        abi: VestingFactoryAbi,
        functionName:
          enableMultisign !== true ? "create" : "createWithMultisigWallet",
        args: transactionArguments
      });

      const receipt = await waitForTransaction({ hash: createHash });

      const logs = await getTransactionEvents(
        GolobalMainWeb3,
        VestingFactoryAbi,
        receipt.logs
      );

      if (logs && logs?.length > 0) {
        const newVestingLog = logs[0];
        let multiSignAddress = addressesOnActiveNetwork.ZeroAddress;
        if (enableMultisign === true) {
          const multisignCreateLog = logs[1];
          multiSignAddress = multisignCreateLog._multiSigWallet;
        }
        const owner = newVestingLog._owner;

        if (owner?.toString().toLowerCase() === address?.toLowerCase()) {
          toast.success("You've created a new vesting successfully.");
          saveNewVesting({
            vestingId: parseInt(newVestingLog?.vestingId?.toString()),
            name: newVestingLog?._name,
            owner: newVestingLog?._owner,
            target: newVestingLog?.target,
            token: parseInt(newVestingLog?._token?.toString()),
            decimals: tokenDecimals,
            tokenSymbol: isNative == 1 ? "native" : tokenSymbol,
            amount:
              isNative == 1
                ? parseEther(amount)?.toString()
                : parseUnits(amount?.toString(), tokenDecimals)?.toString(),
            start: parseInt(newVestingLog?._start?.toString()),
            end: parseInt(newVestingLog?._end?.toString()),
            rate: parseInt(newVestingLog?._rate?.toString()),
            period: parseInt(newVestingLog?._period?.toString()),
            receipents: newVestingLog?._recipients,
            revokable: newVestingLog?._revokable,
            fee: parseInt(newVestingLog?._fee?.toString()),
            treasury: newVestingLog?._treasury,
            doMultiSign: enableMultisign,
            multiSignAddress: multiSignAddress
          });
          clearInputs();
        } else {
          toast.error("Failed!");
        }
      } else {
        toast.error("Failed!");
      }
      setWorking(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed!");
      setWorking(false);
    }
  };

  const readTokenInformation = async (tokenAddress, address) => {
    try {
      const tokenContract = new GolobalMainWeb3.eth.Contract(
        ERC20Abi,
        tokenAddress
      );
      let readingPromises = [];
      readingPromises.push(tokenContract.methods.decimals().call());
      readingPromises.push(tokenContract.methods.symbol().call());
      if (address) {
        readingPromises.push(tokenContract.methods.balanceOf(address).call());
      }
      Promise.all(readingPromises)
        .then((results) => {
          if (address) {
            const userBalance = results[2];
            setTokenBalance(
              parseFloat(
                formatUnits(
                  userBalance?.toString(),
                  parseInt(results[0]?.toString())
                )
              )
            );
          }
          setTokenDecimals(parseInt(results[0]?.toString()));
          setTokenSymbol(results[1]);
        })
        .catch((error) => {});
    } catch (err) {}
  };

  useEffect(() => {
    if (token) {
      if (isValidEthereumAddress(token)) {
        //read token balance of wallet and decimals
        readTokenInformation(token, address);
      }
    }
  }, [token, address]);

  return (
    <div className="text-white mb-10 w-full md:w-auto flex flex-col items-center bg-[#19191920] border-[#343143] border-[1px] rounded-[50px] mt-28 md:mt-0">
      <div className="absolute -top-[250px] -right-[400px] flex w-full justify-start ">
        <div className="explore-pink-radial transform rotate-90  h-[860px] w-[860px] opacity-50 "></div>
      </div>
      <div className="absolute top-0 bottom-0 left-0 right-0 flex justify-start items-center z-0 ">
        <div className="vesting-darkblue-radial  h-[600px] w-[600px] opacity-50 "></div>
      </div>

      <div className="text-[26px] md:text-[24px] lg:text-[28px] font-semibold py-8">
        Create a new {isNative == 1 ? "vesting" : "locker"}
      </div>
      <div className="w-[96vw] md:w-auto px-2 md:px-10 py-10  min-h-[450px] flex flex-col gap-5 items-center ">
        {isNative == 0 && (
          <>
            <Accordion open={open === 0}>
              <AccordionHeader
                className="text-white hover:text-white border-none outline-none"
                onClick={() => handleOpen(0)}
              >
                <div className="flex justify-start gap-2 items-center">
                  <VscGroupByRefType className="w-[32px] h-[32px]" />
                  Select Type
                </div>
              </AccordionHeader>
              <AccordionBody className="text-white">
                <div className="w-full flex justify-between px-5">
                  <div className="flex items-center ">
                    <div className="text-[16px] font-semibold  min-w-[120px] ">
                      Type:
                    </div>
                    <select
                      className="border-[#343143] border rounded-xl px-5 py-2 bg-[#ffffff12] outline-none "
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      <option
                        className="bg-[#12101c] text-white py-4 border-none"
                        value={0}
                      >
                        Token locker
                      </option>
                      <option
                        className="bg-[#12101c] text-white py-4 border-none"
                        value={1}
                      >
                        Liquidity Locks
                      </option>
                    </select>
                  </div>
                </div>
              </AccordionBody>
            </Accordion>
            <Accordion open={open === 1}>
              <AccordionHeader
                className="text-white hover:text-white border-none outline-none"
                onClick={() => handleOpen(1)}
              >
                <div className="flex justify-start gap-2 items-center">
                  <MdOutlineGeneratingTokens className="w-[32px] h-[32px]" />
                  Enter {type == 0 ? "Token " : "LP Token "} Address
                </div>
              </AccordionHeader>
              <AccordionBody className="text-white w-full flex justify-center flex-col ">
                <div className="flex items-center w-full px-2 md:px-16 ">
                  <div className="text-[16px] font-semibold min-w-[80px] flex justify-start ">
                    {type == 0 ? "Token:" : "LP Token:"}
                  </div>
                  <input
                    className="border-[#343143] border rounded-xl px-5 py-2 bg-[#ffffff12]  outline-none min-w-[calc(100%-120px)] "
                    placeholder=""
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                </div>
                <div className="flex items-center w-full mt-5 px-2 md:px-16 ">
                  <div className="text-[16px] font-semibold min-w-[80px] flex justify-start ">
                    Symbol:{" "}
                  </div>
                  <div className="text-white px-5 py-2 bg-transparent outline-none min-w-[calc(100%-120px)] text-left ">
                    {tokenSymbol}
                  </div>
                </div>
                <div className="flex items-center w-full mt-5 px-2 md:px-16 ">
                  <div className="text-[16px] font-semibold min-w-[80px] flex justify-start ">
                    Balance:{" "}
                  </div>
                  <div className="px-5 py-2 bg-transparent outline-none min-w-[calc(100%-120px)] text-left ">
                    {Number(tokenBalance).toFixed(4)}
                  </div>
                </div>
                <div className="flex items-center w-full mt-5 px-2 md:px-16 ">
                  <div className="text-[16px] font-semibold min-w-[80px] flex justify-start ">
                    Decimals:{" "}
                  </div>
                  <div className="px-5 py-2 bg-transparent outline-none min-w-[calc(100%-120px)] text-left">
                    {tokenDecimals}
                  </div>
                </div>
              </AccordionBody>
            </Accordion>
          </>
        )}
        <Accordion open={isNative == 1 ? alwaysOpen : open == 2}>
          <AccordionHeader
            className="text-white hover:text-white border-none outline-none"
            onClick={() => {
              isNative == 0 && setOpen(2);
            }}
          >
            <div className="flex justify-start gap-2 items-center">
              <BiMessageSquareDetail className="w-[32px] h-[32px]" />
              Add Details
            </div>
          </AccordionHeader>
          <AccordionBody className="flex flex-col gap-4 text-white w-full px-2 md:px-10">
            <div className="text-[16px] font-semibold min-w-[120px] text-left ">
              Name:
            </div>
            <input
              className="border-[#343143] border rounded-xl px-5 py-2 bg-[#ffffff12] outline-none min-w-[calc(100%-120px)] "
              placeholder={`${isNative == 1 ? "Vesting " : "Locker "}Name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="text-[16px] font-semibold min-w-[120px]  text-left ">
              Amount:
            </div>
            <input
              className="border-[#343143] border rounded-xl px-5 py-2 bg-[#ffffff12] outline-none min-w-[calc(100%-120px)] "
              placeholder={`Number of ${
                isNative == 1
                  ? "DIONE to vest"
                  : type == 0
                  ? "token to lock"
                  : "LP token to lock"
              }`}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <div className="text-[16px] font-semibold min-w-[120px]  text-left ">
              Vesting period:
            </div>

            <div className="flex items-center w-full  ">
              <input
                className="border-[#343143] border rounded-xl px-5 py-2 bg-[#ffffff12] outline-none min-w-[calc(100%-165px)] "
                placeholder={`${
                  isNative == 1 ? "Total time to vest" : "Total time to lock"
                }`}
                type="number"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
              <select
                className="custom-select border-[#343143] border rounded-xl px-5 py-2 bg-[#ffffff12] outline-none w-auto md:min-w-[160px] ml-[5px] h-[40px]"
                value={periodTimeUnit}
                onChange={(e) => setPeriodTimeUnit(e.target.value)}
              >
                <option
                  className="bg-[#12101c] text-white py-2 border-none"
                  value={"second"}
                >
                  Second
                </option>
                <option
                  className="bg-[#12101c] text-white py-2 border-none"
                  value={"minute"}
                >
                  Minute
                </option>
                <option
                  className="bg-[#12101c] text-white py-2 border-none"
                  value={"hour"}
                >
                  Hour
                </option>
                <option
                  className="bg-[#12101c] text-white py-2 border-none"
                  value={"day"}
                >
                  Day
                </option>
                <option
                  className="bg-[#12101c] text-white py-2 border-none"
                  value={"month"}
                >
                  Month
                </option>
              </select>
            </div>

            <div className="text-[16px] font-semibold min-w-[120px]  text-left ">
              Vesting rate:
            </div>

            <div className="flex items-center w-full  ">
              <input
                className="border-[#343143] border rounded-xl px-5 py-2 bg-[#ffffff12] outline-none w-full  "
                placeholder={`Percentage of ${
                  isNative == 1 ? "DIONE " : type == 0 ? "token " : "LP token "
                }can withdraw in each epoch`}
                typed="number"
                min={0}
                max={100}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
              <div className="ml-[3px] md:ml-[12px]">%</div>
            </div>

            <div className="text-[16px] font-semibold min-w-[120px]  text-left ">
              Recipients:
            </div>
            <textarea
              className="border-[#343143] border rounded-xl px-5 py-2 bg-[#ffffff12] outline-none min-w-[calc(100%-120px)] min-h-[100px]"
              placeholder="0x5dF66A3bD72dFC6c58321a52965edcE16bfCbbB1,0xDbfd0fdcfeC90B826Bd92142BbB44773584513A5"
              value={receipentsString}
              onChange={(e) => setReceipentsString(e.target.value)}
            />

            <div className="flex items-center w-full md:gap-4  justify-between">
              <div className="flex  flex-row md:flex-col md:gap-3">
                <div className="text-[16px] font-semibold  min-w-[120px] flex justify-start ">
                  Start Date:
                </div>
                <DatePicker
                  className=" border-[#343143] border rounded-xl px-5 py-2 bg-[#ffffff12] max-w-[220px] outline-none "
                  selected={startDate}
                  onChange={(date) => {
                    setStartDate(date);
                    var endDate = new Date(date); // Clone the original date
                    endDate.setHours(23, 59, 59, 999);
                    setEndDate(endDate);
                  }}
                />
                {/* 
                            <DateTimePicker className=" border-[#343143] border rounded-xl px-5 py-2 bg-[#ffffff12] max-w-[220px] outline-none " selected={startDate} onChange={(date) => {

                                setStartDate(date);
                                var endDate = new Date(date); // Clone the original date
                                endDate.setHours(23, 59, 59, 999);
                                setEndDate(endDate);
                            }} /> */}
              </div>
              <div className="hidden md:flex flex-col md:gap-3">
                <div className="text-[16px] font-semibold min-w-[120px] flex justify-start  ">
                  End Date:
                </div>
                <DatePicker
                  className=" border-[#343143] border rounded-xl px-5 py-2 bg-[#ffffff12] max-w-[220px] outline-none "
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                />

                {/* <DateTimePicker className=" border-[#343143] border rounded-xl px-5 py-2 bg-[#ffffff12] max-w-[220px] outline-none " selected={endDate} onChange={(date) => {

                                setEndDate(date);
                            }} /> */}
              </div>
            </div>

            <div className="flex md:hidden items-center  ">
              <div className="text-[16px] font-semibold  min-w-[120px]  text-left ">
                End Date:
              </div>
              <DatePicker
                className=" border-[#343143] border rounded-xl px-5 py-2 bg-[#ffffff12] max-w-[220px] outline-none "
                selected={endDate}
                onChange={(date) => setEndDate(date)}
              />
              {/* 
                        <DateTimePicker className=" border-[#343143] border rounded-xl px-5 py-2 bg-[#ffffff12] max-w-[220px] outline-none " selected={endDate} onChange={(date) => {

                            setEndDate(date);
                        }} /> */}
            </div>
          </AccordionBody>
        </Accordion>
        <Accordion open={open === 3}>
          <AccordionHeader
            className="text-white hover:text-white border-none outline-none"
            onClick={() => handleOpen(3)}
          >
            <div className="flex justify-start gap-2 items-center">
              <LiaSignatureSolid className="w-[32px] h-[32px]" />
              Set multi sig
            </div>
          </AccordionHeader>
          <AccordionBody className="text-white">
            <div className="flex items-center w-full px-2 md:px-10 text-[16px] font-semibold">
              Do you need to apply multiple wallet signatures to activate a
              deposit or withdrawal?
            </div>
            <div className="flex justify-start w-full mt-5 px-10 text-[16px] font-semibold items-center ">
              <div className="">No</div>
              <Switch
                checked={enableMultisign}
                onChange={handleSignSwitchChange}
                inputProps={{ "aria-label": "controlled" }}
              />
              <div className="">Yes</div>
            </div>
            <div className="text-[16px] font-semibold min-w-[70px] py-5 pl-10 text-left">
              Signers:
            </div>
            <textarea
              className="border-[#343143] border rounded-xl px-5 py-2 bg-[#ffffff12] outline-none min-w-[calc(100%-70px)] min-h-[100px]"
              placeholder="0x5dF66A3bD72dFC6c58321a52965edcE16bfCbbB1,0xDbfd0fdcfeC90B826Bd92142BbB44773584513A5"
              value={signCandidatorsString}
              disabled={!enableMultisign}
              onChange={(e) => setSignCandidatorsString(e.target.value)}
            />
            <div className="flex justify-center md:justify-start w-full mt-5 px-2 md:px-10 text-[16px] font-semibold items-center gap-2 ">
              <div className="max-w-[200px] md:min-w-[300px] text-wrap">
                Number of confirmations required:{" "}
              </div>
              <input
                className="border-[#343143] border rounded-xl py-2 bg-[#ffffff12] outline-none px-3 w-[50px] md:w-[80px]"
                value={numConfirmationRequired}
                disabled={!enableMultisign}
                onChange={(e) => setNumConfirmationRequired(e.target.value)}
                type="number"
              />
            </div>
          </AccordionBody>
        </Accordion>

        <div className="w-full flex justify-center md:pr-8 z-10">
          <button
            className="bg-[#bf9aff] rounded-full px-4 py-3  
                                text-white text-[16px] font-semibold
                              font-medium min-w-[166px] justify-center
                                bg-gradient-to-b from-pink-button-top-color to-pink-button-bottom-color  rounded-full shadow-[-10px_-10px_30px_10px_rgba(255,64,154,0.1),_10px_10px_30px_10px_rgba(196,56,239,0.15)] 
                            "
            onClick={() => handleCreateContract()}
          >
            Create Contract
          </button>
        </div>
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

export default Create;
