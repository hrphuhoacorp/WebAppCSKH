export type TLoginAuth={
    email: string;
    password: string;
}

export type TRegisterAuth={
    fullname: string;
    email: string;
    password: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    homeBranchId: string;
    address: {
        province: string;
        district: string;
        ward: string;
        detail: string;
    }
}