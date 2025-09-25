const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("TraceToken", function () {
    let traceToken;
    let owner, user1, user2, user3;
    let rewardsDistributor;

    beforeEach(async function () {
        [owner, user1, user2, user3] = await ethers.getSigners();
        
        const TraceToken = await ethers.getContractFactory("TraceToken");
        traceToken = await TraceToken.deploy();
        await traceToken.deployed();
        
        // Deploy a mock rewards distributor
        const RewardsDistributor = await ethers.getContractFactory("RewardsDistributor");
        const mockPriceFeed = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"; // Mock price feed
        rewardsDistributor = await RewardsDistributor.deploy(traceToken.address, mockPriceFeed);
        await rewardsDistributor.deployed();
        
        // Authorize rewards distributor
        await traceToken.setDistributor(rewardsDistributor.address, true);
    });

    describe("Deployment", function () {
        it("Should set the correct name and symbol", async function () {
            expect(await traceToken.name()).to.equal("TraceChain Token");
            expect(await traceToken.symbol()).to.equal("TRACE");
        });

        it("Should set the correct cap", async function () {
            const cap = await traceToken.cap();
            expect(cap).to.equal(ethers.utils.parseEther("1000000000")); // 1B tokens
        });

        it("Should mint initial supply to owner", async function () {
            const ownerBalance = await traceToken.balanceOf(owner.address);
            const expectedBalance = ethers.utils.parseEther("100000000"); // 100M tokens
            expect(ownerBalance).to.equal(expectedBalance);
        });

        it("Should mint ecosystem fund to contract", async function () {
            const contractBalance = await traceToken.balanceOf(traceToken.address);
            const expectedBalance = ethers.utils.parseEther("200000000"); // 200M tokens
            expect(contractBalance).to.equal(expectedBalance);
        });
    });

    describe("Reward Distribution", function () {
        it("Should distribute rewards correctly", async function () {
            const rewardAmount = ethers.utils.parseEther("100");
            const category = "onboarding";
            
            await traceToken.connect(rewardsDistributor).distributeReward(
                user1.address,
                rewardAmount,
                category
            );
            
            expect(await traceToken.balanceOf(user1.address)).to.equal(rewardAmount);
            expect(await traceToken.getUserRewardBalance(user1.address)).to.equal(rewardAmount);
            expect(await traceToken.getCategoryRewards(user1.address, category)).to.equal(rewardAmount);
        });

        it("Should only allow authorized distributors", async function () {
            const rewardAmount = ethers.utils.parseEther("100");
            const category = "onboarding";
            
            await expect(
                traceToken.connect(user1).distributeReward(
                    user2.address,
                    rewardAmount,
                    category
                )
            ).to.be.revertedWith("Not authorized distributor");
        });

        it("Should not distribute to zero address", async function () {
            const rewardAmount = ethers.utils.parseEther("100");
            const category = "onboarding";
            
            await expect(
                traceToken.connect(rewardsDistributor).distributeReward(
                    ethers.constants.AddressZero,
                    rewardAmount,
                    category
                )
            ).to.be.revertedWith("Invalid recipient address");
        });
    });

    describe("Staking", function () {
        beforeEach(async function () {
            // Transfer some tokens to user1 for staking
            await traceToken.transfer(user1.address, ethers.utils.parseEther("10000"));
        });

        it("Should allow staking tokens", async function () {
            const stakeAmount = ethers.utils.parseEther("1000");
            
            await traceToken.connect(user1).stake(stakeAmount);
            
            const stakingInfo = await traceToken.getStakingInfo(user1.address);
            expect(stakingInfo.stakedAmount).to.equal(stakeAmount);
            expect(stakingInfo.stakingTimestamp).to.be.gt(0);
        });

        it("Should not allow staking below minimum amount", async function () {
            const stakeAmount = ethers.utils.parseEther("500"); // Below 1000 minimum
            
            await expect(
                traceToken.connect(user1).stake(stakeAmount)
            ).to.be.revertedWith("Amount below minimum stake");
        });

        it("Should not allow staking more than balance", async function () {
            const stakeAmount = ethers.utils.parseEther("20000"); // More than user1 has
            
            await expect(
                traceToken.connect(user1).stake(stakeAmount)
            ).to.be.revertedWith("Insufficient balance");
        });

        it("Should allow unstaking after lock period", async function () {
            const stakeAmount = ethers.utils.parseEther("1000");
            
            await traceToken.connect(user1).stake(stakeAmount);
            
            // Fast forward time by 7 days + 1 second
            await time.increase(7 * 24 * 60 * 60 + 1);
            
            await traceToken.connect(user1).unstake(stakeAmount);
            
            const stakingInfo = await traceToken.getStakingInfo(user1.address);
            expect(stakingInfo.stakedAmount).to.equal(0);
        });

        it("Should not allow unstaking before lock period", async function () {
            const stakeAmount = ethers.utils.parseEther("1000");
            
            await traceToken.connect(user1).stake(stakeAmount);
            
            // Try to unstake immediately
            await expect(
                traceToken.connect(user1).unstake(stakeAmount)
            ).to.be.revertedWith("Staking period not completed");
        });

        it("Should calculate staking rewards correctly", async function () {
            const stakeAmount = ethers.utils.parseEther("1000");
            
            await traceToken.connect(user1).stake(stakeAmount);
            
            // Fast forward time by 1 year
            await time.increase(365 * 24 * 60 * 60);
            
            const rewards = await traceToken.calculateStakingRewards(user1.address);
            const expectedRewards = stakeAmount.mul(5).div(100); // 5% APY
            expect(rewards).to.be.closeTo(expectedRewards, ethers.utils.parseEther("1")); // Allow 1 token variance
        });
    });

    describe("Vesting", function () {
        it("Should create vesting schedule", async function () {
            const vestAmount = ethers.utils.parseEther("10000");
            const duration = 365 * 24 * 60 * 60; // 1 year
            
            await traceToken.createVestingSchedule(
                user1.address,
                vestAmount,
                duration,
                false
            );
            
            const vestingSchedule = await traceToken.vestingSchedules(user1.address);
            expect(vestingSchedule.totalAmount).to.equal(vestAmount);
            expect(vestingSchedule.duration).to.equal(duration);
        });

        it("Should release vested tokens over time", async function () {
            const vestAmount = ethers.utils.parseEther("10000");
            const duration = 365 * 24 * 60 * 60; // 1 year
            
            await traceToken.createVestingSchedule(
                user1.address,
                vestAmount,
                duration,
                false
            );
            
            // Fast forward time by 6 months
            await time.increase(182 * 24 * 60 * 60);
            
            const releasableAmount = await traceToken.getReleasableAmount(user1.address);
            const expectedAmount = vestAmount.div(2); // Half should be releasable
            expect(releasableAmount).to.be.closeTo(expectedAmount, ethers.utils.parseEther("1"));
            
            await traceToken.releaseVestedTokens(user1.address);
            
            const userBalance = await traceToken.balanceOf(user1.address);
            expect(userBalance).to.be.closeTo(expectedAmount, ethers.utils.parseEther("1"));
        });
    });

    describe("Pausable", function () {
        it("Should pause and unpause correctly", async function () {
            await traceToken.emergencyPause();
            expect(await traceToken.paused()).to.be.true;
            
            await traceToken.emergencyUnpause();
            expect(await traceToken.paused()).to.be.false;
        });

        it("Should not allow transfers when paused", async function () {
            await traceToken.transfer(user1.address, ethers.utils.parseEther("1000"));
            
            await traceToken.emergencyPause();
            
            await expect(
                traceToken.connect(user1).transfer(user2.address, ethers.utils.parseEther("100"))
            ).to.be.revertedWith("Pausable: paused");
        });
    });

    describe("Access Control", function () {
        it("Should only allow owner to set distributors", async function () {
            await expect(
                traceToken.connect(user1).setDistributor(user2.address, true)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should only allow owner to emergency pause", async function () {
            await expect(
                traceToken.connect(user1).emergencyPause()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Gas Optimization", function () {
        it("Should handle batch operations efficiently", async function () {
            const batchSize = 10;
            const rewardAmount = ethers.utils.parseEther("1");
            
            const startGas = await ethers.provider.getBlockNumber();
            
            for (let i = 0; i < batchSize; i++) {
                await traceToken.connect(rewardsDistributor).distributeReward(
                    user1.address,
                    rewardAmount,
                    "batch_test"
                );
            }
            
            const endGas = await ethers.provider.getBlockNumber();
            const gasUsed = endGas - startGas;
            
            // Should use reasonable amount of gas for batch operations
            expect(gasUsed).to.be.lt(1000);
        });
    });

    describe("Edge Cases", function () {
        it("Should handle zero amount distributions", async function () {
            await expect(
                traceToken.connect(rewardsDistributor).distributeReward(
                    user1.address,
                    0,
                    "test"
                )
            ).to.be.revertedWith("Amount must be positive");
        });

        it("Should handle empty category", async function () {
            await expect(
                traceToken.connect(rewardsDistributor).distributeReward(
                    user1.address,
                    ethers.utils.parseEther("1"),
                    ""
                )
            ).to.be.revertedWith("Category required");
        });

        it("Should handle insufficient treasury balance", async function () {
            const largeAmount = ethers.utils.parseEther("1000000000"); // More than treasury has
            
            await expect(
                traceToken.connect(rewardsDistributor).distributeReward(
                    user1.address,
                    largeAmount,
                    "test"
                )
            ).to.be.revertedWith("Insufficient treasury balance");
        });
    });
});
