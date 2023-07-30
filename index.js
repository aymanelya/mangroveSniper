const { testnet, mainnet, ownerWallet, stratParams } = require('./config');
const config = stratParams.network == 'testnet' ? testnet : mainnet;

const abis = require('./abis');
const { Mangrove, ethers } = require('@mangrovedao/mangrove.js');

const provider = new ethers.providers.JsonRpcProvider(config.RPC); // Your provider URL here
const takerWallet = new ethers.Wallet(ownerWallet.privateKey, provider);

const makerContract = new ethers.Contract(
  config.addresses.makerContractAddress,
  abis.makerContractAbi,
  takerWallet
);

async function snipeOffer(offerId) {
  console.log(`Sniping offer ${offerId}`);

  const mgv = await Mangrove.connect({ signer: takerWallet });

  // Connect mgv to a DAI, USDC market
  const market = await mgv.market({
    base: stratParams.trackedTokens[0],
    quote: stratParams.trackedTokens[1],
  });

  let isAsk;
  // Get all the info about the offer
  let offer = await market.getSemibook('asks').offerInfo(offerId);
  isAsk = offer.price ? true : false;
  if (!isAsk) {
    offer = await market.getSemibook('bids').offerInfo(offerId);
  }
  // Log offer to see what data in holds
  console.log(offer);

  // Approve Mangrove to take USDC from your account
  await mgv.approveMangrove(stratParams.trackedTokens[0]);
  await mgv.approveMangrove(stratParams.trackedTokens[1]);

  const gasPrice = await provider.getGasPrice();

  // Snipe the offer using the information about the offer.
  let snipePromises = await market.snipe(
    {
      targets: [
        {
          offerId: offer.id,
          takerWants: offer.gives,
          takerGives: offer.wants,
          gasLimit: offer.gasreq, // not mandatory
        },
      ],
      ba: isAsk ? 'asks' : 'bids',
    },
    { gasPrice }
  );
  let result = await snipePromises.result;
  console.log(result);
}

snipeOffer(186);
