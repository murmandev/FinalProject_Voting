"use client";

import { useEffect, useState } from "react";
import { useVotingContract } from "../hooks/useVotingContract";
import { useAccount } from "wagmi";

// Вспомогательный тип
type Proposal = {
  description: string;
  details: string;
  votesFor: number;
  votesAgainst: number;
  createdAt: number;
  index: number;
  author: string;
};

const VOTING_DURATION = 3 * 24 * 60 * 60 * 1000;

const getRemainingTime = (createdAt: number, now: number): string => {
  const endTime = createdAt + VOTING_DURATION;
  const remaining = endTime - now;
  if (remaining <= 0) return "Голосование завершено";
  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((remaining / (1000 * 60)) % 60);
  const seconds = Math.floor((remaining / 1000) % 60);
  return `${days}д ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

export default function Home() {
  const voting = useVotingContract();
  const { address } = useAccount();

  const [now, setNow] = useState(Date.now());
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [userVotes, setUserVotes] = useState<Map<number, number>>(new Map());
  const [newProposal, setNewProposal] = useState("");
  const [newDetails, setNewDetails] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [disabledVotes, setDisabledVotes] = useState<Set<number>>(new Set());

  const [page, setPage] = useState(0);
  const pageSize = 9;
  const [showOnlyEnded, setShowOnlyEnded] = useState(false);
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  useEffect(() => {
    const nowInterval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(nowInterval);
  }, []);

  const fetchProposals = async () => {
    if (!voting) return;

    const [desc, details, forVotes, againstVotes, createdAts, indices, authors] = await voting.read.getProposals();

    const formatted: Proposal[] = desc.map((d: string, i: number) => ({
      description: d,
      details: details[i],
      votesFor: Number(forVotes[i]),
      votesAgainst: Number(againstVotes[i]),
      createdAt: Number(createdAts[i]) * 1000,
      index: Number(indices[i]),
      author: authors[i].toLowerCase(),
    }));
    setProposals(formatted);

    if (!address) return;

    const votes: number[] = [];
    for (const p of formatted) {
      try {
        const vote = await voting.read.getVoteStatus([address, p.index]) as number;
        votes.push(vote);
      } catch {
        votes.push(0);
      }
    }
    const votesMap = new Map<number, number>();
    formatted.forEach((p, i) => votesMap.set(p.index, votes[i]));
    setUserVotes(votesMap);
  };

  useEffect(() => {
    if (!voting || !address) return;
    fetchProposals();
    const interval = setInterval(() => {
      fetchProposals().then(() => setDisabledVotes(new Set()));
    }, 30000);
    return () => clearInterval(interval);
  }, [voting, address]);

  const castVote = async (index: number, support: boolean) => {
    if (!voting) return;

    const proposal = proposals.find(p => p.index === index);
    console.log("🔍 Голосование по инициативе:");
    console.log("📋 index:", index);
    console.log("📌 support:", support);
    console.log("👤 address:", address);
    console.log("🧾 createdAt:", proposal?.createdAt);
    console.log("⏱ now:", now);
    console.log("📆 осталось мс:", proposal ? proposal.createdAt + VOTING_DURATION - now : "❌ нет данных");
    console.log("✔️ userVote:", userVotes.get(index));
    console.log("🗂 archived (расчётно):", proposal ? now >= proposal.createdAt + VOTING_DURATION : "❓");
    
    setDisabledVotes(prev => new Set(prev).add(index));
    try {
      await voting.write.vote([index, support]);
    } catch (e) {
      console.error("Ошибка голосования:", e);
    }
    await fetchProposals();
  };

  const createProposal = async () => {
    if (!voting || !newProposal.trim() || !newDetails.trim()) return;
    try {
      await voting.write.addProposal([newProposal.trim(), newDetails.trim()]);
      setNewProposal("");
      setNewDetails("");
      setShowForm(false);
      await fetchProposals();
    } catch (e) {
      console.error("Ошибка создания инициативы:", e);
    }
  };

  const filtered = proposals.filter(p => {
    const votingEnded = now >= p.createdAt + VOTING_DURATION;
    const isMine = address?.toLowerCase() === p.author;
    if (showOnlyEnded && !votingEnded) return false;
    if (!showOnlyEnded && votingEnded) return false;
    if (showOnlyMine && !isMine) return false;
    return true;
  });

  const paginated = filtered
    .sort((a, b) => (a.createdAt + VOTING_DURATION - now) - (b.createdAt + VOTING_DURATION - now))
    .slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Инициативы</h1>

      {showForm && (
        <div className="mb-6 space-y-4">
          <input
            type="text"
            value={newProposal}
            onChange={(e) => setNewProposal(e.target.value)}
            placeholder="Введите название инициативы"
            className="border border-gray-400 px-4 py-2 rounded w-full"
          />
          <textarea
            value={newDetails}
            onChange={(e) => setNewDetails(e.target.value)}
            placeholder="Введите описание инициативы"
            className="border border-gray-400 px-4 py-2 rounded w-full h-24"
          />
          <button
            onClick={createProposal}
            disabled={!newProposal.trim() || !newDetails.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Сохранить инициативу
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          {showForm ? "Скрыть форму" : "Добавить инициативу"}
        </button>

        <div className="flex space-x-2">
          <button
            onClick={() => setShowOnlyMine(!showOnlyMine)}
            className={`px-4 py-2 rounded ${showOnlyMine ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-800"}`}
          >
            {showOnlyMine ? "Показать все" : "Мои инициативы"}
          </button>

          <button
            onClick={() => setShowOnlyEnded(!showOnlyEnded)}
            className={`px-4 py-2 rounded ${showOnlyEnded ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-800"}`}
          >
            {showOnlyEnded ? "Показать активные" : "Показать завершённые"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {paginated.map((p) => {
          const votingEnded = now >= p.createdAt + VOTING_DURATION;
          const userVote = userVotes.get(p.index) ?? 0;
          const disabled = disabledVotes.has(p.index);

          return (
            <div key={p.index} className="border p-4 rounded shadow-md bg-white text-black">
              <div className="font-semibold mb-2 text-lg">{p.description}</div>
              <div className="text-sm text-gray-700 mb-2 whitespace-pre-line">{p.details}</div>
              <div className="text-sm text-gray-600 mb-1">За: {p.votesFor} | Против: {p.votesAgainst}</div>
              <div className="text-xs text-gray-500 mb-3">{getRemainingTime(p.createdAt, now)}</div>
              {!votingEnded ? (
                userVote === 0 ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => castVote(p.index, true)}
                      disabled={disabled}
                      className={`px-3 py-1 rounded text-white ${disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >ЗА</button>
                    <button
                      onClick={() => castVote(p.index, false)}
                      disabled={disabled}
                      className={`px-3 py-1 rounded text-white ${disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                    >ПРОТИВ</button>
                  </div>
                ) : (
                  <div className="text-green-600 text-sm">Вы проголосовали ({userVote === 1 ? "ЗА" : "ПРОТИВ"})</div>
                )
              ) : (
                <div className="text-gray-500 italic text-sm">Голосование завершено</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center mt-6">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded disabled:opacity-50"
        >Назад</button>
        <span className="text-sm text-gray-500">Страница {page + 1}</span>
        <button
          onClick={() => setPage((p) => (page + 1) * pageSize < filtered.length ? p + 1 : p)}
          disabled={(page + 1) * pageSize >= filtered.length}
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded disabled:opacity-50"
        >Вперёд</button>
      </div>
    </div>
  );
}
