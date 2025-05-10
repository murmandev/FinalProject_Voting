import * as chains from "viem/chains";
import type { ScaffoldConfig } from "~~/types/scaffoldConfig";
import VotingContract from "../hardhat/deployments/localhost/Voting.json"; // путь к сгенерированному JSON

export const DEFAULT_ALCHEMY_API_KEY = "oKxs-03sij-U_N0iOlrSsZFr29-IqbuF";

const scaffoldConfig = {
  targetNetworks: [chains.hardhat],
  pollingInterval: 30000,
  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || DEFAULT_ALCHEMY_API_KEY,
  rpcOverrides: {},
  walletConnectProjectId:
    process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "3a8170812b534d0ff9d794f19a901d64",
  onlyLocalBurnerWallet: true,
  contracts: {
    Voting: {
      abi: VotingContract.abi,
      address: {
        31337: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // используется адрес, указанный в JSON
      },
    },
  },
} as const satisfies ScaffoldConfig;

export default scaffoldConfig;
