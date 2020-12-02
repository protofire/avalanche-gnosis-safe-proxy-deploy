const assert = require('assert')
const ethers = require('ethers')
const ethUtil = require('ethereumjs-util')
const abi = require('ethereumjs-abi')

const GnosisSafe = require('./contracts/GnosisSafe.json')
const GnosisSafeProxy = require('./contracts/GnosisSafeProxy.json')
const GnosisSafeProxyFactory = require('./contracts/GnosisSafeProxyFactory.json')
const IProxy = require('./contracts/IProxy.json')

require('dotenv').config()

const envs = ['RPC_URL', 'DEPLOYER_PK', 'OWNERS', 'THRESHOLD']
envs.forEach(key => {
  assert(process.env[key], `missing configuration env ${key}`)
});

const RPC_URL = process.env.RPC_URL
const DEPLOYER_PK = process.env.DEPLOYER_PK
const OWNERS = process.env.OWNERS
const THRESHOLD = process.env.THRESHOLD

const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
const wallet = new ethers.Wallet(DEPLOYER_PK, provider)
const gnosisSafeContract = new ethers.Contract(GnosisSafe.networks[1].address, GnosisSafe.abi, wallet)
const gnosisSafeProxyFactoryContract = new ethers.Contract(GnosisSafeProxyFactory.networks[1].address, GnosisSafeProxyFactory.abi, wallet)

const owners = OWNERS.split('|')

const gasPrice = ethers.utils.parseUnits('470', 'gwei')

let getCreationData = async function(gasToken, userCosts, creationNonce) {
  gnosisSafeData = await gnosisSafeContract.interface.encodeFunctionData('setup',[
    owners,
    THRESHOLD,
    ethers.constants.AddressZero,
    "0x",
    ethers.constants.AddressZero,
    gasToken,
    userCosts,
    ethers.constants.AddressZero
  ])

  let proxyCreationCode = await gnosisSafeProxyFactoryContract.proxyCreationCode()
  assert(proxyCreationCode, GnosisSafeProxy.bytecode)

  let constructorData = abi.rawEncode(
      ['address'],
      [ GnosisSafe.networks[1].address ]
  ).toString('hex')

  let encodedNonce = abi.rawEncode(['uint256'], [creationNonce]).toString('hex')

  let target = "0x" + ethUtil.generateAddress2(
    GnosisSafeProxyFactory.networks[1].address,
    ethUtil.keccak256("0x" + ethUtil.keccak256(gnosisSafeData).toString("hex") + encodedNonce),
    proxyCreationCode + constructorData
  ).toString("hex")

  console.log("    Predicted safe address: " + target)

  assert(await provider.getCode(target) === "0x")

  return {
      safe: target,
      data: gnosisSafeData,
      gasToken: gasToken,
      userCosts: userCosts,
      gasPrice: gasPrice,
      creationNonce: creationNonce
  }
}

let deployWithCreationData = async function(creationData) {
  const tx = await gnosisSafeProxyFactoryContract.createProxyWithNonce(
    GnosisSafe.networks[1].address, creationData.data, creationData.creationNonce,
    {
      gasPrice: gasPrice,
      gasLimit: 8000000
    }
  )

  const result = await tx.wait()

  console.log("    Deplyment Tx: ", result)

  const iProxyContract = new ethers.Contract(creationData.safe, IProxy.abi, wallet)
  assert(await iProxyContract.masterCopy(), GnosisSafe.networks[1].address)
}

async function main() {
  const gnosisSafeData = await gnosisSafeContract.interface.encodeFunctionData('setup',
    [
      owners,
      THRESHOLD,
      ethers.constants.AddressZero,
      "0x",
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      0,
      ethers.constants.AddressZero
    ]
  )
  let creationNonce = new Date().getTime()
  console.log("    Creation Nonce: ", creationNonce)

  let estimate = ((await gnosisSafeProxyFactoryContract.estimateGas.createProxyWithNonce(GnosisSafe.networks[1].address, gnosisSafeData, creationNonce)).mul(gasPrice)).add(14000)
  let creationData = await getCreationData(ethers.constants.AddressZero, estimate, creationNonce)

  // User funds safe
  await wallet.sendTransaction({ to: creationData.safe, value: creationData.userCosts, gasPrice: gasPrice})
  await sendingTx.wait()

  // Weird hack for confirming previous transfer
  await wallet.sendTransaction({ to: creationData.safe, value: ethers.utils.parseUnits('1', 'gwei'), gasPrice: gasPrice})
  await sendingTx.wait()

  const futureSafeBalance = await provider.getBalance(creationData.safe)
  console.log("    Safe balance: ", futureSafeBalance.toString())

  await deployWithCreationData(creationData)
}

main()
  .then(() => console.log('FINISH'))
  .catch(error => console.log(error))
