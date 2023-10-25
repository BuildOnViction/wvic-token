// Import the necessary dependencies
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { BigNumber, Signer } from 'ethers';
import hhe, { ethers } from 'hardhat';
import { WVIC } from '../typechain-types';
import { ECDSASignature, EIP712Domain, EIP712TypeDefinition } from './common/EIP712';

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

describe('Coin98VRC25 token', async function() {
  let owner: Signer;
  let ownerAddress: string;
  let sender: Signer;
  let senderAddress: string;
  let recipient: Signer;
  let recipientAddress: string;
  let wVICToken: WVIC;
  let maxSupply = 1_000_000_000;
  let minFee = hhe.ethers.utils.parseEther('1');
  let priceN = BigNumber.from('1');
  let priceD = BigNumber.from('100');
  let snapshot: any;

  before(async function() {
    [owner, sender, recipient] = await hhe.ethers.getSigners();
    ownerAddress = await owner.getAddress();
    senderAddress = await sender.getAddress();
    recipientAddress = await recipient.getAddress();
    const tokenFactory = await hhe.ethers.getContractFactory('WVIC');
    wVICToken = await tokenFactory.connect(owner).deploy();
    await wVICToken.deployed();
    await wVICToken.setFee(minFee);;
  });

  beforeEach(async function() {
    snapshot = await hhe.ethers.provider.send('evm_snapshot', []);
  });

  afterEach(async function() {
    await hhe.ethers.provider.send('evm_revert', [snapshot]);
  });

  it('cannot set fee without ownership', async function() {
    await expect(wVICToken.connect(recipient).setFee(minFee))
      .to.be.revertedWith('Ownable: caller is not the owner');
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
      .to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('deposit token with send transaction', async function() {
    await owner.sendTransaction({
      to: wVICToken.address,
      value: ethers.utils.parseEther("1.0"),
      gasLimit: 1000000,
    })

    expect(await wVICToken.balanceOf(ownerAddress)).to.equal(ethers.utils.parseEther("1.0"))
  })

  it('should transfer tokens', async function() {
    await sender.sendTransaction({
      to: wVICToken.address,
      value: ethers.utils.parseEther("1000"),
      gasLimit: 1000000,
    })
    const initialSenderBalance = hhe.ethers.utils.parseEther('1000');
    const transferAmount = hhe.ethers.utils.parseEther('500');
    const initialRecipientBalance = hhe.ethers.BigNumber.from(0);
    const ownerBalance = await wVICToken.balanceOf(senderAddress);
    const recipientBalance = await wVICToken.balanceOf(recipientAddress);
    expect(ownerBalance).to.equal(initialSenderBalance);
    expect(recipientBalance).to.equal(initialRecipientBalance);
    await wVICToken.connect(sender).transfer(recipientAddress, transferAmount);
    expect(await wVICToken.balanceOf(senderAddress)).to.equal(initialSenderBalance.sub(transferAmount.add(minFee)));
    expect(await wVICToken.balanceOf(recipientAddress)).to.equal(initialRecipientBalance.add(transferAmount));
  });

  // it('should transfer tokens without fee', async function() {
  //   await sender.sendTransaction({
  //     to: wVICToken.address,
  //     value: ethers.utils.parseEther("1000"),
  //   })
  //   const initialSenderBalance = hhe.ethers.utils.parseEther('1000');
  //   const transferAmount = hhe.ethers.utils.parseEther('500');
  //   const initialRecipientBalance = hhe.ethers.BigNumber.from(0);
  //   await wVICToken.setFee(0, priceD, 0);
  //   const ownerBalance = await wVICToken.balanceOf(senderAddress);
  //   const recipientBalance = await wVICToken.balanceOf(recipientAddress);
  //   expect(ownerBalance).to.equal(initialSenderBalance);
  //   expect(recipientBalance).to.equal(initialRecipientBalance);
  //   await wVICToken.connect(sender).transfer(recipientAddress, transferAmount);
  //   expect(await wVICToken.balanceOf(senderAddress)).to.equal(initialSenderBalance.sub(transferAmount));
  //   expect(await wVICToken.balanceOf(recipientAddress)).to.equal(initialRecipientBalance.add(transferAmount));
  // });

  // it('cannot transfer exceeds balance', async function() {
  //   await wVICToken.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
  //   const amount = hhe.ethers.utils.parseEther('1001');
  //   await expect(wVICToken.connect(sender).transfer(recipientAddress, amount))
  //     .to.be.revertedWith('ERC20: transfer amount exceeds balance');
  // });

  // it('cannot transfer to the zero address', async function() {
  //   await wVICToken.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
  //   const transferAmount = hhe.ethers.utils.parseEther('500');
  //   await expect(wVICToken.connect(sender).transfer(ZERO_ADDRESS, transferAmount))
  //     .to.be.revertedWith('ERC20: transfer to the zero address');
  // });

  // it('cannot freeze token without ownership', async function() {
  //   await expect(wVICToken.connect(recipient).freeze())
  //     .to.be.revertedWith('Ownable: caller is not the owner');
  // });

  // it('cannot unfreeze token without ownership', async function() {
  //   await expect(wVICToken.connect(recipient).unfreeze())
  //     .to.be.revertedWith('Ownable: caller is not the owner');
  // });

  // it('cannot transfer tokens while the token is frozen', async function() {
  //   await wVICToken.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
  //   const transferAmount = hhe.ethers.utils.parseEther('500');
  //   await wVICToken.connect(owner).freeze();
  //   await expect(wVICToken.connect(sender).transfer(recipientAddress, transferAmount))
  //     .to.be.revertedWith('ERC20: token transfer while frozen');
  //   await wVICToken.connect(owner).unfreeze();
  //   await wVICToken.connect(sender).transfer(recipientAddress, transferAmount);
  // });

  // it('should rescue accidentally sent token', async function() {
  //   await wVICToken.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
  //   const tokenFactory = await hhe.ethers.getContractFactory('Coin98');
  //   const anotherwVICToken = await tokenFactory.connect(owner).deploy();
  //   const initialBalance = hhe.ethers.utils.parseEther('1000');
  //   await anotherwVICToken.connect(owner).mint(ownerAddress, initialBalance);
  //   await anotherwVICToken.connect(owner).transfer(wVICToken.address, initialBalance);
  //   await wVICToken.connect(owner).withdraw(anotherwVICToken.address, recipientAddress, initialBalance);
  //   expect(await anotherwVICToken.balanceOf(recipientAddress)).to.equal(initialBalance);
  // });

  // it('cannot rescue accidentally sent token without ownership', async function() {
  //   await wVICToken.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
  //   const tokenFactory = await hhe.ethers.getContractFactory('Coin98');
  //   const anotherwVICToken = await tokenFactory.connect(owner).deploy();
  //   const initialBalance = hhe.ethers.utils.parseEther('1000');
  //   await anotherwVICToken.connect(owner).mint(ownerAddress, initialBalance);
  //   await anotherwVICToken.connect(owner).transfer(wVICToken.address, initialBalance);
  //   await expect(wVICToken.connect(recipient).withdraw(anotherwVICToken.address, recipientAddress, initialBalance))
  //     .to.be.revertedWith('Ownable: caller is not the owner');
  // });

  // it('should approve tokens', async function() {
  //   await wVICToken.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
  //   const beforeAllowance = await wVICToken.allowance(senderAddress, recipientAddress);
  //   const amount = hhe.ethers.utils.parseEther('1000');
  //   await wVICToken.connect(sender).approve(recipientAddress, amount);
  //   const afterAllowance = await wVICToken.allowance(senderAddress, recipientAddress);
  //   expect(afterAllowance).to.equal(beforeAllowance.add(amount));
  // });

  // it('cannot approve to the zero address', async function() {
  //   await wVICToken.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
  //   await expect(wVICToken.connect(owner).approve(ZERO_ADDRESS, '1'))
  //     .to.be.revertedWith('ERC20: approve to the zero address');
  // });

  // it('should increase allowance', async function() {
  //   await wVICToken.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
  //   const beforeAllowance = await wVICToken.allowance(senderAddress, recipientAddress);
  //   const initAmount = hhe.ethers.utils.parseEther('1000');
  //   await wVICToken.connect(sender).approve(recipientAddress, initAmount);
  //   const increaseAmount = hhe.ethers.utils.parseEther('500');
  //   await wVICToken.connect(sender).increaseAllowance(recipientAddress, increaseAmount);
  //   const afterAllowance = await wVICToken.allowance(senderAddress, recipientAddress);
  //   expect(afterAllowance).to.equal(beforeAllowance.add(initAmount).add(increaseAmount));
  // });

  // it('should decrease allowance', async function() {
  //   await wVICToken.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
  //   const beforeAllowance = await wVICToken.allowance(senderAddress, recipientAddress);
  //   const initAmount = hhe.ethers.utils.parseEther('1000');
  //   await wVICToken.connect(sender).approve(recipientAddress, initAmount);
  //   const decreaseAmount = hhe.ethers.utils.parseEther('500');
  //   await wVICToken.connect(sender).decreaseAllowance(recipientAddress, decreaseAmount);
  //   const afterAllowance = await wVICToken.allowance(senderAddress, recipientAddress);
  //   expect(afterAllowance).to.equal(beforeAllowance.add(initAmount).sub(decreaseAmount));
  // });

  // it('cannot decrease allowance below zero', async function() {
  //   await wVICToken.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
  //   const initAmount = hhe.ethers.utils.parseEther('1000');
  //   await wVICToken.connect(sender).approve(recipientAddress, initAmount);
  //   const decreaseAmount = hhe.ethers.utils.parseEther('1001');
  //   await expect(wVICToken.connect(sender).decreaseAllowance(recipientAddress, decreaseAmount))
  //     .to.be.revertedWith('ERC20: decreased allowance below zero');
  // });

  // it('should transferFrom successful', async function() {
  //   await wVICToken.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
  //   const balanceBefore = await wVICToken.balanceOf(recipientAddress);
  //   const amount = hhe.ethers.utils.parseEther('100');
  //   await wVICToken.connect(sender).approve(recipientAddress, hhe.ethers.utils.parseEther('200'));
  //   expect(await wVICToken.allowance(senderAddress, recipientAddress)).to.equal(hhe.ethers.utils.parseEther('200'));
  //   await wVICToken.connect(recipient).transferFrom(senderAddress, recipientAddress, amount);
  //   const fee = calculateFee(amount, priceN, priceD, minFee);
  //   expect(await wVICToken.allowance(senderAddress, recipientAddress)).to.equal(hhe.ethers.utils.parseEther('200').sub(amount).sub(fee));
  //   const balanceAfter = await wVICToken.balanceOf(recipientAddress);
  //   expect(balanceAfter).to.equal(balanceBefore.add(amount));
  // });

  // it('should transferFrom successful without fee', async function() {
  //   await wVICToken.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
  //   const balanceBefore = await wVICToken.balanceOf(recipientAddress);
  //   const amount = hhe.ethers.utils.parseEther('100');
  //   await wVICToken.setFee(0, priceD, 0);
  //   await wVICToken.connect(sender).approve(recipientAddress, amount);
  //   await wVICToken.connect(recipient).transferFrom(senderAddress, recipientAddress, amount);
  //   const balanceAfter = await wVICToken.balanceOf(recipientAddress);
  //   expect(balanceAfter).to.equal(balanceBefore.add(amount));
  // });

  // it('cannot transferFrom exceeds allowance', async function() {
  //   await wVICToken.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
  //   const approveAmount = hhe.ethers.utils.parseEther('100');
  //   const transferAmount = hhe.ethers.utils.parseEther('101');
  //   await wVICToken.connect(sender).approve(recipientAddress, approveAmount);
  //   await expect(wVICToken.connect(recipient).transferFrom(senderAddress, recipientAddress, transferAmount))
  //     .to.be.revertedWith('ERC20: transfer amount exceeds allowance');
  // });

  // it('should permit tokens', async function() {
  //   await wVICToken.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
  //   const beforeAllowance = await wVICToken.allowance(senderAddress, recipientAddress);
  //   const nonceBefore = await wVICToken.nonces(senderAddress);
  //   const amount = hhe.ethers.utils.parseEther('1000');
  //   const deadline =  BigNumber.from(Math.floor(new Date().getTime() / 1000) + 3600);
  //   const permit = await createPermit(wVICToken, sender, recipientAddress, amount, deadline);
  //   await wVICToken.connect(owner).setFee(0, 1, minFee);
  //   await expect(wVICToken.connect(sender).permit(senderAddress, recipientAddress, amount, deadline, permit.v, permit.r, permit.s))
  //     .changeTokenBalance(wVICToken, owner, minFee);
  //   const afterAllowance = await wVICToken.allowance(senderAddress, recipientAddress);
  //   expect(afterAllowance).to.equal(beforeAllowance.add(amount));
  //   const nonceAfter = await wVICToken.nonces(senderAddress);
  //   expect(nonceAfter).to.greaterThan(nonceBefore);
  // });

  // it('cannot permit to the zero address', async function() {
  //   await wVICToken.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
  //   const amount = hhe.ethers.utils.parseEther('1000');
  //   const deadline =  BigNumber.from(Math.floor(new Date().getTime() / 1000) + 3600);
  //   const permit = await createPermit(wVICToken, sender, ZERO_ADDRESS, amount, deadline);
  //   await expect(wVICToken.connect(sender).permit(senderAddress, ZERO_ADDRESS, amount, deadline, permit.v, permit.r, permit.s))
  //     .to.be.revertedWith('ERC20: approve to the zero address');
  // });

  // it('cannot permit to the wrong address', async function() {
  //   await wVICToken.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
  //   const amount = hhe.ethers.utils.parseEther('1000');
  //   const deadline =  BigNumber.from(Math.floor(new Date().getTime() / 1000) + 3600);
  //   const permit = await createPermit(wVICToken, sender, recipientAddress, amount, deadline);
  //   await expect(wVICToken.connect(sender).permit(senderAddress, ownerAddress, amount, deadline, permit.v, permit.r, permit.s))
  //     .to.be.revertedWith('VRC25: Invalid permit');
  // });

  // it('cannot permit with wrong amount', async function() {
  //   await wVICToken.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
  //   const deadline =  BigNumber.from(Math.floor(new Date().getTime() / 1000) + 3600);
  //   const permit = await createPermit(wVICToken, sender, recipientAddress, hhe.ethers.utils.parseEther('1000'), deadline);
  //   await expect(wVICToken.connect(sender).permit(senderAddress, ownerAddress, hhe.ethers.utils.parseEther('1001'), deadline, permit.v, permit.r, permit.s))
  //     .to.be.revertedWith('VRC25: Invalid permit');
  // });

  // it('cannot permit expired permit', async function() {
  //   await wVICToken.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
  //   const amount = hhe.ethers.utils.parseEther('1000');
  //   const deadline =  BigNumber.from(Math.floor(new Date().getTime() / 1000) + 3600);
  //   const permit = await createPermit(wVICToken, sender, recipientAddress, amount, deadline);
  //   await time.increase(3700);
  //   await expect(wVICToken.connect(sender).permit(senderAddress, ownerAddress, amount, deadline, permit.v, permit.r, permit.s))
  //     .to.be.revertedWith('VRC25: Permit expired');
  // });

  // it('should not take fee if caller of Coin98VRC25 is contract', async function() {
  //   const testTransferHelperFactory = await hhe.ethers.getContractFactory('TestTransferHelper')
  //   const testTransferHelper = await testTransferHelperFactory.deploy(wVICToken.address);

  //   await wVICToken.setFee(10, 10000, 1111); // 10 wei
  //   await wVICToken.connect(owner).mint(testTransferHelper.address, 10000000);
  //   await wVICToken.connect(owner).mint(senderAddress, 100000000000);

  //   // zero fee if sender is contract for normal flow
  //   await expect(testTransferHelper.connect(sender).sendToken(recipientAddress, 1000)).to.changeTokenBalances(wVICToken, [testTransferHelper, recipientAddress, owner], [-1000, 1000, 0]);
  //   await expect(testTransferHelper.connect(sender).burnToken(1000)).to.changeTokenBalances(wVICToken, [testTransferHelper, owner], [-1000, 0]);

  //   // zero fee if sender is contract for approval flow
  //   await expect(testTransferHelper.connect(sender).approveToken(recipientAddress, 1200)).to.changeTokenBalances(wVICToken, [sender, testTransferHelper, owner], [0, 0, 0]);

  //   await expect(wVICToken.connect(sender).approve(testTransferHelper.address, 1000)).to.changeTokenBalances(wVICToken, [owner], [1111]);
  //   await expect(testTransferHelper.connect(sender).sendTokenWithTransferFrom(senderAddress, recipientAddress, 1000)).to.changeTokenBalances(wVICToken, [sender, recipientAddress, owner], [-1000, 1000, 0]);

  //   // zero fee if sender is contract for permit flow
  //   const deadline =  BigNumber.from(Math.floor(new Date().getTime() / 1000) + 3600);
  //   const permit = await createPermit(wVICToken, sender, testTransferHelper.address, BigNumber.from(3000), deadline);
  //   await expect(testTransferHelper.connect(sender).sendTokenWithTransferFromPermit(senderAddress, recipientAddress, BigNumber.from(3000), deadline, permit.v, permit.r, permit.s))
  //     .to.changeTokenBalances(wVICToken, [sender, recipientAddress, owner], [-3000, 3000, 0]);
  // })
});

// async function createPermit(token: Coin98VRC25, owner: Signer, spenderAddress: string, amount: BigNumber, deadline: BigNumber): Promise<ECDSASignature> {
//   const ownerAddress = await owner.getAddress();
//   const nonce = await token.nonces(ownerAddress);
//   const chainId = await hhe.ethers.provider.send('eth_chainId', []);

//   const domain: EIP712Domain = {
//     name: 'Coin98VRC25',
//     version: '1',
//     chainId: chainId,
//     verifyingContract: token.address,
//   };
//   const types: EIP712TypeDefinition = {
//     Permit: [
//       { name: 'owner', type: 'address' },
//       { name: 'spender', type: 'address' },
//       { name: 'value', type: 'uint256' },
//       { name: 'nonce', type: 'uint256' },
//       { name: 'deadline', type: 'uint256' },
//     ],
//   };
//   const value = {
//     owner: ownerAddress,
//     spender: spenderAddress,
//     value: amount,
//     nonce,
//     deadline,
//   };
//   const signer = await hhe.ethers.getSigner(ownerAddress);
//   const signature = await signer._signTypedData(domain, types, value);
//   const ecdsaSignature: ECDSASignature = {
//     r: '0x' + signature.substring(2, 66),
//     s: '0x' + signature.substring(66, 130),
//     v: parseInt(signature.substring(130, 132), 16),
//   }
//   return ecdsaSignature
// }
