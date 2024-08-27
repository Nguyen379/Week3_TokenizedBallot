# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.ts
```

### Prerequisites 
```shell
nvm use --lts   
node -v
v20.14.0
```
## Hardhat 
```shell
npm init -y
npm install --save-dev hardhat
npx hardhat init
```
-> Create a typescript project (with Viem)

```shell
npx hardhat compile
npx hardhat node
npx hardhat test
npx hardhat clean


cretae a .mocharc.json with contents:
{
  "require": "hardhat/register",
  "timeout": 40000,
  "_": ["test*/**/*.ts"]
}


rm ./contracts/*
rm ./ignition/*
rm ./ignition/modules
rm ./test/*
npx hardhat clean
npm i viem
npm install --save-dev @nomicfoundation/hardhat-chai-matchers
npm install dotenv
```