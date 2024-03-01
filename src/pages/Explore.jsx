import { useEffect } from "react";
import {
  Tabs,
  TabsHeader,
  TabsBody,
  Tab,
  TabPanel,
  Card,
  Typography
} from "@material-tailwind/react";
import { useState } from "react";
import { useAccount } from "wagmi";
import { IoSearchOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import { DataGrid } from "@mui/x-data-grid";
import { addressesOnActiveNetwork } from "../chain_interaction/deployedAddresses";
import {
  VestingFactoryContract,
  isValidEthereumAddress
} from "../chain_interaction/common";
import { formatUnits, parseUnits } from "viem";
import { IoIosLogOut } from "react-icons/io";
import { useDebounce } from "use-debounce";
import { getVestingByWalletAndToken } from "../backend_interaction";
import { Select, Option } from "@material-tailwind/react";

const data = [
  {
    label: "Native",
    value: "coin",
    desc: `It really matters and then like it really doesn't matter.
      What matters is the people who are sparked by it. And the people 
      who are like offended by it, it doesn't matter.`
  },
  {
    label: "Tokens",
    value: "tokens",
    desc: `Because it's about motivating the doers. Because I'm here
      to follow my dreams and inspire other people to follow their dreams, too.`
  }
];

const PAGE_SIZE = 10;
const FILTERS = {
  ALL: 0,
  ACTIVE: 1,
  CLOSED: 2,
  NOT_STARTED: 3,
  MINE: 4
};

const Explorer = () => {
  const [activeTab, setActiveTab] = useState("coin");
  const navigate = useNavigate();
  const [sortModel, setSortModel] = useState([
    {
      field: "stake",
      sort: "desc"
    }
  ]);
  const [tableRows, setTableRows] = useState([]);
  const [filterFlag, setFilterFlag] = useState(0);
  const [totalResultCount, setTotalResultCount] = useState(0);
  const [pagenationModel, setPagenationModel] = useState({
    page: 0,
    pageSize: PAGE_SIZE
  });
  const [searchingAddress, setSearchingAddress] = useState("");
  const [debouncedSearchingToken] = useDebounce(searchingAddress, 1000);
  const [isReading, setIsReading] = useState(false);
  const { address, isConnected } = useAccount();
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const columns = [
    {
      field: "target",
      headerName: "Contract",
      editable: false,
      sortable: false,
      minWidth: 100,
      flex: 1,
      renderCell: (params) => {
        return (
          <div className="w-full pl-5 ">
            <a
              className="text-white"
              href={`${
                addressesOnActiveNetwork.blackScanUrl
              }address/${params?.value?.toString()}`}
              target="_blank"
            >
              {params.value?.toString()}
            </a>
          </div>
        );
      }
    },
    {
      field: "name",
      headerName: "Name",
      editable: false,
      sortable: false,
      flex: 1,
      minWidth: 130,
      renderCell: (params) => {
        return (
          <div className="flex gap-2">
            <div className="">{params?.value}</div>
          </div>
        );
      }
    },
    {
      field: "amount",
      headerName: "Vested Amount",
      editable: false,
      minWidth: 80,
      flex: 1,
      renderCell: (params) => {
        return (
          <div className="flex gap-2">
            <div className="">
              {Number(
                formatUnits(params?.value.toString(), params?.row?.decimals)
              )?.toFixed(2)}
            </div>
          </div>
        );
      }
    },
    {
      field: "start",
      headerName: "Start Date",
      sortable: false,
      flex: 1,
      minWidth: 110,
      renderCell: (params) => {
        return (
          <div className="flex gap-2">
            <div className="">
              {new Date(
                parseInt(params?.value.toString()) * 1000
              )?.toLocaleDateString()}
            </div>
          </div>
        );
      }
    },
    {
      field: "end",
      headerName: "End Date",
      sortable: false,
      flex: 1,
      minWidth: 130,
      renderCell: (params) => {
        return (
          <div className="flex gap-2">
            <div className="">
              {new Date(
                parseInt(params?.value.toString()) * 1000
              )?.toLocaleDateString()}
            </div>
          </div>
        );
      }
    },
    {
      field: "id",
      headerName: "Detail",
      sortable: false,
      flex: 1,
      minWidth: 60,
      renderCell: (params) => {
        return (
          <div className="flex gap-2 ">
            <IoIosLogOut
              className="cursor-pointer "
              onClick={() =>
                navigate(`/vesting/${parseInt(params.row.vestingId)}`)
              }
            ></IoIosLogOut>
          </div>
        );
      }
    }
  ];

  useEffect(() => {
    console.log("========== 1:");
    localStorage.setItem("explorPrams", null);
  }, []);

  useEffect(() => {
    console.log("========== 2:".activeTab);
    readVestings(0, PAGE_SIZE, 0, activeTab);
    localStorage.setItem("previousConnected", false);
  }, [activeTab]);

  useEffect(() => {
    console.log("========== 3:", isConnected, debouncedSearchingToken);

    let previousConnected = localStorage.getItem("previousConnected");
    if (previousConnected == "false" && isConnected == true) {
      localStorage.setItem("previousConnected", true);
      setFilterFlag(FILTERS.MINE);
    } else if (isConnected == false && previousConnected == "true") {
      localStorage.setItem("previousConnected", false);
      setFilterFlag(FILTERS.ALL);
    }
    if (
      filterFlag == FILTERS.MINE ||
      isValidEthereumAddress(debouncedSearchingToken)
    ) {
      readVestingsFromDB(
        pagenationModel["page"],
        PAGE_SIZE,
        filterFlag,
        filterFlag == FILTERS.MINE && isConnected ? address : null,
        isValidEthereumAddress(debouncedSearchingToken)
          ? debouncedSearchingToken
          : addressesOnActiveNetwork?.ZeroAddress
      );
    } else
      readVestings(pagenationModel["page"], PAGE_SIZE, filterFlag, activeTab);
  }, [pagenationModel, filterFlag, isConnected, debouncedSearchingToken]);

  const readVestingsFromDB = async (
    pageIndex,
    pageSize,
    filterFlag,
    searchingWallet,
    searchingToken
  ) => {
    try {
      setTableRows([]);
      setTotalResultCount(0);
      setIsReading(true);
      const vestings = await getVestingByWalletAndToken(
        pageIndex,
        pageSize,
        filterFlag,
        searchingWallet,
        searchingToken
      );
      console.log("vestings from db >>> ", vestings);
      const filteredResults =
        vestings?.data?.length > 0
          ? vestings?.data?.map((result, index) => {
              return {
                id: pageSize * pageIndex + index,
                amount: result["amount"],
                end: result["end"],
                fee: result["fee"],
                owner: result["owner"],
                period: result["period"],
                rate: result["rate"],
                revokable: result["revokable"],
                start: result["start"],
                target: result["target"],
                timestamp: result["timestamp"],
                token: result["token"],
                treasury: result["treasury"],
                decimals: result["decimals"],
                vestingId: result["vestingId"],
                name: result["name"]
              };
            })
          : [];
      setTotalResultCount(vestings?.totalCount);
      setTableRows(filteredResults);

      setIsReading(false);
    } catch (err) {
      console.error(err);
      setIsReading(false);
    }
  };

  const readVestings = async (newPage, pageSize, filterFlag, activeTab) => {
    try {
      if (isValidEthereumAddress(searchingAddress)) return;
      if (isReading) return;
      let newParams = JSON.stringify({
        newPage,
        pageSize,
        filterFlag,
        activeTab
      });
      let oldParams = localStorage.getItem("explorPrams");
      if (newParams === oldParams) return;
      else {
        localStorage.setItem("explorPrams", newParams);
      }
      setIsReading(true);
      let vestReadingPromise;

      if (activeTab === "coin") {
        vestReadingPromise = VestingFactoryContract.methods
          .readVestings(Number(newPage) + Number(1), pageSize, filterFlag, true)
          .call();
      } else {
        vestReadingPromise = VestingFactoryContract.methods
          .readVestings(
            Number(newPage) + Number(1),
            pageSize,
            filterFlag,
            false
          )
          .call();
      }

      setTableRows([]);
      setTotalResultCount(0);

      Promise.all([vestReadingPromise])
        .then((results) => {
          const filteredResults = results[0][0].map((result, index) => {
            return {
              id: pageSize * newPage + index,
              amount: parseFloat(result["amount"]),
              end: parseInt(result["end"]),
              fee: parseInt(result["fee"]),
              owner: result["owner"],
              period: parseInt(result["period"]),
              rate: parseInt(result["rate"]),
              revokable: result["revokable"],
              start: parseInt(result["start"]),
              target: result["target"],
              timestamp: parseInt(result["timestamp"]),
              token: result["token"],
              treasury: result["treasury"],
              decimals: parseInt(result["decimals"]),
              vestingId: parseInt(result["vestingId"]),
              name: result["name"]
            };
          });
          let vestingsCounts = parseInt(results[0][1]);

          setTotalResultCount(vestingsCounts);

          setTableRows(filteredResults);

          setIsReading(false);
        })
        .catch((err) => {
          console.error(err);

          setIsReading(false);
        });
    } catch (err) {
      console.error(err);
      setIsReading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagenationModel(newPage);
  };

  return (
    <>
      {" "}
      <div className="text-white pb-10 flex gap-2 pb-5 pt-28 md:pt-0 ">
        <div
          className=" w-[100vw] md:w-[250px] hidden md:flex flex-col  border border-panel-border-gray rounded-[50px] 
            bg-gradient-to-b from-explore-sidebar-top-color to-explore-sidebar-bottom-color  relative overflow-x-hidden
        "
        >
          <div className="w-full justify-center flex py-12">
            <img
              src="/explore/sidebar_logo.svg"
              className="w-[90px] h-[90px] "
            />
          </div>

          <div className="absolute top-0 right-0 flex w-full justify-end z-0 ">
            <div className="sidebar-graphic-radial transform rotate-180 h-[800px] w-[400px] opacity-70"></div>
          </div>
          <div
            className=" 
                h-auto md:min-h-[calc(450px-40px)] py-5 flex flex-col gap-10
            "
          >
            {isConnected && (
              <div className="w-[250px] flex justify-center relative">
                <div
                  className={`mt-2 py-3  ${
                    filterFlag === FILTERS.MINE &&
                    "block whitespot-graphic-radial w-[18px] h-[28px] "
                  } `}
                ></div>
                <div className={` w-full flex justify-center mr-[9px] `}>
                  <div
                    className={`max-w-[180px] bg-transparent py-2 px-10 text-[#B3B3B3] text-center cursor-pointer ${
                      filterFlag === FILTERS.MINE &&
                      "text-[#fff] bg-gradient-to-b from-pink-button-top-color to-pink-button-bottom-color  rounded-full shadow-[-10px_-10px_30px_10px_rgba(255,64,154,0.1),_10px_10px_30px_10px_rgba(196,56,239,0.15)]  "
                    }`}
                    onClick={() => setFilterFlag(FILTERS.MINE)}
                  >
                    {activeTab == "coin" ? "My Vestings" : "My Lockers"}
                  </div>
                </div>
              </div>
            )}
            <div className="w-[250px] flex justify-center relative">
              <div
                className={`mt-2 py-3  ${
                  filterFlag === FILTERS.ALL &&
                  "block whitespot-graphic-radial w-[18px] h-[28px] "
                } `}
              ></div>
              <div className="w-full flex justify-center mr-[9px]">
                <div
                  className={`max-w-[120px] bg-transparent py-2 px-10 text-[#B3B3B3] text-center cursor-pointer ${
                    filterFlag === FILTERS.ALL &&
                    "text-[#fff] bg-gradient-to-b from-pink-button-top-color to-pink-button-bottom-color  rounded-full shadow-[-10px_-10px_30px_10px_rgba(255,64,154,0.1),_10px_10px_30px_10px_rgba(196,56,239,0.15)]  "
                  }`}
                  onClick={() => setFilterFlag(FILTERS.ALL)}
                >
                  All
                </div>
              </div>
            </div>
            <div className="w-[250px] flex justify-center relative">
              <div
                className={`mt-2 py-3  ${
                  filterFlag === FILTERS.ACTIVE &&
                  "block whitespot-graphic-radial w-[18px] h-[28px] "
                } `}
              ></div>
              <div className="w-full flex justify-center mr-[9px]">
                <div
                  className={`max-w-[120px] bg-transparent py-2 px-10 text-[#B3B3B3] text-center cursor-pointer ${
                    filterFlag === FILTERS.ACTIVE &&
                    "text-[#fff] bg-gradient-to-b from-pink-button-top-color to-pink-button-bottom-color  rounded-full shadow-[-10px_-10px_30px_10px_rgba(255,64,154,0.1),_10px_10px_30px_10px_rgba(196,56,239,0.15)]  "
                  }`}
                  onClick={() => setFilterFlag(FILTERS.ACTIVE)}
                >
                  Active
                </div>
              </div>
            </div>
            <div className="w-[250px] flex justify-center relative">
              <div
                className={`mt-2 py-3  ${
                  filterFlag === FILTERS.CLOSED &&
                  "block whitespot-graphic-radial w-[18px] h-[28px] "
                } `}
              ></div>
              <div className="w-full flex justify-center mr-[9px]">
                <div
                  className={`max-w-[120px] bg-transparent py-2 px-10 text-[#B3B3B3] text-center cursor-pointer ${
                    filterFlag === FILTERS.CLOSED &&
                    "text-[#fff] bg-gradient-to-b from-pink-button-top-color to-pink-button-bottom-color  rounded-full shadow-[-10px_-10px_30px_10px_rgba(255,64,154,0.1),_10px_10px_30px_10px_rgba(196,56,239,0.15)]  "
                  }`}
                  onClick={() => setFilterFlag(FILTERS.CLOSED)}
                >
                  Closed
                </div>
              </div>
            </div>
            <div className="w-[250px] flex justify-center relative">
              <div
                className={`mt-2 py-3  ${
                  filterFlag === FILTERS.NOT_STARTED &&
                  "block whitespot-graphic-radial w-[18px] h-[28px] "
                } `}
              ></div>
              <div className={` w-full flex justify-center mr-[9px] `}>
                <div
                  className={`max-w-[180px] bg-transparent py-2 px-10 text-[#B3B3B3] text-center cursor-pointer ${
                    filterFlag === FILTERS.NOT_STARTED &&
                    "text-[#fff] bg-gradient-to-b from-pink-button-top-color to-pink-button-bottom-color  rounded-full shadow-[-10px_-10px_30px_10px_rgba(255,64,154,0.1),_10px_10px_30px_10px_rgba(196,56,239,0.15)]  "
                  }`}
                  onClick={() => setFilterFlag(FILTERS.NOT_STARTED)}
                >
                  Not started
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          className="pt-5 w-full md:w-[calc(100%-250px)] flex flex-col gap-5 h-full min-h-[86vh] flex flex-col  border border-panel-border-gray rounded-2xl bg-transparent opacity-16 
            rounded-[50px] relative overflow-x-hidden overflow-y-hidden
        "
        >
          <div className="absolute -top-[25vw] -left-[15vw] md:-top-[300px] md:-left-[300px] flex w-full justify-start ">
            <div className="explore-pink-radial transform -rotate-90 w-[100vw] h-[100vw] md:h-[1400px] md:w-[1400px] opacity-50 "></div>
          </div>
          <div className="absolute -bottom-[25vw] -right-[15vw] md:-bottom-[300px] md:-right-[300px]  flex w-full justify-end ">
            <div className="explore-darkblue-radial transform -rotate-90 w-[100vw] h-[100vw] md:h-[1400px] md:w-[1400px] opacity-50 "></div>
          </div>
          <div className="text-[26px] md:text-[26px] lg:text-[28px] font-semibold py-8">
            List of all lockers for Odyssey Chain and the tokens
          </div>
          <div className="w-full flex flex-col items-center md:flex-row justify-between px-10  relative  gap-4">
            {
              <div className=" h-[36px] hidden md:flex items-center relative ">
                <IoSearchOutline className="absolute z-4  left-4  text-white cursor-pointer " />
                <input
                  className="text-white bg-[#ffffff12] h-[36px] rounded-full 
                                 text-[13px] font-medium pl-10 w-[80vw] md:w-auto
                            "
                  placeholder={`Search by ${
                    activeTab == "tokens"
                      ? "token address..."
                      : "contract address..."
                  } `}
                  size="20"
                  onChange={(e) => setSearchingAddress(e.target.value)}
                />
              </div>
            }
            <div className="flex justify-center min-w-[170px] md:-ml-[60px] h-[48px] py-[5px] bg-[#ffffff12] rounded-full ">
              <div
                className={`max-w-[80px] bg-transparent py-2 px-5 text-[#B3B3B3] text-[13px] font-medium text-center cursor-pointer flex items-center 
                        ${
                          activeTab === "coin" &&
                          "text-[#fff] bg-gradient-to-b from-pink-button-top-color to-pink-button-bottom-color  rounded-full shadow-[-10px_-10px_30px_10px_rgba(255,64,154,0.1),_10px_10px_30px_10px_rgba(196,56,239,0.15)]  "
                        }`}
                onClick={() => {
                  if (isReading === false) {
                    setActiveTab("coin");
                    setPagenationModel({ page: 0, pageSize: PAGE_SIZE });
                  }
                }}
              >
                Native
              </div>
              <div
                className={`max-w-[80px] bg-transparent py-2 px-5 text-[#B3B3B3] text-[13px] font-medium text-center cursor-pointer  flex items-center 
                        ${
                          activeTab === "tokens" &&
                          "text-[#fff] bg-gradient-to-b from-pink-button-top-color to-pink-button-bottom-color  rounded-full shadow-[-10px_-10px_30px_10px_rgba(255,64,154,0.1),_10px_10px_30px_10px_rgba(196,56,239,0.15)]  "
                        }`}
                onClick={() => {
                  if (isReading === false) {
                    setActiveTab("tokens");
                    setPagenationModel({ page: 0, pageSize: PAGE_SIZE });
                  }
                }}
              >
                Tokens
              </div>
            </div>
            <button
              className=" bg-[#ffffff12] rounded-full px-4 h-[36px]   flex items-center 
                                text-white  text-[13px] font-medium min-w-[166px] justify-center
                            "
              onClick={() =>
                activeTab === "tokens"
                  ? navigate("/create/0")
                  : navigate("/create/1")
              }
            >
              Create New +
            </button>

            <div className=" h-[36px] flex md:hidden items-center relative ">
              <IoSearchOutline className="absolute z-4  left-4  text-white cursor-pointer " />
              <input
                className="text-white bg-[#ffffff12] h-[36px] rounded-full 
             text-[13px] font-medium pl-10 w-[80vw] md:w-auto"
                placeholder="Search by token address..."
                size="20"
                disabled={activeTab === "coin"}
                onChange={(e) => setSearchingAddress(e.target.value)}
              />
            </div>
            <select
              className="custom-select border-[#343143] border rounded-full px-5 py-2 bg-[#ffffff12] outline-none w-[160px] ml-[5px] h-[40px] text-[13px] md:hidden"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
            >
              <option
                className="bg-[#12101c] text-white py-2 border-none"
                value={FILTERS.ALL}
              >
                ALL
              </option>
              <option
                className="bg-[#12101c] text-white py-2 border-none"
                value={FILTERS.ACTIVE}
              >
                Active
              </option>
              <option
                className="bg-[#12101c] text-white py-2 border-none"
                value={FILTERS.CLOSED}
              >
                Closed
              </option>
              <option
                className="bg-[#12101c] text-white py-2 border-none"
                value={FILTERS.NOT_STARTED}
              >
                Not started
              </option>
              <option
                className="bg-[#12101c] text-white py-2 border-none"
                value={FILTERS.MINE}
              >
                {activeTab == "coin" ? "My vestings" : "My tokens"}
              </option>
            </select>
          </div>
          <div className="w-full md:px-5 md:py-5  md:w-full  flex flex-col md:flex-row gap-4 md:gap-2 relative">
            <div
              className="overflow-x-auto w-full mt-10 md:mt-0   
                                    text-white
                                "
            >
              <Box
                sx={{
                  height: 630,
                  width: "100%",
                  minWidth: 500,
                  paddingLeft: "20px",
                  paddingRight: "20px",
                  color: "white",
                  fontSize: "19px"
                }}
              >
                <DataGrid
                  rows={tableRows}
                  rowCount={totalResultCount}
                  columns={columns}
                  initialState={{
                    pagination: {
                      paginationModel: {
                        pageSize: PAGE_SIZE
                      }
                    }
                  }}
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
            {isReading === false && totalResultCount === 0 && (
              <div className="absolute top-5 left-0 right-0 h-[630px] flex justify-center items-center bg-transparent z-10">
                <button
                  className="  rounded-full px-4 h-[36px]   flex items-center 
                                text-white  text-[13px] font-medium min-w-[166px] justify-center
                                bg-gradient-to-b from-pink-button-top-color to-pink-button-bottom-color  rounded-full shadow-[-10px_-10px_30px_10px_rgba(255,64,154,0.1),_10px_10px_30px_10px_rgba(196,56,239,0.15)] 
                            "
                  onClick={() =>
                    activeTab === "tokens"
                      ? navigate("/create/0")
                      : navigate("/create/1")
                  }
                >
                  Create Contract
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className=" border border-panel-border-gray rounded-[50px]  w-full flex items-center justify-center py-10">
        <a
          className="  rounded-full px-4 h-[36px]   flex items-center 
                                text-white  text-[13px] font-medium min-w-[166px] justify-center
                                bg-gradient-to-b from-pink-button-top-color to-pink-button-bottom-color  rounded-full shadow-[-10px_-10px_30px_10px_rgba(255,64,154,0.1),_10px_10px_30px_10px_rgba(196,56,239,0.15)] 
                            "
          href="https://www.sharkteam.org/report/audit/20240201033C_en.pdf"
          target="_blank"
        >
          Audit Report
        </a>
      </div>
    </>
  );
};

export default Explorer;
