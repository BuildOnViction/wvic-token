import hhe from 'hardhat';
import { Signer, BigNumber } from 'ethers';
import { expect } from "chai";
import { createPermit } from "../util/signMessage"
import { TestTransferHelper } from '../typechain-types/test/Sample.sol';

describe("WTOMO",  () => {
    let wtomo :any;  
    let balance_user1 : any;
    let balance_user2 : any;
    let minFee = hhe.ethers.utils.parseEther('1');
    let deposit_amount = hhe.ethers.utils.parseEther('10');
    let amount_transfer =  hhe.ethers.utils.parseEther('2');
    let owner: Signer;
    let user1: Signer;
    let user2: Signer;

    let ownerAddress: string;
    let user1Address: string;
    let user2Address: string;
    let fee: any;

    let balance_before: any;
    let balance_after: any;

    before("Create contract", async () => {
        [owner, user1, user2] = await hhe.ethers.getSigners();

        ownerAddress = await owner.getAddress();
        user1Address = await user1.getAddress();
        user2Address = await user2.getAddress();

        const factory = await hhe.ethers.getContractFactory("WTOMO");
        balance_user1 = await hhe.ethers.provider.getBalance(user1Address);
        console.log("Balance of user1: ", balance_user1);
        
        balance_user2 = await hhe.ethers.provider.getBalance(user2Address);
        console.log("Balance of user2: ", balance_user2);
        wtomo = await factory.connect(owner).deploy({ gasLimit: 4700000 });
        const wtomo_address = wtomo.address;
        console.log("Wrap Tomo deployed to:", wtomo_address);
    });
    
    it("Set fee without owner", async () => {
    await expect(wtomo.connect(user1).setFee(minFee))
        .to.be.revertedWith('TRC25: caller is not the owner');

    });

    it("Set fee with owner", async () => {
    expect(wtomo.connect(owner).setFee(minFee));
    fee = await wtomo.minFee();
    console.log("Mint fee: ", fee);
    });

    it("Deposit Tomo", async () => {
        balance_before = await wtomo.balanceOf(user1Address);
        await wtomo.connect(user1).deposit({ gasLimit: 4700000,value: deposit_amount });
        balance_after = await wtomo.balanceOf(user1Address);

        //Check balance WTOMO after and before Wrap Tomo native
        expect(balance_before).to.equal(balance_after.sub(deposit_amount));

    });

    it("Withdraw Tomo", async () => {
        balance_before = await wtomo.balanceOf(user1Address);
        await wtomo.connect(user1).withdraw(deposit_amount,{ gasLimit: 4700000});
        const balance_after = await wtomo.balanceOf(user1Address);

         //Check balance WTOMO after and before unWrap Tomo native
        expect(balance_before).to.equal(balance_after.add(deposit_amount));

    });

    it("Transfer WTOMO", async () => {
        await wtomo.connect(user1).deposit({ gasLimit: 4700000,value: deposit_amount });
        balance_before = await wtomo.balanceOf(user1Address);
       
        await wtomo.connect(user1).transfer(user2Address,amount_transfer,{ gasLimit: 4700000});
        balance_after = await wtomo.balanceOf(user1Address);
        
        const estimate_fee = await wtomo.estimateFee(amount_transfer);
        //Check balance of user1 after and before transfer
        expect(balance_before).to.equal(balance_after.add(amount_transfer).add(estimate_fee));
    });

    it("Approve WTOMO", async () => {
        balance_before = await wtomo.balanceOf(user1Address);
        const balance_owner_before = await wtomo.balanceOf(ownerAddress);
        
        await wtomo.connect(user1).approve(user2Address,amount_transfer,{ gasLimit: 4700000});
        balance_after = await wtomo.balanceOf(user1Address);
        
        const allowance_Wtomo = await wtomo.allowance(user1Address, user2Address);
        expect(allowance_Wtomo).to.equal(amount_transfer);

        const estimate_fee = await wtomo.estimateFee(amount_transfer);
        //Check balance user before and after approve 
        expect(balance_before).to.equal(balance_after.add(estimate_fee));

        //Check balance of owner before and after approve 
        const balance_owner_after = await wtomo.balanceOf(ownerAddress);
        expect(balance_owner_before).to.equal(balance_owner_after.sub(estimate_fee));
    });

})

describe("WTOMO Permit", async () => {
    let wtomop :any;  
    let balance_user1 : any;
    let balance_user2 : any;
    let minFee = hhe.ethers.utils.parseEther('1');
    let deposit_amount = hhe.ethers.utils.parseEther('10');
    let amount_transfer =  hhe.ethers.utils.parseEther('2');
    let owner: Signer;
    let user1: Signer;
    let user2: Signer;

    let ownerAddress: string;
    let user1Address: string;
    let user2Address: string;
    let fee: any;

    let balance_before: any;
    let balance_after: any;

    before("Create contract with permit", async () => {
        [owner, user1, user2] = await hhe.ethers.getSigners();

        ownerAddress = await owner.getAddress();
        user1Address = await user1.getAddress();
        user2Address = await user2.getAddress();

        const factory = await hhe.ethers.getContractFactory("WTOMOPermit");
        balance_user1 = await hhe.ethers.provider.getBalance(user1Address);
        console.log("Balance of user1: ", balance_user1);
        
        balance_user2 = await hhe.ethers.provider.getBalance(user2Address);
        console.log("Balance of user2: ", balance_user2);
        wtomop = await factory.connect(owner).deploy({ gasLimit: 4700000 });
        const wtomo_address = wtomop.address;
        console.log("Wrap Tomo deployed to:", wtomo_address);
    });

    it("Set fee without owner", async () => {
        await expect(wtomop.connect(user1).setFee(minFee))
            .to.be.revertedWith('TRC25: caller is not the owner');
    
    });

    it("Set fee with owner", async () => {
        expect(wtomop.connect(owner).setFee(minFee));
        fee = await wtomop.minFee();
        console.log("Mint fee: ", fee);
    });

    it("Deposit Tomo", async () => {
        balance_before = await wtomop.balanceOf(user1Address);

        await wtomop.connect(user1).deposit({ gasLimit: 4700000,value: deposit_amount });
        balance_after = await wtomop.balanceOf(user1Address);

        //Check balance WTOMOP after and before Wrap Tomo native
        expect(balance_before).to.equal(balance_after.sub(deposit_amount));

    });

    it("Withdraw Tomo", async () => {
        balance_before = await wtomop.balanceOf(user1Address);
        await wtomop.connect(user1).withdraw(deposit_amount,{ gasLimit: 4700000});
        const balance_after = await wtomop.balanceOf(user1Address);

        //Check balance WTOMOP after and before unWrap Tomo native
        expect(balance_before).to.equal(balance_after.add(deposit_amount));

    });

    it("Transfer WTOMOP", async () => {
        await wtomop.connect(user1).deposit({ gasLimit: 4700000,value: deposit_amount });
        balance_before = await wtomop.balanceOf(user1Address);
       
        await wtomop.connect(user1).transfer(user2Address,amount_transfer,{ gasLimit: 4700000});
        balance_after = await wtomop.balanceOf(user1Address);
        const estimate_fee = await wtomop.estimateFee(amount_transfer);
        
        const balance_owner = await wtomop.balanceOf(ownerAddress);

        //Check balance of user before and after transfer
        expect(balance_before).to.equal(balance_after.add(amount_transfer).add(estimate_fee));

    });

    it("Approve WTOMO with permit", async () => {
        balance_before = await wtomop.balanceOf(user1Address);
        const balance_owner_before = await wtomop.balanceOf(ownerAddress);
        const deadline =  BigNumber.from(Math.floor(new Date().getTime() / 1000) + 3600);
        const permit = await createPermit(wtomop, user1, user2Address, amount_transfer, deadline);
        
        await wtomop.connect(user1).permit(user1Address, user2Address, amount_transfer, deadline, permit.v, permit.r, permit.s);
        
        balance_after = await wtomop.balanceOf(user1Address);
        const allowance_Wtomo = await wtomop.allowance(user1Address, user2Address);
        expect(allowance_Wtomo).to.equal(amount_transfer);
        const estimate_fee = await wtomop.estimateFee(amount_transfer);

        //Check balance of user before and after approve
        expect(balance_before).to.equal(balance_after.add(estimate_fee));
        const balance_owner_after = await wtomop.balanceOf(ownerAddress);

        //Check balance of owner before and after approve
        expect(balance_owner_before).to.equal(balance_owner_after.sub(estimate_fee));
    });

    describe("should not take fee if caller of Wrap tomo is contract", async function() {
        let wtomo :any;  
        let wtomop :any;
        let sample: TestTransferHelper;
        let amount_transfer =  hhe.ethers.utils.parseEther('2');

        let owner: Signer;
        let user1: Signer;
        let user2: Signer;
        let deposit_amount = hhe.ethers.utils.parseEther('10');

        before(async function() {
            [owner, user1, user2] = await hhe.ethers.getSigners();
            ownerAddress = await owner.getAddress();
            user1Address = await user1.getAddress();
            user2Address = await user2.getAddress();

            const tokenFactory1 = await hhe.ethers.getContractFactory('WTOMO');
            wtomo =  await tokenFactory1.connect(owner).deploy();
            await wtomo.deployed();

            const tokenFactory2= await hhe.ethers.getContractFactory('WTOMOPermit');
            wtomop =  await tokenFactory2.connect(owner).deploy();
            await wtomop.deployed();


            const tokenFactory3= await hhe.ethers.getContractFactory('TestTransferHelper');
            sample =  await tokenFactory3.connect(owner).deploy(wtomo.address, wtomop.address,{ gasLimit: 4700000 });
            await sample.deployed();
        });

        it("test permit", async function() {
            await wtomop.setFee(1000);
            await wtomop.connect(user1).deposit({ gasLimit: 4700000,value: deposit_amount });
            await wtomop.connect(user1).transfer(sample.address,amount_transfer,{ gasLimit: 4700000});

            const balanceContract_before = await wtomop.balanceOf(sample.address);
            console.log(balanceContract_before);

            const deadline =  BigNumber.from(Math.floor(new Date().getTime() / 1000) + 3600);
            const permit = await createPermit(wtomop, user1, sample.address, amount_transfer, deadline);
            await sample.connect(user1).sendTokenWithTransferFromPermit(user1Address, user2Address,amount_transfer, deadline, permit.v, permit.r, permit.s);
            const balanceContract_after = await wtomop.balanceOf(sample.address);

            //Check balance of contract before and after calliing function
            expect(balanceContract_before).to.equal(balanceContract_after);

        });

        it("Test fallback function", async function () {

            const balanceContract_before = await wtomop.balanceOf(sample.address);
            console.log(balanceContract_before)
            await sample.sendTomo(amount_transfer,{ gasLimit: 4700000, value: amount_transfer});
            const balanceContract_after = await wtomop.balanceOf(sample.address);

            //Check balance of contract before and after call fallback
            expect(balanceContract_before).to.equal(balanceContract_after.sub(amount_transfer));            


        });



    })

})

