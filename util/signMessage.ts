import hhe from 'hardhat';
import { Signer, BigNumber } from 'ethers';
import { ECDSASignature, EIP712Domain, EIP712TypeDefinition } from './EIP712';

export async function createPermit(token: any, owner: Signer, spenderAddress: string, amount: BigNumber, deadline: BigNumber): Promise<ECDSASignature> {
    const ownerAddress = await owner.getAddress();
    const nonce = await token.nonces(ownerAddress);
    const chainId = await hhe.ethers.provider.send('eth_chainId', []);
  
    const domain: EIP712Domain = {
      name: "WTOMOPermit",
      version: "1",
      chainId: chainId,
      verifyingContract: token.address,
    };
    const types: EIP712TypeDefinition = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const value = {
      owner: ownerAddress,
      spender: spenderAddress,
      value: amount,
      nonce,
      deadline,
    };
    const signer = await hhe.ethers.getSigner(ownerAddress);
    const signature = await signer._signTypedData(domain, types, value);
    const ecdsaSignature: ECDSASignature = {
      r: '0x' + signature.substring(2, 66),
      s: '0x' + signature.substring(66, 130),
      v: parseInt(signature.substring(130, 132), 16),
    }
    return ecdsaSignature
  }