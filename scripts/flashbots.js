const { FlashbotsBundleProvider, } = require("@flashbots/ethers-provider-bundle");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
require("dotenv").config({ path: ".env" });

async function main() {
    //deploy fakeNFT contract
    const fakeNFT = await ethers.getContractFactory("FakeNFT");
    const FakeNFT = await fakeNFT.deploy();
    await FakeNFT.deployed();

    console.log("Address of Fake NFT contract: ", FakeNFT.address);

    // Create Alchemy Websocket Provider
    const provider = new ethers.providers.WebSocketProvider(
        process.env.ALCHEMY_WEBSOCKET_URL,
        "goerli"
    )

    // Wrap private key in the ethers wallet class
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    // Create a Flashbots Provider which will forward the req to the relayer
    // Which will send it to the flashbot miner
    const flashbotsProvider = await FlashbotsBundleProvider.create(
        provider,
        signer,
        "https://relay-goerli.flashbots.net",
        "goerli"
    );

    provider.on("block", async (blockNumber) => {
        console.log("Block Number:", blockNumber);
        // Sebd a bundle of transactions to the flashbot relayer
        const bundleResponse = await flashbotsProvider.sendBundle([
            {
                transaction: {
                    // ChainID for Goerli network
                    chainId: 5,
                    // EIP-1559
                    type: 2,
                    // Value of 1 FakeNFT
                    value: ethers.utils.parseEther("0.01"),
                    //Address of the fakeNFT
                    to: FakeNFT.address,
                    // In the data field, we pass the function selector of the mint function
                    data: FakeNFT.interface.getSighash("mint()"),
                    // Max gas fee willing to pay
                    maxFeePerGas: BigNumber.from(10).pow(9).mul(3),
                    //Max priority gas fees willing to pay
                    maxPriorityFeePerGas: BigNumber.from(10).pow(9).mul(2),
                },
                signer: signer,
            }
        ], blockNumber + 1);

        // if error log it
        if ("error" in bundleResponse) {
            console.log(bundleResponse.error.message)
        }
    })
}

main()