import { UserProfile } from "@/features/user/schemas/user-profile";
import { createContext } from "react";

type AuthContextType = {
    profile: UserProfile | null;
    setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
};

const AuthContext = createContext<AuthContextType | null>(null);