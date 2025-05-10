import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployVoting: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("Voting", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
};

export default deployVoting;

deployVoting.tags = ["Voting"];
