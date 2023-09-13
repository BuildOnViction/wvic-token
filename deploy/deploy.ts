import { ethers } from "hardhat";

async function main() {
    const [owner] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("WTOMO");
    const wtomo = await factory.deploy({ gasLimit: 4700000 });
    console.log("Wrap Tomo deployed to:", wtomo.address);

    const contract = await ethers.getContractAt("WTOMO",wtomo.address);
    let deposit_amount = ethers.utils.parseEther('0.1');
    await contract.deposit({ gasLimit: 4700000, value: deposit_amount});

}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });