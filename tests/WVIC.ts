// Import the necessary dependencies
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { BigNumber, Signer } from 'ethers';
import hhe, { ethers } from 'hardhat';
import { WVIC } from '../typechain-types';
import { ECDSASignature, EIP712Domain, EIP712TypeDefinition } from './common/EIP712';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

describe('Coin98VRC25 token', async function() {
  let owner: Signer;
  let ownerAddress: string;
  let sender: Signer;
  let senderAddress: string;
  let recipient: Signer;
  let recipientAddress: string;
  let wVICToken: WVIC;
  let minFee = hhe.ethers.utils.parseEther('0.0001');
  let snapshot: any;

  before(async function() {
    [owner, sender, recipient] = await hhe.ethers.getSigners();
    ownerAddress = await owner.getAddress();
    senderAddress = await sender.getAddress();
    recipientAddress = await recipient.getAddress();
    const tokenFactory = await hhe.ethers.getContractFactory('WVIC');
    wVICToken = await tokenFactory.connect(owner).deploy();
    await wVICToken.deployed();
    await wVICToken.setFee(minFee);
  });

  beforeEach(async function() {
    snapshot = await hhe.ethers.provider.send('evm_snapshot', []);
  });

  afterEach(async function() {
    await hhe.ethers.provider.send('evm_revert', [snapshot]);
  });

  it('cannot set fee without ownership', async function() {
    await expect(wVICToken.connect(recipient).setFee(minFee))
      .to.be.revertedWith('VRC25: caller is not the owner');
  });

  it('check ownership', async function() {
    expect(await wVICToken.owner()).to.equal(ownerAddress);
  });

  it('should transfer ownership', async function() {
    await wVICToken.transferOwnership(recipientAddress);
    expect(await wVICToken.owner()).to.equal(ownerAddress);
    await wVICToken.connect(recipient).acceptOwnership();
    expect(await wVICToken.owner()).to.equal(recipientAddress);
  });

  it('cannot transfer ownership without ownership', async function() {
    await expect(wVICToken.connect(recipient).transferOwnership(recipientAddress))
      .to.be.revertedWith('VRC25: caller is not the owner');
  });

  it('deposit token with send transaction', async function() {
    await sender.sendTransaction({
      to: wVICToken.address,
      value: ethers.utils.parseEther('1.0'),
      gasLimit: 1000000,
    });

    expect(await wVICToken.balanceOf(senderAddress)).to.equal(ethers.utils.parseEther('1.0').sub(minFee));
  });

  it('deposit token with deposit function', async function() {
    await wVICToken.connect(sender).deposit({
      value: ethers.utils.parseEther('1.0'),
    });

    expect(await wVICToken.balanceOf(senderAddress)).to.equal(ethers.utils.parseEther('1.0').sub(minFee));
  });

  it('should transfer tokens', async function() {
    await sender.sendTransaction({
      to: wVICToken.address,
      value: ethers.utils.parseEther('1000').add(minFee),
      gasLimit: 1000000,
    });
    const initialSenderBalance = hhe.ethers.utils.parseEther('1000');
    const transferAmount = hhe.ethers.utils.parseEther('500');
    const initialRecipientBalance = hhe.ethers.BigNumber.from(0);
    const senderBalance = await wVICToken.balanceOf(senderAddress);
    const recipientBalance = await wVICToken.balanceOf(recipientAddress);
    expect(senderBalance).to.equal(initialSenderBalance);
    expect(recipientBalance).to.equal(initialRecipientBalance);
    await wVICToken.connect(sender).transfer(recipientAddress, transferAmount);
    expect(await wVICToken.balanceOf(senderAddress)).to.equal(initialSenderBalance.sub(transferAmount.add(minFee)));
    expect(await wVICToken.balanceOf(recipientAddress)).to.equal(initialRecipientBalance.add(transferAmount));
  });

  it('should transfer tokens without fee', async function() {
    await sender.sendTransaction({
      to: wVICToken.address,
      value: ethers.utils.parseEther('1000').add(minFee),
    });
    const initialSenderBalance = hhe.ethers.utils.parseEther('1000');
    const transferAmount = hhe.ethers.utils.parseEther('500');
    const initialRecipientBalance = hhe.ethers.BigNumber.from(0);
    await wVICToken.setFee(0);
    const ownerBalance = await wVICToken.balanceOf(senderAddress);
    const recipientBalance = await wVICToken.balanceOf(recipientAddress);
    expect(ownerBalance).to.equal(initialSenderBalance);
    expect(recipientBalance).to.equal(initialRecipientBalance);
    await wVICToken.connect(sender).transfer(recipientAddress, transferAmount);
    expect(await wVICToken.balanceOf(senderAddress)).to.equal(initialSenderBalance.sub(transferAmount));
    expect(await wVICToken.balanceOf(recipientAddress)).to.equal(initialRecipientBalance.add(transferAmount));
  });

  it('withdraw tokens by withdraw function', async function() {
    await sender.sendTransaction({
      to: wVICToken.address,
      value: ethers.utils.parseEther('1000').add(minFee),
    });

    await expect(await wVICToken.connect(sender).withdraw(ethers.utils.parseEther('100')))
      .to.changeEtherBalance(sender, ethers.utils.parseEther('100'))
      .to.changeTokenBalance(wVICToken, sender, ethers.utils.parseEther('-100').sub(minFee));
  });

  it('withdraw tokens by burn function', async function() {
    await sender.sendTransaction({
      to: wVICToken.address,
      value: ethers.utils.parseEther('1000').add(minFee),
    });

    await expect(await wVICToken.connect(sender).burn(ethers.utils.parseEther('100')))
      .to.changeEtherBalance(sender, ethers.utils.parseEther('100'))
      .to.changeTokenBalance(wVICToken, sender, ethers.utils.parseEther('-100').sub(minFee));
  });

  it('should permit tokens', async function() {
    await sender.sendTransaction({
      to: wVICToken.address,
      value: ethers.utils.parseEther('1000').add(minFee),
      gasLimit: 1000000,
    });
    const beforeAllowance = await wVICToken.allowance(senderAddress, recipientAddress);
    const nonceBefore = await wVICToken.nonces(senderAddress);
    const amount = hhe.ethers.utils.parseEther('1000');
    const deadline =  BigNumber.from(Math.floor(new Date().getTime() / 1000) + 3600);
    const permit = await createPermit(wVICToken, sender, recipientAddress, amount, deadline);
    await expect(wVICToken.connect(sender).permit(senderAddress, recipientAddress, amount, deadline, permit.v, permit.r, permit.s))
      .changeTokenBalance(wVICToken, owner, minFee);
    const afterAllowance = await wVICToken.allowance(senderAddress, recipientAddress);
    expect(afterAllowance).to.equal(beforeAllowance.add(amount));
    const nonceAfter = await wVICToken.nonces(senderAddress);
    expect(nonceAfter).to.greaterThan(nonceBefore);
  });

  it('cannot permit to the zero address', async function() {
    await sender.sendTransaction({
      to: wVICToken.address,
      value: ethers.utils.parseEther('1000').add(minFee),
      gasLimit: 1000000,
    });
    const amount = hhe.ethers.utils.parseEther('1000');
    const deadline =  BigNumber.from(Math.floor(new Date().getTime() / 1000) + 3600);
    const permit = await createPermit(wVICToken, sender, ZERO_ADDRESS, amount, deadline);
    await expect(wVICToken.connect(sender).permit(senderAddress, ZERO_ADDRESS, amount, deadline, permit.v, permit.r, permit.s))
      .to.be.revertedWith('VRC25: approve to the zero address');
  });

  it('cannot permit to the wrong address', async function() {
    await sender.sendTransaction({
      to: wVICToken.address,
      value: ethers.utils.parseEther('1000').add(minFee),
      gasLimit: 1000000,
    });
    const amount = hhe.ethers.utils.parseEther('1000');
    const deadline =  BigNumber.from(Math.floor(new Date().getTime() / 1000) + 3600);
    const permit = await createPermit(wVICToken, sender, recipientAddress, amount, deadline);
    await expect(wVICToken.connect(sender).permit(senderAddress, ownerAddress, amount, deadline, permit.v, permit.r, permit.s))
      .to.be.revertedWith('VRC25: Invalid permit');
  });

  it('cannot permit with wrong amount', async function() {
    await sender.sendTransaction({
      to: wVICToken.address,
      value: ethers.utils.parseEther('1000').add(minFee),
      gasLimit: 1000000,
    })
    const deadline =  BigNumber.from(Math.floor(new Date().getTime() / 1000) + 3600);
    const permit = await createPermit(wVICToken, sender, recipientAddress, hhe.ethers.utils.parseEther('1000'), deadline);
    await expect(wVICToken.connect(sender).permit(senderAddress, ownerAddress, hhe.ethers.utils.parseEther('1001'), deadline, permit.v, permit.r, permit.s))
      .to.be.revertedWith('VRC25: Invalid permit');
  });

  it('cannot permit expired permit', async function() {
    await sender.sendTransaction({
      to: wVICToken.address,
      value: ethers.utils.parseEther('1000').add(minFee),
      gasLimit: 1000000,
    });
    const amount = hhe.ethers.utils.parseEther('1000');
    const deadline =  BigNumber.from(Math.floor(new Date().getTime() / 1000) + 3600);
    const permit = await createPermit(wVICToken, sender, recipientAddress, amount, deadline);
    await time.increase(3700);
    await expect(wVICToken.connect(sender).permit(senderAddress, ownerAddress, amount, deadline, permit.v, permit.r, permit.s))
      .to.be.revertedWith('VRC25: Permit expired');
  });
});

async function createPermit(token: WVIC, owner: Signer, spenderAddress: string, amount: BigNumber, deadline: BigNumber): Promise<ECDSASignature> {
  const ownerAddress = await owner.getAddress();
  const nonce = await token.nonces(ownerAddress);
  const chainId = await hhe.ethers.provider.send('eth_chainId', []);

  const domain: EIP712Domain = {
    name: 'WVIC',
    version: '1',
    chainId: chainId,
    verifyingContract: token.address,
  };
  const types: EIP712TypeDefinition = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
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
  };
  return ecdsaSignature;
}
