# Campus Voting dApp 

## Important
This version changes the smart contract. **Deploy the updated `contracts/CampusVoting.sol` as a NEW contract** and use the new address. The old deployed contract and old address are not compatible with the added voter-registration functions. The address placeholder in `frontend/app.js` must be replaced.

## Setup
1. Open `contracts/CampusVoting.sol` in Remix.
2. Compile with Solidity compiler 0.8.24.
3. In MetaMask, select Sepolia and deploy using Injected Provider.
4. Copy the deployed address into `frontend/app.js` (`contractAddress`).
5. Keep `frontend/abi.json` beside `index.html` and `app.js`.
6. Open the `frontend` folder in VS Code and run `index.html` with Live Server. Do not open it using `file://`.
7. Connect the deployer wallet. It is the Electoral Admin; admin controls appear automatically.
8. Add at least two candidates.
9. Each voter connects their wallet and clicks **Register This Wallet**. The admin then enters that wallet address and clicks **Authorize Voter**.
10. Admin starts the election. Each authorized wallet can vote once.
11. Admin closes the election. Results and total votes remain publicly readable.

## Notes
- This is one election per deployed contract. Once started, it cannot be restarted.
- The frontend checks that MetaMask is on Sepolia (chain ID 11155111).
- Registration and voting are separate: registration does not grant voting permission until the admin authorizes the wallet.
- The ABI included here matches the updated source contract. If you recompile a modified contract, replace `abi.json` with the ABI from Remix.
- This is an educational prototype, not an audited election system. Do not use it for real elections or real funds.

## Updated interface
The frontend now uses a gray theme with blue action buttons. The MetaMask connect button sits directly below the app title. Candidate browsing, voting, and vote totals are combined in one section. The voter name and student ID fields are presentation-only in this version; the current Solidity contract registers wallet addresses, not personal profile data.


## Authorization fix
The admin can now authorize any valid non-zero wallet address directly; the voter does not have to submit on-chain registration first. Voter registration remains available as a separate page/workflow. Only the contract deployer can authorize, and authorization closes when the election starts. Because the Solidity authorization rule changed, deploy this updated contract as a NEW deployment and update `contractAddress` in `frontend/app.js`. The old deployed contract cannot be modified.
