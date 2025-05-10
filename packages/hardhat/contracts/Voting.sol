// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {
    struct Proposal {
        string description;
        string details;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 createdAt;
        bool archived;
        address author;
    }

    Proposal[] public proposals;
    mapping(address => mapping(uint256 => uint8)) public voteStatus;

    uint256 constant VOTING_DURATION = 3 days;

    constructor() {
        // Тестовая инициатива
        proposals.push(Proposal(
            unicode"Тестовая инициатива",
            unicode"Описание тестовой инициативы (закончится через 3 минуты)",
            0,
            0,
            block.timestamp - VOTING_DURATION + 3 minutes,
            false,
            msg.sender
        ));

        // 10 обычных инициатив
        for (uint256 i = 1; i <= 10; i++) {
            proposals.push(Proposal(
                string(abi.encodePacked(unicode"Инициатива #", uint2str(i))),
                string(abi.encodePacked(unicode"Описание инициативы #", uint2str(i))),
                0,
                0,
                block.timestamp,
                false,
                msg.sender
            ));
        }
    }

    function addProposal(string memory description, string memory details) public {
        proposals.push(Proposal(description, details, 0, 0, block.timestamp, false, msg.sender));
    }

    function vote(uint256 index, bool support) public {
        require(index < proposals.length, "Invalid index");
        Proposal storage p = proposals[index];
        require(!p.archived, "Proposal is archived");
        require(block.timestamp < p.createdAt + VOTING_DURATION, "Voting period is over");
        require(voteStatus[msg.sender][index] == 0, "Already voted");

        voteStatus[msg.sender][index] = support ? 1 : 2;
        if (support) {
            p.votesFor += 1;
        } else {
            p.votesAgainst += 1;
        }
    }

    function getProposals() public view returns (
        string[] memory descriptions,
        string[] memory detailsList,
        uint256[] memory votesFor,
        uint256[] memory votesAgainst,
        uint256[] memory createdAt,
        uint256[] memory indices,
        address[] memory authors
    ) {
        uint count = 0;
        for (uint i = 0; i < proposals.length; i++) {
            if (!proposals[i].archived) {
                count++;
            }
        }

        descriptions = new string[](count);
        detailsList = new string[](count);
        votesFor = new uint256[](count);
        votesAgainst = new uint256[](count);
        createdAt = new uint256[](count);
        indices = new uint256[](count);
        authors = new address[](count);

        uint j = 0;
        for (uint i = 0; i < proposals.length; i++) {
            if (!proposals[i].archived) {
                Proposal storage p = proposals[i];
                descriptions[j] = p.description;
                detailsList[j] = p.details;
                votesFor[j] = p.votesFor;
                votesAgainst[j] = p.votesAgainst;
                createdAt[j] = p.createdAt;
                indices[j] = i;
                authors[j] = p.author;
                j++;
            }
        }
    }

    function getVoteStatus(address user, uint256 index) public view returns (uint8) {
        require(index < proposals.length, "Invalid index");
        require(!proposals[index].archived, "Proposal is archived");
        return voteStatus[user][index];
    }

    function archiveExpiredProposals() public {
        for (uint i = 0; i < proposals.length; i++) {
            if (!proposals[i].archived && block.timestamp >= proposals[i].createdAt + VOTING_DURATION) {
                proposals[i].archived = true;
            }
        }
    }

    function uint2str(uint256 _i) internal pure returns (string memory str) {
        if (_i == 0) return "0";
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bstr[k] = bytes1(temp);
            _i /= 10;
        }
        return string(bstr);
    }
}
