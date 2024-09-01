document
  .getElementById("connect-wallet")
  .addEventListener("click", async () => {
    const { solana } = window;

    if (solana && solana.isPhantom) {
      try {
        const response = await solana.connect();
        const wallet = response.publicKey.toString();
        // Display the connected wallet address on the button
        document.getElementById("connect-wallet").innerText = `${wallet.slice(
          0,
          4
        )}...${wallet.slice(-4)}`;
        console.log("Connected wallet:", wallet);

        // Store wallet public key for later use
        window.walletPublicKey = wallet;

        // Fetch and display streak after connecting wallet
        fetchStreak(wallet);
      } catch (err) {
        console.error("Failed to connect wallet:", err);
      }
    } else {
      alert("Please install Phantom wallet");
    }
  });

async function fetchStreak(wallet) {
  const query = `
        query {
            user {
                streak
            }
        }
    `;

  try {
    const response = await fetch("https://api.dscvr.one/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${wallet}`,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    const streak = data.data.user.streak;
    document.getElementById("streak-value").innerText = streak;
    console.log("User streak:", streak);

    // Generate the NFT
    document.getElementById("nft-image").src = generateNFT(streak);
  } catch (err) {
    console.error("Failed to fetch streak:", err);
  }
}

document.getElementById("reveal-nft").addEventListener("click", () => {
  const streak = parseInt(
    document.getElementById("streak-value").innerText,
    10
  );
  console.log("Revealing NFT for streak:", streak);
  document.getElementById("nft-image").src = generateNFT(streak);
});

document.getElementById('reveal-nft').addEventListener('click', () => {
    const streak = parseInt(document.getElementById('streak-value').innerText, 10);
    document.getElementById('nft-image').src = generateNFT(streak);

    // Hide the "Click to Reveal NFT" button
    document.getElementById('reveal-nft').style.display = 'none';
});


function generateNFT(streak) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 300;
  canvas.height = 300;

  if (streak === 0) {
    // White background with "Streak = 0" centered
    ctx.fillStyle = "#FFFFFF"; // White background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000"; // Black text
    ctx.font = "bold 30px Futura";
    ctx.textAlign = "center";
    ctx.fillText("Streak = 0", canvas.width / 2, canvas.height / 2);
  } else {
    // Random color background with current streak centered
    let hue = Math.floor(Math.random() * 360); // Random hue for color
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#FFFFFF"; // White text
    ctx.font = "bold 30px Futura";
    ctx.textAlign = "center";
    ctx.fillText(`Streak = ${streak}`, canvas.width / 2, canvas.height / 2);
  }

  return canvas.toDataURL();
}

document.getElementById("mint-nft").addEventListener("click", async () => {
  try {
    const connection = new solanaWeb3.Connection(
      solanaWeb3.clusterApiUrl("devnet"),
      "confirmed"
    );
    const walletPublicKey = new solanaWeb3.PublicKey(window.walletPublicKey);

    if (!walletPublicKey) {
      throw new Error(
        "Wallet public key is not available. Please connect your wallet."
      );
    }

    // Minting a new NFT
    const mint = solanaWeb3.Keypair.generate();
    const transaction = new solanaWeb3.Transaction();

    // Add instructions to mint the NFT here
    console.log("Starting NFT minting process...");

    // Sign and send transaction
    const signedTransaction = await window.solana.signAndSendTransaction(
      transaction
    );
    console.log("Transaction Signature:", signedTransaction);

    alert("NFT Minted Successfully");
  } catch (err) {
    console.error("Failed to mint NFT:", err);
  }
});
