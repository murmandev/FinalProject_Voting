"use client";

import { useEffect, useState } from "react";
import { useWalletClient, usePublicClient } from "wagmi";
import { getContract, type WalletClient, type PublicClient } from "viem";
import VotingJson from "../contracts/Voting.json";
import { VOTING_CONTRACT_ADDRESS } from "../constants";

type VotingContractType = ReturnType<typeof getContract> | undefined;

export const useVotingContract = (): VotingContractType => {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [contract, setContract] = useState<VotingContractType>();

  useEffect(() => {
    const setupContract = () => {
      try {
        console.log("🧪 Настройка контракта...");
        const abi = VotingJson.abi;
        const client = walletClient ?? publicClient;

        console.log("🧩 walletClient:", walletClient);
        console.log("🧩 publicClient:", publicClient);

        if (!client) {
          console.log("⚠️ Ни один клиент не доступен");
          return;
        }

        const votingContract = getContract({
          address: VOTING_CONTRACT_ADDRESS,
          abi,
          client,
        });

        setContract(votingContract);
        console.log("✅ Контракт установлен", votingContract);
      } catch (error) {
        console.error("Ошибка при инициализации контракта:", error);
      }
    };

    setupContract();
  }, [walletClient, publicClient]);

  return contract;
};
