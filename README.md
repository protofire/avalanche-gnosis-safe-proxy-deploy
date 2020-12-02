# Gnosis Safe Proxy Avalance FUJI C-Chain deployment POC

Script for deploying a Safe on FUJI C-Chain, using some fixed setup parameters.

- **address to** `ZeroAddress`
- **bytes calldata data** `0x`
- **address fallbackHandler** `ZeroAddress`
- **address payable paymentReceiver** `ZeroAddress`

### Usage

- Create `.env` from `.env.exmple` and update its values.
- Run the following commands

```bash
yarn install
```

```bash
yarn deploy
```
