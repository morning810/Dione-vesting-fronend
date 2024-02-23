import './App.css'
import ConnectionButton from "./components/ConnectionButton";
import FooterButton from "./components/FooterButton";
import { HiOutlineMenuAlt1 } from "react-icons/hi";
import { AiOutlineClose } from "react-icons/ai";
import { useEffect, useState } from 'react';
import { TfiWallet } from "react-icons/tfi";
import { useNavigate, useRoutes } from "react-router-dom";
import Routes from "./Routes";
import { useAccount } from "wagmi";

const backgroundImageStyle = {
  backgroundColor: "#050310",
  backgroundSize: "cover",
  backgroundRepeat: "repeat",
  backgroundPosition: "center",
  minHeight: "150vh", // Adjust as needed
};

function App() {

  const { address, isConnecting, isDisconnected } = useAccount();
  const navigate = useNavigate();
  const pages = useRoutes(Routes);
  const [scrolled, setScrolled] = useState(false);

  const handleScroll = () => {
    const offset = window.scrollY;
    if (offset > 0) {
      setScrolled(true);
    } else {
      setScrolled(false);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  let navbarClasses = ['navbar'];
  if (scrolled) {
    navbarClasses.push('scrolled');
  }

  useEffect(() => {
    let prevWallet = localStorage.getItem("connectedWallet");
    if (address && address !== prevWallet) {
      localStorage.setItem("connectedWallet", address);
      // window.location.reload();
    }
  }, [address])

  return (
    <div
      className="App relative bg-black min-h-[100vh]  w-[100vw] overflow-hidden flex flex-col items-center font-sans "
      style={backgroundImageStyle}
    >
      <div className={`w-full border-b border-b-[#ffffff19] border-b-[2px] py-5 fixed z-[100]  flex justify-between ${navbarClasses.join(' ')} `} >
        <div className='  md:bg-transparent  px-5 flex flex-row justify-center md:justify-start items-center gap-1 md:gap-2  cursor-pointer' onClick={() => navigate("/")}>
          <img src="/logo.svg" />
          <div className='text-[24px] md:text-[24px] lg:text-[22px] font-semibold' >DIONE Vesting</div>
        </div>
        <div className='flex flex-col  justify-center md:justify-end pr-5  '>
          <ConnectionButton className={"max-sm:text-[16px] max-dm:text-[20px] lg:text-[22px] font-semibold"}
            label={isConnecting ? "Connecting..." : isDisconnected ? "Disconnected" : address ? address : "Connect"} />
        </div>
      </div>

      <div className='absolute top-0 left-0 flex w-full justify-start z-0'>
        <div className="blog-graphic blog-graphic-radial h-[800px] w-[800px] opacity-50 ">
        </div>
      </div>

      <div className='absolute top-[60px] right-0 flex w-full justify-end z-0 '>
        <div className="blog-graphic blog-graphic-radial transform rotate-180 h-[1000px] w-[1000px] opacity-50">
        </div>
      </div>

      <div className='absolute -top-[300px] -right-[250px] flex w-full justify-end z-0 '>
        <div className="connect-graphic-radial transform rotate-180 h-[700px] w-[700px] opacity-50 ">
        </div>
      </div>

      <div className='z-1 md:mt-24 bg-transparent w-11/12  max-sm:w-full min-h-[60vh] pt-[20px]' >

        {pages}

      </div>



    </div>
  )
}

export default App
