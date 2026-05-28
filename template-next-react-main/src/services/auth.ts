import axios from "axios"
import { log } from "console"
import { CONFIG_API } from "src/configs/api"
import { TLoginAuth, TRegisterAuth } from "src/types/auth"

export const loginAuth = async (data: TLoginAuth) => {
    try {
        const res = await axios.post(CONFIG_API.AUTH.LOGIN, data)
        return res.data
    } catch (error) {
        return Promise.reject(error);
    }
}

export const registerAuth = async (payload :any) => {
    try{
        const res = await axios.post(CONFIG_API.AUTH.REGISTER, payload)
        return res.data
    }catch(error){
        return Promise.reject(error)
    }
}