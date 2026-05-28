// ** React Imports
import { createContext, useEffect, useState, ReactNode } from 'react'

// ** Next Import
import { useRouter } from 'next/router'

// ** Axios
import axios from 'axios'

// ** Config
import authConfig from 'src/configs/auth'

// ** Types
import { AuthValuesType, LoginParams, ErrCallbackType, UserDataType } from './types'
import { loginAuth } from 'src/services/auth'

// ** JWT Decode
import { jwtDecode } from 'jwt-decode';

// ** Defaults
const defaultProvider: AuthValuesType = {
  user: null,
  loading: true,
  setUser: () => null,
  setLoading: () => Boolean,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve()
}

const AuthContext = createContext(defaultProvider)

type Props = {
  children: ReactNode
}

const AuthProvider = ({ children }: Props) => {
  // ** States
  const [user, setUser] = useState<UserDataType | null>(defaultProvider.user)
  const [loading, setLoading] = useState<boolean>(defaultProvider.loading)

  // ** Hooks
  const router = useRouter()

  // useEffect(() => {
  //   const initAuth = async (): Promise<void> => {
  //     const storedToken = window.localStorage.getItem(authConfig.storageTokenKeyName)!
  //     if (storedToken) {
  //       setLoading(true)
  //       await axios
  //         .get(authConfig.meEndpoint, {
  //           headers: {
  //             Authorization: storedToken
  //           }
  //         })
  //         .then(async response => {
  //           setLoading(false)
  //           setUser({ ...response.data.userData })
  //         })
  //         .catch(() => {
  //           localStorage.removeItem('userData')
  //           localStorage.removeItem('refreshToken')
  //           localStorage.removeItem('accessToken')
  //           setUser(null)
  //           setLoading(false)
  //           if (authConfig.onTokenExpiration === 'logout' && !router.pathname.includes('login')) {
  //             router.replace('/login')
  //           }
  //         })
  //     } else {
  //       setLoading(false)
  //     }
  //   }

  //   initAuth()
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [])

  const handleLogin = async (params: LoginParams, errorCallback?: ErrCallbackType) => {
    try {
      // 1. Gọi API
      const response = await loginAuth({ email: params.email, password: params.password });


      const token = response?.content;
      console.log(token);

      if (token) {
        // 2. Lưu Token
        if (params.rememberMe) {
          window.localStorage.setItem(authConfig.storageTokenKeyName, response.content.accessToken);
        }

        const decodedUser: any = jwtDecode(token);
        // 3. Set User vào State của App
        setUser(decodedUser);

        // 4. Lưu User vào LocalStorage để khi F5 không bị mất đăng nhập
        if (params.rememberMe) {
          window.localStorage.setItem('userData', JSON.stringify(decodedUser));
        }

        // 5. Chuyển trang
        // const returnUrl = router.query.returnUrl;
        // const redirectURL = returnUrl && returnUrl !== '/' ? returnUrl : '/';
        // router.replace(redirectURL as string);

        return { success: true, data: response };
      } else {
        throw new Error("Không tìm thấy Access Token");
      }

    } catch (err: any) {
      const errorData = err.response?.data
      if (errorCallback) errorCallback(err);
      return {
        success: false,
        message: errorData?.Message || errorData?.message || 'Đăng nhập thất bại',
        data: errorData
      }
    }


  }

  const handleLogout = () => {
    setUser(null)
    window.localStorage.removeItem('userData')
    window.localStorage.removeItem(authConfig.storageTokenKeyName)
    router.push('/login')
  }

  const values = {
    user,
    loading,
    setUser,
    setLoading,
    login: handleLogin,
    logout: handleLogout
  }

  return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>
}

export { AuthContext, AuthProvider }
