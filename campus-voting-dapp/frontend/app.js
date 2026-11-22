const contractAddress = "0xdaAf10423eA276075F7eeb16d8C746cd5fbC0cB2";
const ABI_URL = "./abi.json";
let provider, signer, contract, userAccount, isAdmin = false;

const $ = (id) => document.getElementById(id);
function message(text, error=false) { $("message").textContent = text; $("message").style.color = error ? "#ffb4b4" : "#d7e6ff"; }
function shortAddress(a) { return a ? `${a.slice(0,6)}...${a.slice(-4)}` : "—"; }
async function loadABI() {
  const response = await fetch(ABI_URL);
  if (!response.ok) throw new Error("Could not load frontend/abi.json. Run this page through Live Server, not file://.");
  return response.json();
}
async function connectWallet() {
  try {
    if (!window.ethereum) throw new Error("MetaMask is not detected. Install or unlock MetaMask.");
    if (!ethers.isAddress(contractAddress)) throw new Error("Set the deployed contract address in frontend/app.js first.");
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    userAccount = await signer.getAddress();
    const network = await provider.getNetwork();
    if (network.chainId !== 11155111n) throw new Error("Switch MetaMask to Sepolia testnet.");
    const abi = await loadABI();
    contract = new ethers.Contract(contractAddress, abi, signer);
    const owner = await contract.owner();
    isAdmin = owner.toLowerCase() === userAccount.toLowerCase();
    $("walletStatus").textContent = `Wallet connected: ${shortAddress(userAccount)}`;
    $("adminPanel").hidden = !isAdmin;
    message(isAdmin ? "Connected as Electoral Admin." : "Wallet connected.");
    await loadElectionData();
    await checkLogin();
  } catch (e) { message(e.shortMessage || e.message || String(e), true); }
}
async function transact(action, success) {
  try {
    if (!contract) throw new Error("Connect MetaMask first.");
    message("Please confirm the transaction in MetaMask…");
    const tx = await action();
    message("Transaction submitted. Waiting for blockchain confirmation…");
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error("The transaction was not confirmed successfully.");
    message(success);
    await loadElectionData();
    return true;
  } catch (e) {
    const reason = e.reason || e.shortMessage || e.info?.error?.message || e.data?.message || e.message || "Transaction failed.";
    message(reason, true);
    return false;
  }
}
async function registerVoter() {
  if (!contract) return message("Connect MetaMask first.", true);
  const registered = await contract.registeredVoters(userAccount);
  if (registered) return $("voterState").textContent = "Registration status: Already registered";
  await transact(() => contract.registerVoter(), "Wallet registration submitted successfully.");
}
async function checkLogin() {
  if (!contract || !userAccount) {
    $("loginStatus").textContent = "Not logged in. Connect MetaMask first.";
    return;
  }
  try {
    const [registered, authorized] = await Promise.all([
      contract.registeredVoters(userAccount), contract.authorizedVoters(userAccount)
    ]);
    $("loginStatus").textContent = registered
      ? (authorized ? `Logged in: ${shortAddress(userAccount)} — approved to vote.` : `Wallet registered: ${shortAddress(userAccount)} — waiting for admin approval.`)
      : "This wallet is not registered yet.";
  } catch (e) {
    $("loginStatus").textContent = e.shortMessage || e.message || "Unable to check login.";
  }
}
async function addCandidate() {
  const name=$("candidateName").value.trim(), position=$("candidatePosition").value.trim();
  if (!name || !position) return message("Enter both candidate name and position.", true);
  await transact(() => contract.addCandidate(name,position), "Candidate added.");
  $("candidateName").value=""; $("candidatePosition").value="";
}
async function authorizeVoter() {
  try {
    if (!contract || !userAccount) return message("Connect the Electoral Admin wallet first.", true);
    if (!isAdmin) return message("Only the wallet that deployed this contract can authorize voters. Switch to the Electoral Admin account.", true);
    const address = $("voterAddress").value.trim();
    if (!ethers.isAddress(address)) return message("Enter a valid Ethereum wallet address (0x followed by 40 hexadecimal characters).", true);
    if (address.toLowerCase() === ethers.ZeroAddress.toLowerCase()) return message("The zero address cannot be authorized.", true);
    const [started, alreadyAuthorized] = await Promise.all([
      contract.electionStarted(), contract.authorizedVoters(address)
    ]);
    if (started) return message("The election has already started. Voter authorization is closed. Deploy a new contract if you need to change the voter list.", true);
    if (alreadyAuthorized) return message("This wallet is already authorized to vote.", true);
    const success = await transact(() => contract.authorizeVoter(address), `Voter ${shortAddress(address)} authorized successfully.`);
    if (success) $("voterAddress").value = "";
  } catch (e) {
    message(e.reason || e.shortMessage || e.message || "Could not authorize this wallet.", true);
  }
}
async function startElection() { await transact(() => contract.startElection(), "Election is now OPEN."); }
async function endElection() { await transact(() => contract.endElection(), "Election is CLOSED. Final results are available."); }
async function castVote(id) {
  if (!window.confirm("Submit your vote? This action cannot be undone.")) return;
  await transact(() => contract.vote(id), "Vote recorded successfully.");
}
async function loadElectionData() {
  if (!contract || !userAccount) return;
  try {
    const [open,count,total,registered,authorized,voted] = await Promise.all([
      contract.getElectionStatus(), contract.getCandidateCount(), contract.getTotalVotes(),
      contract.registeredVoters(userAccount), contract.authorizedVoters(userAccount), contract.hasVoted(userAccount)
    ]);
    $("electionStatus").textContent = open ? "OPEN" : "CLOSED";
    $("totalVotes").textContent = `Total votes: ${total.toString()}`;
    $("voterState").textContent = `Registration: ${registered ? "Registered" : "Not registered"} | Authorization: ${authorized ? "Authorized" : "Pending / not authorized"}`;
    $("voteState").textContent = `Vote status: ${voted ? "Already voted" : "Not yet voted"}`;
    await checkLogin();
    const list=$("candidateList"); list.replaceChildren();
    if (Number(count) === 0) { list.textContent="No candidates have been added yet."; return; }
    for (let i=1; i<=Number(count); i++) {
      const c=await contract.getCandidate(i);
      const card=document.createElement("article"); card.className="candidate";
      const title=document.createElement("strong"); title.textContent=c.name;
      const position=document.createElement("p"); position.textContent=`Position: ${c.position}`;
      const votes=document.createElement("p"); votes.textContent=`Votes: ${c.voteCount.toString()}`;
      card.append(title,position,votes);
      if (open && authorized && !voted) {
        const btn=document.createElement("button"); btn.className="primary"; btn.textContent="Vote for this candidate";
        btn.addEventListener("click",()=>castVote(c.id)); card.append(btn);
      }
      list.append(card);
    }
  } catch(e) { message(e.shortMessage || e.message || "Could not load election data.", true); }
}
$("connectButton").addEventListener("click",connectWallet);
$("registerButton").addEventListener("click",registerVoter);
$("checkLoginButton").addEventListener("click",checkLogin);
$("addCandidateButton").addEventListener("click",addCandidate);
$("authorizeVoterButton").addEventListener("click",authorizeVoter);
$("startElectionButton").addEventListener("click",startElection);
$("endElectionButton").addEventListener("click",endElection);
$("refreshButton").addEventListener("click",loadElectionData);
if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => location.reload());
  window.ethereum.on("chainChanged", () => location.reload());
}
