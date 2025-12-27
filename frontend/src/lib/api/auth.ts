import { api } from "../api"

export interface RegisterDto {
  email: string
  username: string
  displayName: string
  password: string
}

export interface LoginDto {
  emailOrUsername: string
  password: string
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface UserDto {
  id: string
  email: string
  username: string
  displayName: string
  status: number
  customStatus?: string
  avatarUrl?: string
  createdAt: string
}

export interface UpdateStatusDto {
  status: number
  customStatus?: string
}

export const authApi = {
  register: async (data: RegisterDto): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>("/auth/register", data)
    return response.data
  },

  login: async (data: LoginDto): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>("/auth/login", data)
    return response.data
  },

  refresh: async (refreshToken: string): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>("/auth/refresh", {
      refreshToken,
    })
    return response.data
  },

  getCurrentUser: async (): Promise<UserDto> => {
    const response = await api.get<UserDto>("/auth/me")
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post("/auth/logout")
  },

  updateStatus: async (data: UpdateStatusDto): Promise<UserDto> => {
    const response = await api.patch<UserDto>("/auth/me/status", data)
    return response.data
  },
}


