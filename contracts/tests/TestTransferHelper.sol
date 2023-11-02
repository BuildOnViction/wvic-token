// SPDX-License-Identifier: MIT
pragma solidity >=0.6.2;

import "./SampleVRC25.sol";

contract TestTransferHelper {
    address private _token;

    constructor(address token) public {
        _token = token;
    }

    function sendToken(address recipient, uint256 amount) external {
        SampleVRC25(_token).transfer(recipient, amount);
    }

    function sendTokenWithTransferFrom(address from, address recipient, uint256 amount) external {
        SampleVRC25(_token).transferFrom(from, recipient, amount);
    }

    function sendTokenWithTransferFromPermit(address from, address recipient, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
        SampleVRC25(_token).permit(from, address(this), amount, deadline, v, r, s);
        SampleVRC25(_token).transferFrom(from, recipient, amount);
    }

    function approveToken(address delegate, uint256 amount) external {
        SampleVRC25(_token).approve(delegate, amount);
    }

    function burnToken(uint256 amount) external {
        SampleVRC25(_token).burn(amount);
    }
}
