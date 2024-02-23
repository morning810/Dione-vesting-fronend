import axios from "axios";
import { BACKEND_URL } from "../config";

export const saveNewClaim = (data) => {
    axios.post(`${BACKEND_URL}/claim/create`, {
        ...data
    }).then(response => {
        console.log(response);
    }).catch(err => {
        console.error(err);
    })
}

export const readClaimesByDateRage = async (vestingId, startTime, endTime) => {
    try {
        if (!vestingId || vestingId < 0) return [];
        const response = await axios.post(`${BACKEND_URL}/claim/findByDateRange`, {
            vestingId, startTime, endTime
        });
        const claims = response.data.data;
        return claims;
    } catch (err) {
        console.error(err);
        return [];
    }
}

export const readClaimesByPage = async (pageIndex, pageSize, vestingId) => {
    try {
        if (!vestingId || vestingId < 0) return [];
        const response = await axios.post(`${BACKEND_URL}/claim/findByPage`, {
            pageIndex, pageSize, vestingId
        });
        const claims = response.data;
        return claims;
    } catch (err) {
        console.error(err);
        return [];
    }
}

export const saveNewVesting = (data) => {
    axios.post(`${BACKEND_URL}/vesting/create`, {
        ...data
    }).then(response => {
        console.log(response);
    }).catch(err => {
        console.error(err);
    })
}

export const getVestingByWalletAndToken = async (
    pageIndex, pageSize, filterFlag, searchingWallet, searchingToken
) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/vesting/findByWalletAndToken`, {
            pageIndex, pageSize, filterFlag, searchingWallet, searchingToken
        });
        return response?.data;
    } catch (err) {
        console.error(err);
        return {
            data: [],
            totalCount: 0
        }

    }
}

export const getSingleVestingByAddress = async (vestingAddress) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/vesting/findSingleByContract`, {
            contract: vestingAddress
        });
        return response?.data?.data;
    } catch (err) {
        console.error(err);
        return null;

    }
}
