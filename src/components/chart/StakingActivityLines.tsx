import { useEffect, useRef, useState } from "react";
import ResizableBox from "./ResizableBox";
import useDemoConfig from "./useDemoConfig";
import React from "react";
import { Chart } from "react-charts";
import Reveal from "react-awesome-reveal";
import { fadeInRight } from "../../assets/constants";
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
// import { readListOfStakeEvents } from "../../subgraph-interaction";
import { formatGwei, formatUnits } from "viem";
import { readClaimesByDateRage } from "../../backend_interaction";
import { getEndOfDay, getStartOfDay } from "../../chain_interaction/common";

const nowTime = new Date();

export default function StakingActivityLines({ className, startTime, endTime, isVesting, vestingId }) {
  const [startDate, setStartDate] = useState(startTime ? startTime : nowTime);
  const [endDate, setEndDate] = useState(endTime ? endTime : nowTime);
  const [validGraphDataCount, setValidGrphDataCount] = useState(0);

  const [containerSize, setContainerSize] = useState({
    width: 600,
    height: 300,
  });
  const containerRef = useRef(null);

  useEffect(() => {
    // Get the initial size of the rendered div
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setContainerSize({ width: clientWidth - 50, height: clientHeight });
    }
  }, [containerRef]);

  const handleResize = (width, height) => {
    setContainerSize({ width, height });
  };

  function convertTimestampToDate(timestamp) {
    const date = new Date(timestamp * 1000);
    date.setHours(9, 0, 0, 0); // Set the time to 09:00:00
    return date;
  }

  function createDataArray(stakes) {

    const poolLabels = ['Claimed amounts'];
    const result = poolLabels.map(label => ({ label, data: [] }));
    const stakesByDayAndPool = {};

    if (stakes && stakes?.length > 0) {
      stakes.forEach(stake => {
        const date = new Date(stake.createdAt).toDateString();
        const poolIndex = 0;
        const amount = stake.amount;

        if (!stakesByDayAndPool[date]) {
          stakesByDayAndPool[date] = {};
        }
        if (!stakesByDayAndPool[date][poolIndex]) {
          stakesByDayAndPool[date][poolIndex] = 0;
        }

        stakesByDayAndPool[date][poolIndex] = parseFloat(stakesByDayAndPool[date][poolIndex]) + parseFloat(amount?.toString());
      });

      Object.keys(stakesByDayAndPool).forEach(date => {
        Object.keys(stakesByDayAndPool[date]).forEach(poolIndex => {
          const dataEntry = {
            primary: new Date(date),
            secondary: stakesByDayAndPool[date][poolIndex],
            radius: "4"
          };
          const label = poolLabels[poolIndex];
          let poolData = result.find(r => r.label === label);
          poolData.data.push(dataEntry);
        });
      });
    }
    // Sort each data array by date
    result.forEach(pool => {
      pool.data.sort((a, b) => a.primary - b.primary);
    });

    return result;
  }

  const { data } = useDemoConfig({
    series: 1,
    dataType: "time",
  });

  const [activityGraphData, setAcitivyGraphData] = useState(data);

  const primaryAxis = React.useMemo(
    () => ({
      getValue: (datum) => (datum.primary as unknown) as Date,
    }),
    []
  );

  const secondaryAxes = React.useMemo(
    () => [
      {
        getValue: (datum) => datum.secondary,
      },
    ],
    []
  );

  useEffect(() => {
    // Update the size of the Chart when the parent size changes
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setContainerSize({
          width: clientWidth - 50,
          height: clientHeight,
        });
      }
    };

    // Attach the resize event listener
    window.addEventListener("resize", handleResize);

    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);


  const readStakingsInAPeriod = async (startDate, endDate) => {
    try {
      const realStartTime = getStartOfDay(startDate);
      const realEndTime = getEndOfDay(endDate);

      const list = await readClaimesByDateRage(vestingId, realStartTime, realEndTime);

      const graphData = createDataArray(list || []);
      if (list?.length > 0) {
        setAcitivyGraphData(graphData);
        setValidGrphDataCount(list?.length);

      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    readStakingsInAPeriod(startDate, endDate);
  }, [startDate, endDate])

  return (
    <div
      className={`${className}  col-span-1   md:col-span-3 `}
    >
      <Reveal keyframes={fadeInRight} className='onStep' delay={0} duration={800} triggerOnce>
        <div
          className={`overflow-hidden relative md:max-h-[400px] `}
        >
          <div className=" flex justify-between items-center">
            <div className="text-[24px] font-semibold  ml-5 text-left">
              {isVesting !== true ? "Unlocking" : "Vesting"} Activity
            </div>
            <div className="flex flex-col items-end md:flex-wrap md:flex-row md:justify-end gap-1 mr-2 md:mr-10
            text-[14px] font-semibold 
          ">
              <div className="flex items-center"><span className="text-week-white">From:</span> &nbsp; <DatePicker className="max-w-[100px] bg-transparent" selected={startDate} onChange={(date) => setStartDate(date)} /></div>
              <div className="flex items-center"><span className="text-week-white">To:</span>&nbsp; <DatePicker className="max-w-[100px] bg-transparent" selected={endDate} onChange={(date) => setEndDate(date)} /> </div>
            </div>
          </div>


          <div ref={containerRef} className="min-h-[350px]">
            {
              validGraphDataCount > 0 &&
              <ResizableBox
                width={containerSize.width}
                height={320}
                onResize={handleResize}
                style={{
                  background: "transparent",
                }}
              >
                <Chart
                  options={{
                    data: activityGraphData,
                    primaryAxis,
                    secondaryAxes,
                    dark: true,
                    defaultColors: ["#FABE7A", "#019FC6", "#01C6A3", "#C6016A"],
                  }}
                />
              </ResizableBox>
            }
          </div>
        </div>
      </Reveal>
    </div>
  );
}
