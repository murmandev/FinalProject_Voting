import { expect } from "chai";
import { ethers } from "hardhat";
import { Voting } from "../typechain-types";

describe("Voting", function () {
  let voting: Voting;
  let deployer: any;
  let voter1: any;
  let voter2: any;

  beforeEach(async () => {
    [deployer, voter1, voter2] = await ethers.getSigners();
    const VotingFactory = await ethers.getContractFactory("Voting");
    voting = await VotingFactory.deploy();
  });

  it("должен корректно развернуться с 11 инициативами", async () => {
    const [desc] = await voting.getProposals();
    expect(desc.length).to.equal(11); // 1 тестовая + 10 обычных
  });

  it("должен позволять добавление новой инициативы", async () => {
    await voting.connect(voter1).addProposal("Новая", "Описание");
    const [desc, details] = await voting.getProposals();
    expect(desc).to.include("Новая");
    expect(details[desc.indexOf("Новая")]).to.equal("Описание");
  });

  it("должен позволять голосование ЗА", async () => {
    await voting.connect(voter1).vote(0, true);
    const [,,votesFor] = await voting.getProposals();
    expect(votesFor[0]).to.equal(1);
  });

  it("должен позволять голосование ПРОТИВ", async () => {
    await voting.connect(voter1).vote(0, false);
    const [,,,votesAgainst] = await voting.getProposals();
    expect(votesAgainst[0]).to.equal(1);
  });

  it("не должен разрешать повторное голосование", async () => {
    await voting.connect(voter1).vote(0, true);
    await expect(voting.connect(voter1).vote(0, false)).to.be.revertedWith("Already voted");
  });

  it("должен возвращать корректный статус голосования", async () => {
    await voting.connect(voter1).vote(0, true);
    const status = await voting.getVoteStatus(voter1.address, 0);
    expect(status).to.equal(1); // 1 = ЗА
  });

  it("должен отклонять голосование по истёкшей инициативе", async () => {
    await ethers.provider.send("evm_increaseTime", [3 * 24 * 60 * 60 + 1]); // 3 дня + 1 сек
    await ethers.provider.send("evm_mine", []);
    await expect(voting.connect(voter1).vote(0, true)).to.be.revertedWith("Voting period is over");
  });

  it("должен архивировать просроченные инициативы", async () => {
    await ethers.provider.send("evm_increaseTime", [3 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);
    await voting.archiveExpiredProposals();
    const [,,, , , , authors] = await voting.getProposals();
    // проверка на то, что инициатива 0 (срок истёк) не попала в getProposals
    expect(authors.length).to.be.lessThan(11);
  });
});
