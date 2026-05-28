const BASE_URL = process.env.NEXT_PUBLIC_DOTNET_API_URL;

export const CONFIG_API={
    AUTH:{
        LOGIN: `${BASE_URL}/Auth/Login`,
        REGISTER: `${BASE_URL}/Auth/CreateAccount`
    }
}