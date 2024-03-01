import { BrowserRouter } from "react-router-dom";
import ReactDOM from "react-dom/client";
import {
  EthereumClient,
  w3mConnectors,
  w3mProvider
} from "@web3modal/ethereum";
import { Web3Modal } from "@web3modal/react";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import { polygonMumbai } from "wagmi/chains";
import { dione } from "./DioneConfig";
import { ToastContainer } from "react-toastify";

import App from "./App.jsx";
import "./index.css";
import "react-toastify/dist/ReactToastify.css";

const chains = [polygonMumbai, dione];
const projectId = "ba78c8b0160b1370cc3f4b5a2d52dbf3"; // this project is for home page https://dione-vesting-frontend.vercel.app/
/**
 *  MATIC token address : 0x0000000000000000000000000000000000001010
 */

const { publicClient } = configureChains(chains, [w3mProvider({ projectId })]);
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: w3mConnectors({ projectId, chains }),
  publicClient
});
const ethereumClient = new EthereumClient(wagmiConfig, chains);

ReactDOM.createRoot(document.getElementById("root")).render(
  <>
    {/* <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin dark:border-violet-400"></div> */}
    <WagmiConfig config={wagmiConfig}>
      <BrowserRouter>
        <App className="font-sans" />
        <ToastContainer position="top-left" />
      </BrowserRouter>
    </WagmiConfig>
    <Web3Modal
      projectId={projectId}
      ethereumClient={ethereumClient}
      themeMode="dark"
      themeVariables={{
        "--w3m-font-family": "Josefin, sans, sans-serif",
        "--w3m-accent-color": "#",
        "--w3m-accent-fill-color": "#fff",
        "--w3m-background-color": "#",
        "--w3m-border-color": "#fff"
      }}
    />
  </>
);
