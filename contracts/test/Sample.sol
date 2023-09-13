// SPDX-License-Identifier: MIT
pragma solidity >=0.6.2;

import "../interfaces/ITRC25.sol";
import "../interfaces/ITRC25Permit.sol";

contract TestTransferHelper {
    address private _token1;
    address private _token2;

    constructor(address token1, address token2) public {
        _token1 = token1;
        _token2 = token2;
    }


    function sendTokenWithTransferFromPermit(address from, address recipient,uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
        ITRC25Permit(_token2).permit(from, address(this), amount, deadline, v, r, s);
        ITRC25(_token2).transferFrom(from, recipient, amount);
    }

    function approveToken(address delegate, uint256 amount) external {
        ITRC25(_token1).approve(delegate, amount);
    }

    function sendTomo(uint256 amount) external payable {
        (bool ok,) = _token2.call{value: amount}("");
        require(ok, "Not OK");
    }

}