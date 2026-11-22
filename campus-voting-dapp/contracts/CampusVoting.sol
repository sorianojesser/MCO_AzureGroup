// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Campus Voting - one election per deployment
contract CampusVoting {
    struct Candidate {
        uint256 id;
        string name;
        string position;
        uint256 voteCount;
        bool exists;
    }

    address public owner;
    uint256 public candidateCount;
    uint256 public totalVotes;
    bool public electionOpen;
    bool public electionStarted;

    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public registeredVoters;
    mapping(address => bool) public authorizedVoters;
    mapping(address => bool) public hasVoted;

    event CandidateAdded(uint256 indexed candidateId, string name);
    event VoterRegistered(address indexed voter);
    event VoterAuthorized(address indexed voter);
    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event ElectionStatusChanged(bool isOpen);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only admin");
        _;
    }

    constructor() { owner = msg.sender; }

    function registerVoter() external {
        require(!electionStarted, "Registration is closed");
        require(!registeredVoters[msg.sender], "Already registered");
        registeredVoters[msg.sender] = true;
        emit VoterRegistered(msg.sender);
    }

    function addCandidate(string calldata _name, string calldata _position) external onlyOwner {
        require(!electionStarted, "Election already started");
        require(bytes(_name).length > 0, "Candidate name required");
        require(bytes(_position).length > 0, "Position required");
        candidateCount++;
        candidates[candidateCount] = Candidate(candidateCount, _name, _position, 0, true);
        emit CandidateAdded(candidateCount, _name);
    }

    function authorizeVoter(address _voter) external onlyOwner {
        require(!electionStarted, "Registration is closed");
        require(_voter != address(0), "Invalid address");
        require(!electionStarted, "Registration is closed");
        require(!authorizedVoters[_voter], "Already authorized");
        // Admin may authorize a wallet directly, as required by the project workflow.
        // Voter self-registration remains available but is not a prerequisite.
        authorizedVoters[_voter] = true;
        emit VoterAuthorized(_voter);
    }

    function startElection() external onlyOwner {
        require(!electionStarted, "This election has already started");
        require(candidateCount >= 2, "Add at least two candidates");
        electionStarted = true;
        electionOpen = true;
        emit ElectionStatusChanged(true);
    }

    function endElection() external onlyOwner {
        require(electionOpen, "Election is not open");
        electionOpen = false;
        emit ElectionStatusChanged(false);
    }

    function vote(uint256 _candidateId) external {
        require(electionOpen, "Election is not open");
        require(authorizedVoters[msg.sender], "Not an authorized voter");
        require(!hasVoted[msg.sender], "Already voted");
        require(candidates[_candidateId].exists, "Invalid candidate");
        hasVoted[msg.sender] = true;
        candidates[_candidateId].voteCount++;
        totalVotes++;
        emit VoteCast(msg.sender, _candidateId);
    }

    function getCandidate(uint256 _candidateId) external view returns (Candidate memory) {
        require(candidates[_candidateId].exists, "Invalid candidate");
        return candidates[_candidateId];
    }

    function getCandidateCount() external view returns (uint256) { return candidateCount; }
    function getTotalVotes() external view returns (uint256) { return totalVotes; }
    function getElectionStatus() external view returns (bool) { return electionOpen; }
}
