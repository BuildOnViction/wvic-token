// Import the necessary dependencies
import hhe from 'hardhat';
import { Signer, BigNumber } from 'ethers';
import { expect } from 'chai';
import { SampleVRC25 } from '../typechain-types';
import { ECDSASignature, EIP712Domain, EIP712TypeDefinition } from './EIP712';
import { time } from '@nomicfoundation/hardhat-network-helpers';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('SampleVRC25 token', async function() {
  let owner: Signer;
  let ownerAddress: string;
  let sender: Signer;
  let senderAddress: string;
  let recipient: Signer;
  let recipientAddress: string;
  let c98Token: SampleVRC25;
  let minFee = hhe.ethers.utils.parseEther('1');
  let snapshot: any;

  before(async function() {
    [owner, sender, recipient] = await hhe.ethers.getSigners();
    ownerAddress = await owner.getAddress();
    senderAddress = await sender.getAddress();
    recipientAddress = await recipient.getAddress();
    const tokenFactory = await hhe.ethers.getContractFactory('SampleVRC25');
    c98Token = await tokenFactory.connect(owner).deploy();
    await c98Token.deployed();
  });

  beforeEach(async function() {
    snapshot = await hhe.ethers.provider.send('evm_snapshot', []);
  });

  afterEach(async function() {
    await hhe.ethers.provider.send('evm_revert', [snapshot]);
  });

  it('cannot set fee without ownership', async function() {
    await expect(c98Token.connect(recipient).setFee(minFee))
      .to.be.revertedWith('VRC25: caller is not the owner');
  });

  it('check ownership', async function() {
    expect(await c98Token.owner()).to.equal(ownerAddress);
  });

  it('should transfer ownership', async function() {
    await c98Token.transferOwnership(recipientAddress);
    expect(await c98Token.owner()).to.equal(ownerAddress);
    await c98Token.connect(recipient).acceptOwnership();
    expect(await c98Token.owner()).to.equal(recipientAddress);
  });

  it('cannot transfer ownership without ownership', async function() {
    await expect(c98Token.connect(recipient).transferOwnership(recipientAddress))
      .to.be.revertedWith('VRC25: caller is not the owner');
  });

  it('should mint tokens', async function() {
    const amount = hhe.ethers.utils.parseEther('1000');
    const balanceBefore = await c98Token.balanceOf(recipientAddress);
    await c98Token.connect(owner).mint(recipientAddress, amount);
    const balanceAfter = await c98Token.balanceOf(recipientAddress);
    expect(balanceAfter).to.equal(balanceBefore.add(amount));
  });

  it('cannot mint without ownership', async function() {
    await expect(c98Token.connect(recipient).mint(ownerAddress, hhe.ethers.utils.parseEther('1')))
      .to.be.revertedWith('VRC25: caller is not the owner');
  });

  it('should burn tokens without fee', async function() {
    await c98Token.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
    const amount = hhe.ethers.utils.parseEther('100');
    await c98Token.setFee(0);
    const balanceBefore = await c98Token.balanceOf(senderAddress);
    await c98Token.connect(sender).burn(amount);
    const balanceAfter = await c98Token.balanceOf(senderAddress);
    expect(balanceAfter).to.equal(balanceBefore.sub(amount));
  });

  it('cannot burn exceeds balance', async function() {
    await c98Token.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
    const amount = hhe.ethers.utils.parseEther('1001');
    await expect(c98Token.connect(owner).burn(amount))
      .to.be.revertedWith('VRC25: insuffient balance');
  });

  it('should transfer tokens', async function() {
    await c98Token.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
    const initialSenderBalance = hhe.ethers.utils.parseEther('1000');
    const transferAmount = hhe.ethers.utils.parseEther('500');
    const fee = await c98Token.estimateFee(transferAmount);
    const initialRecipientBalance = hhe.ethers.BigNumber.from(0);
    const ownerBalance = await c98Token.balanceOf(senderAddress);
    const recipientBalance = await c98Token.balanceOf(recipientAddress);
    expect(ownerBalance).to.equal(initialSenderBalance);
    expect(recipientBalance).to.equal(initialRecipientBalance);
    await c98Token.connect(sender).transfer(recipientAddress, transferAmount);
    expect(await c98Token.balanceOf(senderAddress)).to.equal(initialSenderBalance.sub(transferAmount.add(fee)));
    expect(await c98Token.balanceOf(recipientAddress)).to.equal(initialRecipientBalance.add(transferAmount));
  });

  it('cannot transfer exceeds balance', async function() {
    await c98Token.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
    const amount = hhe.ethers.utils.parseEther('1001');
    await expect(c98Token.connect(sender).transfer(recipientAddress, amount))
      .to.be.revertedWith('VRC25: insuffient balance');
  });

  it('cannot transfer to the zero address', async function() {
    await c98Token.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
    const transferAmount = hhe.ethers.utils.parseEther('500');
    await expect(c98Token.connect(sender).transfer(ZERO_ADDRESS, transferAmount))
      .to.be.revertedWith('VRC25: transfer to the zero address');
  });

  it('should approve tokens', async function() {
    await c98Token.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
    const beforeAllowance = await c98Token.allowance(senderAddress, recipientAddress);
    const amount = hhe.ethers.utils.parseEther('1000');
    await c98Token.connect(owner).setFee(minFee);
    await expect(await c98Token.connect(sender).approve(recipientAddress, amount))
      .changeTokenBalance(c98Token, owner, minFee);
    const afterAllowance = await c98Token.allowance(senderAddress, recipientAddress);
    expect(afterAllowance).to.equal(beforeAllowance.add(amount));
  });

  it('cannot approve to the zero address', async function() {
    await c98Token.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
    await expect(c98Token.connect(owner).approve(ZERO_ADDRESS, '1'))
      .to.be.revertedWith('VRC25: approve to the zero address');
  });

  it('should transferFrom successful', async function() {
    await c98Token.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
    const balanceBefore = await c98Token.balanceOf(recipientAddress);
    const amount = hhe.ethers.utils.parseEther('100');
    await c98Token.connect(sender).approve(recipientAddress, hhe.ethers.utils.parseEther('200'));
    expect(await c98Token.allowance(senderAddress, recipientAddress)).to.equal(hhe.ethers.utils.parseEther('200'));
    await c98Token.connect(recipient).transferFrom(senderAddress, recipientAddress, amount);
    const fee = await c98Token.estimateFee(amount);
    expect(await c98Token.allowance(senderAddress, recipientAddress)).to.equal(hhe.ethers.utils.parseEther('200').sub(amount).sub(fee));
    const balanceAfter = await c98Token.balanceOf(recipientAddress);
    expect(balanceAfter).to.equal(balanceBefore.add(amount));
  });

  it('should permit tokens', async function() {
    await c98Token.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
    const beforeAllowance = await c98Token.allowance(senderAddress, recipientAddress);
    const nonceBefore = await c98Token.nonces(senderAddress);
    const amount = hhe.ethers.utils.parseEther('1000');
    const deadline =  BigNumber.from(Math.floor(new Date().getTime() / 1000) + 3600);
    const permit = await createPermit(c98Token, sender, recipientAddress, amount, deadline);
    await c98Token.connect(owner).setFee(minFee);
    await expect(c98Token.connect(sender).permit(senderAddress, recipientAddress, amount, deadline, permit.v, permit.r, permit.s))
      .changeTokenBalance(c98Token, owner, minFee);
    const afterAllowance = await c98Token.allowance(senderAddress, recipientAddress);
    expect(afterAllowance).to.equal(beforeAllowance.add(amount));
    const nonceAfter = await c98Token.nonces(senderAddress);
    expect(nonceAfter).to.greaterThan(nonceBefore);
  });

  it('cannot permit to the zero address', async function() {
    await c98Token.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
    const amount = hhe.ethers.utils.parseEther('1000');
    const deadline =  BigNumber.from(Math.floor(new Date().getTime() / 1000) + 3600);
    const permit = await createPermit(c98Token, sender, ZERO_ADDRESS, amount, deadline);
    await expect(c98Token.connect(sender).permit(senderAddress, ZERO_ADDRESS, amount, deadline, permit.v, permit.r, permit.s))
      .to.be.revertedWith('VRC25: approve to the zero address');
  });

  it('cannot permit to the wrong address', async function() {
    await c98Token.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
    const amount = hhe.ethers.utils.parseEther('1000');
    const deadline =  BigNumber.from(Math.floor(new Date().getTime() / 1000) + 3600);
    const permit = await createPermit(c98Token, sender, recipientAddress, amount, deadline);
    await expect(c98Token.connect(sender).permit(senderAddress, ownerAddress, amount, deadline, permit.v, permit.r, permit.s))
      .to.be.revertedWith('VRC25: Invalid permit');
  });

  it('cannot permit with wrong amount', async function() {
    await c98Token.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
    const deadline =  BigNumber.from(Math.floor(new Date().getTime() / 1000) + 3600);
    const permit = await createPermit(c98Token, sender, recipientAddress, hhe.ethers.utils.parseEther('1000'), deadline);
    await expect(c98Token.connect(sender).permit(senderAddress, ownerAddress, hhe.ethers.utils.parseEther('1001'), deadline, permit.v, permit.r, permit.s))
      .to.be.revertedWith('VRC25: Invalid permit');
  });

  it('cannot permit expired permit', async function() {
    await c98Token.connect(owner).mint(senderAddress, hhe.ethers.utils.parseEther('1000'));
    const amount = hhe.ethers.utils.parseEther('1000');
    const deadline =  BigNumber.from(Math.floor(new Date().getTime() / 1000) + 3600);
    const permit = await createPermit(c98Token, sender, recipientAddress, amount, deadline);
    await time.increase(3700);
    await expect(c98Token.connect(sender).permit(senderAddress, ownerAddress, amount, deadline, permit.v, permit.r, permit.s))
      .to.be.revertedWith('VRC25: Permit expired');
  });

  it('should not take fee if caller of SampleVRC25 is contract', async function() {
    const testTransferHelperFactory = await hhe.ethers.getContractFactory('TestTransferHelper');
    const testTransferHelper = await testTransferHelperFactory.deploy(c98Token.address);

    await c98Token.setFee(1111); // 10 wei
    await c98Token.connect(owner).mint(testTransferHelper.address, 10000000);
    await c98Token.connect(owner).mint(senderAddress, 100000000000);

    // zero fee if sender is contract for normal flow
    await expect(testTransferHelper.connect(sender).sendToken(recipientAddress, 1000)).to.changeTokenBalances(c98Token, [testTransferHelper, recipientAddress, owner], [-1000, 1000, 0]);
    await expect(testTransferHelper.connect(sender).burnToken(1000)).to.changeTokenBalances(c98Token, [testTransferHelper, owner], [-1000, 0]);

    // zero fee if sender is contract for approval flow
    await expect(testTransferHelper.connect(sender).approveToken(recipientAddress, 1200)).to.changeTokenBalances(c98Token, [sender, testTransferHelper, owner], [0, 0, 0]);

    await expect(c98Token.connect(sender).approve(testTransferHelper.address, 1000)).to.changeTokenBalances(c98Token, [owner], [1111]);
    await expect(testTransferHelper.connect(sender).sendTokenWithTransferFrom(senderAddress, recipientAddress, 1000)).to.changeTokenBalances(c98Token, [sender, recipientAddress, owner], [-1000, 1000, 0]);

    // zero fee if sender is contract for permit flow
    const deadline =  BigNumber.from(Math.floor(new Date().getTime() / 1000) + 3600);
    const permit = await createPermit(c98Token, sender, testTransferHelper.address, BigNumber.from(3000), deadline);
    await expect(testTransferHelper.connect(sender).sendTokenWithTransferFromPermit(senderAddress, recipientAddress, BigNumber.from(3000), deadline, permit.v, permit.r, permit.s))
      .to.changeTokenBalances(c98Token, [sender, recipientAddress, owner], [-3000, 3000, 0]);
  });
});

async function createPermit(token: SampleVRC25, owner: Signer, spenderAddress: string, amount: BigNumber, deadline: BigNumber): Promise<ECDSASignature> {
  const ownerAddress = await owner.getAddress();
  const nonce = await token.nonces(ownerAddress);
  const chainId = await hhe.ethers.provider.send('eth_chainId', []);

  const domain: EIP712Domain = {
    name: 'VRC25',
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
  }
  return ecdsaSignature;
}
